from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, File, UploadFile, Response
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import requests
from bson import ObjectId

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

# Password hashing
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

# JWT Token Management
def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=60), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

# Object Storage
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "aic-commercialista"
storage_key = None

def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str) -> tuple:
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# Auth Helper
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Non autenticato")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Tipo di token non valido")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Utente non trovato")
        user["id"] = str(user["_id"])
        del user["_id"]
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token scaduto")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token non valido")

# Create the main app
app = FastAPI(title="Herion - Precision. Control. Confidence.")
api_router = APIRouter(prefix="/api")

# ========================
# MODELS
# ========================

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: str

class PracticeCreate(BaseModel):
    practice_type: str  # vat_registration, vat_closure, tax_declaration
    description: str
    client_name: str
    client_type: str = "private"  # private, freelancer, company
    fiscal_code: Optional[str] = None
    vat_number: Optional[str] = None  # Only required for freelancer/company
    additional_data: Optional[dict] = {}

CLIENT_TYPES = {
    "private": "Privato",
    "freelancer": "Libero Professionista",
    "company": "Azienda"
}

class PracticeUpdate(BaseModel):
    description: Optional[str] = None
    status: Optional[str] = None
    additional_data: Optional[dict] = None

class AgentAction(BaseModel):
    agent_type: str  # analysis, validation, document, communication
    practice_id: str
    input_data: dict

class NotificationCreate(BaseModel):
    title: str
    message: str
    notification_type: str  # info, warning, success, error

# ========================
# AUTH ENDPOINTS
# ========================

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    email = user_data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email già registrata")
    
    user_doc = {
        "email": email,
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "consent_given": True,
        "consent_date": datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response = JSONResponse(content={
        "id": user_id,
        "email": email,
        "name": user_data.name,
        "role": "user"
    })
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    # Log registration
    await log_activity(user_id, "auth", "user_registered", {"email": email})
    
    return response

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    email = user_data.email.lower()
    user = await db.users.find_one({"email": email})
    
    if not user or not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response = JSONResponse(content={
        "id": user_id,
        "email": user["email"],
        "name": user["name"],
        "role": user["role"]
    })
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    await log_activity(user_id, "auth", "user_login", {"email": email})
    
    return response

@api_router.post("/auth/logout")
async def logout(request: Request):
    response = JSONResponse(content={"message": "Logout effettuato"})
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return response

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

# ========================
# PRACTICES ENDPOINTS
# ========================

PRACTICE_TYPES = {
    "vat_registration": "Apertura Partita IVA",
    "vat_closure": "Chiusura Partita IVA",
    "tax_declaration": "Dichiarazione dei Redditi",
    "f24_payment": "Versamento F24",
    "inps_registration": "Iscrizione INPS",
    "other": "Altra Pratica"
}

@api_router.post("/practices")
async def create_practice(practice: PracticeCreate, user: dict = Depends(get_current_user)):
    practice_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "practice_type": practice.practice_type,
        "practice_type_label": PRACTICE_TYPES.get(practice.practice_type, practice.practice_type),
        "description": practice.description,
        "client_name": practice.client_name,
        "client_type": practice.client_type,
        "client_type_label": CLIENT_TYPES.get(practice.client_type, practice.client_type),
        "fiscal_code": practice.fiscal_code,
        "vat_number": practice.vat_number if practice.client_type in ["freelancer", "company"] else None,
        "additional_data": practice.additional_data or {},
        "status": "pending",
        "status_label": "In Attesa",
        "documents": [],
        "agent_logs": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.practices.insert_one(practice_doc)
    
    # Log activity
    await log_activity(user["id"], "practice", "practice_created", {
        "practice_id": practice_doc["id"],
        "practice_type": practice.practice_type
    })
    
    # Create notification
    await create_notification(user["id"], "Nuova Pratica Creata", 
        f"La pratica '{PRACTICE_TYPES.get(practice.practice_type, practice.practice_type)}' per {practice.client_name} è stata creata.", "success")
    
    # Return without _id
    practice_doc.pop("_id", None)
    return practice_doc

@api_router.get("/practices")
async def get_practices(user: dict = Depends(get_current_user)):
    practices = await db.practices.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return practices

@api_router.get("/practices/{practice_id}")
async def get_practice(practice_id: str, user: dict = Depends(get_current_user)):
    practice = await db.practices.find_one({"id": practice_id, "user_id": user["id"]}, {"_id": 0})
    if not practice:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    return practice

@api_router.put("/practices/{practice_id}")
async def update_practice(practice_id: str, update: PracticeUpdate, user: dict = Depends(get_current_user)):
    practice = await db.practices.find_one({"id": practice_id, "user_id": user["id"]})
    if not practice:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if update.description:
        update_data["description"] = update.description
    if update.status:
        update_data["status"] = update.status
        status_labels = {"pending": "In Attesa", "processing": "In Elaborazione", "completed": "Completata", "rejected": "Rifiutata"}
        update_data["status_label"] = status_labels.get(update.status, update.status)
    if update.additional_data:
        update_data["additional_data"] = {**practice.get("additional_data", {}), **update.additional_data}
    
    await db.practices.update_one({"id": practice_id}, {"$set": update_data})
    
    await log_activity(user["id"], "practice", "practice_updated", {"practice_id": practice_id, "changes": list(update_data.keys())})
    
    updated = await db.practices.find_one({"id": practice_id}, {"_id": 0})
    return updated

@api_router.delete("/practices/{practice_id}")
async def delete_practice(practice_id: str, user: dict = Depends(get_current_user)):
    result = await db.practices.delete_one({"id": practice_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    await log_activity(user["id"], "practice", "practice_deleted", {"practice_id": practice_id})
    return {"message": "Pratica eliminata"}

# ========================
# DOCUMENTS ENDPOINTS
# ========================

MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp", "pdf": "application/pdf",
    "json": "application/json", "csv": "text/csv", "txt": "text/plain",
    "doc": "application/msword", "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xls": "application/vnd.ms-excel", "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
}

@api_router.post("/documents/upload/{practice_id}")
async def upload_document(practice_id: str, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    practice = await db.practices.find_one({"id": practice_id, "user_id": user["id"]})
    if not practice:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/uploads/{user['id']}/{file_id}.{ext}"
    
    data = await file.read()
    content_type = file.content_type or MIME_TYPES.get(ext, "application/octet-stream")
    
    result = put_object(path, data, content_type)
    
    doc_record = {
        "id": file_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "practice_id": practice_id,
        "user_id": user["id"],
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.documents.insert_one(doc_record)
    
    # Add to practice documents list
    await db.practices.update_one(
        {"id": practice_id},
        {"$push": {"documents": {"id": file_id, "filename": file.filename, "uploaded_at": doc_record["created_at"]}}}
    )
    
    await log_activity(user["id"], "document", "document_uploaded", {
        "document_id": file_id,
        "practice_id": practice_id,
        "filename": file.filename
    })
    
    doc_record.pop("_id", None)
    return doc_record

@api_router.get("/documents/{document_id}")
async def get_document(document_id: str, user: dict = Depends(get_current_user)):
    doc = await db.documents.find_one({"id": document_id, "user_id": user["id"], "is_deleted": False})
    if not doc:
        raise HTTPException(status_code=404, detail="Documento non trovato")
    
    data, content_type = get_object(doc["storage_path"])
    return Response(content=data, media_type=doc.get("content_type", content_type))

@api_router.get("/documents/practice/{practice_id}")
async def get_practice_documents(practice_id: str, user: dict = Depends(get_current_user)):
    docs = await db.documents.find(
        {"practice_id": practice_id, "user_id": user["id"], "is_deleted": False},
        {"_id": 0}
    ).to_list(100)
    return docs

# ========================
# AI AGENTS ENDPOINTS
# ========================

from emergentintegrations.llm.chat import LlmChat, UserMessage

AGENT_DESCRIPTIONS = {
    "analysis": {
        "name": "Agente di Analisi",
        "description": "Analizza la situazione dell'utente e determina la pratica fiscale necessaria.",
        "system_message": """Sei l'Agente di Analisi di Herion - Assistente AI.
Il tuo compito è analizzare la situazione fiscale dell'utente e determinare quale pratica è necessaria.
Rispondi SEMPRE in italiano.
Sii chiaro, trasparente e spiega ogni passaggio del tuo ragionamento.
Format della risposta:
- Analisi della situazione
- Pratica consigliata
- Motivazione
- Documenti richiesti
- Prossimi passi"""
    },
    "validation": {
        "name": "Agente di Validazione",
        "description": "Verifica la completezza e correttezza dei dati inseriti.",
        "system_message": """Sei l'Agente di Validazione di Herion - Assistente AI.
Il tuo compito è verificare che i dati inseriti siano completi e corretti.
Rispondi SEMPRE in italiano.
Identifica eventuali errori o dati mancanti.
Format della risposta:
- Dati ricevuti
- Validazione eseguita
- Errori trovati (se presenti)
- Dati mancanti (se presenti)
- Suggerimenti"""
    },
    "document": {
        "name": "Agente Documenti",
        "description": "Estrae dati strutturati dai documenti e genera bozze.",
        "system_message": """Sei l'Agente Documenti di Herion - Assistente AI.
Il tuo compito è analizzare i documenti caricati ed estrarre informazioni strutturate.
Rispondi SEMPRE in italiano.
Format della risposta:
- Documento analizzato
- Dati estratti
- Informazioni chiave
- Note aggiuntive"""
    },
    "communication": {
        "name": "Agente Comunicazione",
        "description": "Spiega chiaramente all'utente cosa sta succedendo.",
        "system_message": """Sei l'Agente Comunicazione di Herion - Assistente AI.
Il tuo compito è spiegare in modo chiaro e semplice all'utente lo stato della pratica.
Rispondi SEMPRE in italiano, usando un linguaggio semplice e accessibile.
Evita termini tecnici quando possibile.
Format della risposta:
- Stato attuale
- Cosa è stato fatto
- Cosa succederà
- Tempistiche stimate"""
    }
}

@api_router.post("/agents/execute")
async def execute_agent(action: AgentAction, user: dict = Depends(get_current_user)):
    if action.agent_type not in AGENT_DESCRIPTIONS:
        raise HTTPException(status_code=400, detail="Tipo di agente non valido")
    
    practice = await db.practices.find_one({"id": action.practice_id, "user_id": user["id"]})
    if not practice:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    agent_config = AGENT_DESCRIPTIONS[action.agent_type]
    
    # Log the agent invocation (input transparency)
    agent_log_id = str(uuid.uuid4())
    agent_log = {
        "id": agent_log_id,
        "agent_type": action.agent_type,
        "agent_name": agent_config["name"],
        "input_data": action.input_data,
        "output_data": None,
        "status": "processing",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
        "explanation": f"Invocazione dell'agente '{agent_config['name']}' con i dati forniti."
    }
    
    await log_activity(user["id"], "agent", "agent_invoked", {
        "agent_type": action.agent_type,
        "practice_id": action.practice_id,
        "input_data": action.input_data
    })
    
    try:
        # Initialize LLM Chat
        chat = LlmChat(
            api_key=EMERGENT_KEY,
            session_id=f"agent-{action.agent_type}-{action.practice_id}-{agent_log_id}",
            system_message=agent_config["system_message"]
        ).with_model("openai", "gpt-5.2")
        
        # Prepare the message with practice context
        practice_context = {
            "tipo_pratica": practice.get("practice_type_label"),
            "cliente": practice.get("client_name"),
            "descrizione": practice.get("description"),
            "codice_fiscale": practice.get("fiscal_code"),
            "partita_iva": practice.get("vat_number"),
            "stato": practice.get("status_label"),
            "dati_aggiuntivi": practice.get("additional_data", {})
        }
        
        user_input = action.input_data.get("query", "Analizza questa pratica")
        full_message = f"""Contesto della pratica:
{practice_context}

Richiesta utente:
{user_input}

Dati aggiuntivi forniti:
{action.input_data}"""
        
        user_message = UserMessage(text=full_message)
        response = await chat.send_message(user_message)
        
        # Update agent log with output
        agent_log["output_data"] = response
        agent_log["status"] = "completed"
        agent_log["completed_at"] = datetime.now(timezone.utc).isoformat()
        
        # Add to practice agent_logs
        await db.practices.update_one(
            {"id": action.practice_id},
            {"$push": {"agent_logs": agent_log}}
        )
        
        # Log the completion (output transparency)
        await log_activity(user["id"], "agent", "agent_completed", {
            "agent_type": action.agent_type,
            "practice_id": action.practice_id,
            "log_id": agent_log_id
        })
        
        return {
            "agent": agent_config["name"],
            "input": action.input_data,
            "output": response,
            "log_id": agent_log_id,
            "explanation": f"L'agente '{agent_config['name']}' ha elaborato la richiesta. Tutti i passaggi sono registrati nel log."
        }
        
    except Exception as e:
        logger.error(f"Agent error: {str(e)}")
        agent_log["status"] = "error"
        agent_log["output_data"] = str(e)
        agent_log["completed_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.practices.update_one(
            {"id": action.practice_id},
            {"$push": {"agent_logs": agent_log}}
        )
        
        await log_activity(user["id"], "agent", "agent_error", {
            "agent_type": action.agent_type,
            "practice_id": action.practice_id,
            "error": str(e)
        })
        
        raise HTTPException(status_code=500, detail=f"Errore nell'esecuzione dell'agente: {str(e)}")

@api_router.get("/agents/info")
async def get_agents_info():
    """Get information about all available agents (public endpoint for transparency)"""
    return {
        "agents": [
            {
                "type": agent_type,
                "name": config["name"],
                "description": config["description"],
                "system_prompt": config["system_message"]
            }
            for agent_type, config in AGENT_DESCRIPTIONS.items()
        ],
        "transparency_note": "Tutti gli agenti AI sono completamente trasparenti. Ogni azione viene registrata con input e output completi."
    }

# ========================
# ACTIVITY LOG ENDPOINTS
# ========================

async def log_activity(user_id: str, category: str, action: str, details: dict):
    """Log an activity with full transparency"""
    log_entry = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "category": category,
        "action": action,
        "details": details,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "explanation": f"Azione '{action}' nella categoria '{category}'"
    }
    await db.activity_logs.insert_one(log_entry)
    return log_entry

@api_router.get("/activity-logs")
async def get_activity_logs(user: dict = Depends(get_current_user), limit: int = 50, category: Optional[str] = None):
    query = {"user_id": user["id"]}
    if category:
        query["category"] = category
    
    logs = await db.activity_logs.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return logs

@api_router.get("/activity-logs/practice/{practice_id}")
async def get_practice_activity_logs(practice_id: str, user: dict = Depends(get_current_user)):
    logs = await db.activity_logs.find(
        {"user_id": user["id"], "details.practice_id": practice_id},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(100)
    return logs

# ========================
# NOTIFICATIONS ENDPOINTS
# ========================

async def create_notification(user_id: str, title: str, message: str, notification_type: str = "info"):
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": notification_type,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    return notification

@api_router.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    notifications = await db.notifications.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    return notifications

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": user["id"]},
        {"$set": {"read": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notifica non trovata")
    return {"message": "Notifica segnata come letta"}

@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": user["id"], "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "Tutte le notifiche segnate come lette"}

# ========================
# DASHBOARD STATS
# ========================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    total_practices = await db.practices.count_documents({"user_id": user["id"]})
    pending = await db.practices.count_documents({"user_id": user["id"], "status": "pending"})
    processing = await db.practices.count_documents({"user_id": user["id"], "status": "processing"})
    completed = await db.practices.count_documents({"user_id": user["id"], "status": "completed"})
    unread_notifications = await db.notifications.count_documents({"user_id": user["id"], "read": False})
    
    recent_practices = await db.practices.find(
        {"user_id": user["id"]},
        {"_id": 0, "id": 1, "practice_type_label": 1, "client_name": 1, "status_label": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "total_practices": total_practices,
        "pending": pending,
        "processing": processing,
        "completed": completed,
        "unread_notifications": unread_notifications,
        "recent_practices": recent_practices
    }

# ========================
# PDF EXPORT
# ========================

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, HRFlowable
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from io import BytesIO

# Herion brand colors
HERION_TEAL = colors.HexColor('#0F4C5C')
HERION_ACCENT = colors.HexColor('#5DD9C1')
HERION_GRAY = colors.HexColor('#5C5C59')
HERION_LIGHT_GRAY = colors.HexColor('#F5F5F4')
HERION_BORDER = colors.HexColor('#E5E5E3')

def create_herion_logo_drawing(width=50, height=50):
    """Create Herion logo as reportlab drawing"""
    from reportlab.graphics.shapes import Drawing, Rect, Line, String
    from reportlab.graphics import renderPDF
    
    d = Drawing(width, height)
    
    # Background rectangle with rounded corners (simulated)
    d.add(Rect(2, 2, width-4, height-4, fillColor=HERION_TEAL, strokeColor=None, rx=8, ry=8))
    
    # H letter strokes
    stroke_width = 3
    # Left vertical
    d.add(Line(width*0.3, height*0.75, width*0.3, height*0.25, strokeColor=HERION_ACCENT, strokeWidth=stroke_width))
    # Right vertical
    d.add(Line(width*0.7, height*0.75, width*0.7, height*0.25, strokeColor=HERION_ACCENT, strokeWidth=stroke_width))
    # Horizontal
    d.add(Line(width*0.3, height*0.5, width*0.7, height*0.5, strokeColor=HERION_ACCENT, strokeWidth=stroke_width))
    
    return d

def generate_practice_pdf(practice: dict, user: dict) -> bytes:
    """Generate a professional PDF report for a practice"""
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )
    
    # Custom styles
    styles = getSampleStyleSheet()
    
    # Title style
    title_style = ParagraphStyle(
        'HerionTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=HERION_TEAL,
        spaceAfter=6,
        fontName='Helvetica-Bold'
    )
    
    # Subtitle style
    subtitle_style = ParagraphStyle(
        'HerionSubtitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=HERION_GRAY,
        spaceAfter=20,
        fontName='Helvetica'
    )
    
    # Section header style
    section_style = ParagraphStyle(
        'HerionSection',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=HERION_TEAL,
        spaceBefore=20,
        spaceAfter=10,
        fontName='Helvetica-Bold'
    )
    
    # Body text style
    body_style = ParagraphStyle(
        'HerionBody',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.black,
        spaceAfter=8,
        fontName='Helvetica',
        leading=14
    )
    
    # Label style
    label_style = ParagraphStyle(
        'HerionLabel',
        parent=styles['Normal'],
        fontSize=8,
        textColor=HERION_GRAY,
        fontName='Helvetica-Bold',
        spaceBefore=6
    )
    
    # Value style
    value_style = ParagraphStyle(
        'HerionValue',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.black,
        fontName='Helvetica',
        spaceAfter=12
    )
    
    # AI response style
    ai_style = ParagraphStyle(
        'HerionAI',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.black,
        fontName='Helvetica',
        leading=14,
        leftIndent=10,
        rightIndent=10,
        backColor=HERION_LIGHT_GRAY
    )
    
    elements = []
    
    # Header with branding
    header_data = [
        [
            create_herion_logo_drawing(40, 40),
            Paragraph('<font size="20" color="#0F4C5C"><b>HERION</b></font><br/><font size="8" color="#5C5C59">Precision. Control. Confidence.</font>', styles['Normal'])
        ]
    ]
    header_table = Table(header_data, colWidths=[50, 400])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (0, 0), 0),
        ('LEFTPADDING', (1, 0), (1, 0), 10),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 10))
    
    # Horizontal line
    elements.append(HRFlowable(width="100%", thickness=2, color=HERION_ACCENT, spaceBefore=5, spaceAfter=20))
    
    # Document title
    elements.append(Paragraph("RAPPORTO PRATICA FISCALE", title_style))
    elements.append(Paragraph(f"Documento generato il {datetime.now().strftime('%d/%m/%Y alle %H:%M')}", subtitle_style))
    
    # Reference ID box
    ref_data = [[
        Paragraph('<font size="8" color="#5C5C59">RIFERIMENTO PRATICA</font>', styles['Normal']),
        Paragraph(f'<font size="12" color="#0F4C5C"><b>{practice.get("id", "N/A")[:8].upper()}</b></font>', styles['Normal'])
    ]]
    ref_table = Table(ref_data, colWidths=[120, 350])
    ref_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), HERION_LIGHT_GRAY),
        ('BOX', (0, 0), (-1, -1), 1, HERION_BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(ref_table)
    elements.append(Spacer(1, 20))
    
    # Practice Information Section
    elements.append(Paragraph("INFORMAZIONI PRATICA", section_style))
    
    # Practice details table
    client_type_labels = {"private": "Privato", "freelancer": "Libero Professionista", "company": "Azienda"}
    
    practice_data = [
        ["Tipo Pratica:", practice.get("practice_type_label", "N/A")],
        ["Stato:", practice.get("status_label", "N/A")],
        ["Data Creazione:", practice.get("created_at", "N/A")[:10] if practice.get("created_at") else "N/A"],
        ["Ultimo Aggiornamento:", practice.get("updated_at", "N/A")[:10] if practice.get("updated_at") else "N/A"],
    ]
    
    practice_table = Table(practice_data, colWidths=[150, 320])
    practice_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), HERION_GRAY),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.black),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, HERION_BORDER),
    ]))
    elements.append(practice_table)
    elements.append(Spacer(1, 10))
    
    # Client Information Section
    elements.append(Paragraph("DATI CLIENTE", section_style))
    
    client_data = [
        ["Nome/Ragione Sociale:", practice.get("client_name", "N/A")],
        ["Tipo Cliente:", client_type_labels.get(practice.get("client_type", ""), practice.get("client_type_label", "N/A"))],
    ]
    
    if practice.get("fiscal_code"):
        client_data.append(["Codice Fiscale:", practice.get("fiscal_code")])
    
    if practice.get("vat_number"):
        client_data.append(["Partita IVA:", practice.get("vat_number")])
    
    client_table = Table(client_data, colWidths=[150, 320])
    client_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), HERION_GRAY),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.black),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, HERION_BORDER),
    ]))
    elements.append(client_table)
    elements.append(Spacer(1, 10))
    
    # Description Section
    elements.append(Paragraph("DESCRIZIONE RICHIESTA", section_style))
    description = practice.get("description", "Nessuna descrizione disponibile.")
    elements.append(Paragraph(description, body_style))
    elements.append(Spacer(1, 10))
    
    # AI Analysis Section
    agent_logs = practice.get("agent_logs", [])
    if agent_logs:
        elements.append(Paragraph("ANALISI HERION AI", section_style))
        
        for log in agent_logs:
            if log.get("status") == "completed" and log.get("output_data"):
                # Agent header
                agent_header = f'<font color="#0F4C5C"><b>{log.get("agent_name", "Agente")}</b></font>'
                elements.append(Paragraph(agent_header, body_style))
                
                # Agent output in styled box
                output_text = str(log.get("output_data", ""))[:2000]  # Limit length
                # Clean and format the output
                output_text = output_text.replace('\n', '<br/>')
                
                output_data = [[Paragraph(output_text, ai_style)]]
                output_table = Table(output_data, colWidths=[470])
                output_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, -1), HERION_LIGHT_GRAY),
                    ('BOX', (0, 0), (-1, -1), 1, HERION_BORDER),
                    ('LEFTPADDING', (0, 0), (-1, -1), 12),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 12),
                    ('TOPPADDING', (0, 0), (-1, -1), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
                ]))
                elements.append(output_table)
                elements.append(Spacer(1, 15))
    
    # Footer
    elements.append(Spacer(1, 30))
    elements.append(HRFlowable(width="100%", thickness=1, color=HERION_BORDER, spaceBefore=10, spaceAfter=10))
    
    footer_style = ParagraphStyle(
        'HerionFooter',
        parent=styles['Normal'],
        fontSize=8,
        textColor=HERION_GRAY,
        alignment=TA_CENTER
    )
    
    elements.append(Paragraph(
        f"Documento generato automaticamente da Herion - Precision. Control. Confidence.<br/>"
        f"Questo documento è stato creato il {datetime.now().strftime('%d/%m/%Y alle %H:%M')} e ha valore informativo.<br/>"
        f"Riferimento: {practice.get('id', 'N/A')}",
        footer_style
    ))
    
    # Build PDF
    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    return pdf_bytes

@api_router.get("/practices/{practice_id}/pdf")
async def download_practice_pdf(practice_id: str, user: dict = Depends(get_current_user)):
    """Download PDF report for a completed practice"""
    
    practice = await db.practices.find_one({"id": practice_id, "user_id": user["id"]}, {"_id": 0})
    
    if not practice:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    if practice.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Il PDF è disponibile solo per pratiche completate")
    
    # Generate PDF
    try:
        pdf_bytes = generate_practice_pdf(practice, user)
        
        # Log activity
        await log_activity(user["id"], "document", "pdf_downloaded", {
            "practice_id": practice_id,
            "practice_type": practice.get("practice_type_label")
        })
        
        # Create filename
        filename = f"Herion_Pratica_{practice.get('practice_type', 'report')}_{practice_id[:8]}.pdf"
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except Exception as e:
        logger.error(f"PDF generation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Errore nella generazione del PDF")

# ========================
# ROOT ENDPOINT
# ========================

@api_router.get("/")
async def root():
    return {"message": "Herion API - Precision. Control. Confidence.", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[os.environ.get('FRONTEND_URL', '*')],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event
@app.on_event("startup")
async def startup():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.practices.create_index([("user_id", 1), ("created_at", -1)])
    await db.documents.create_index([("practice_id", 1), ("is_deleted", 1)])
    await db.activity_logs.create_index([("user_id", 1), ("timestamp", -1)])
    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
    
    # Initialize storage
    try:
        init_storage()
        logger.info("Storage initialized successfully")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@aic.it")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin123!")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Amministratore",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "consent_given": True,
            "consent_date": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin user created: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info("Admin password updated")
    
    # Write test credentials
    Path("/app/memory").mkdir(exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"""# Test Credentials for Herion

## Admin Account
- Email: {admin_email}
- Password: {admin_password}
- Role: admin

## Auth Endpoints
- POST /api/auth/register - Register new user
- POST /api/auth/login - Login
- POST /api/auth/logout - Logout
- GET /api/auth/me - Get current user

## Client Types
- private: Privato (no VAT number required)
- freelancer: Libero Professionista (VAT number required)
- company: Azienda (VAT number required)
""")
    
    logger.info("Herion - Precision. Control. Confidence. - started successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
