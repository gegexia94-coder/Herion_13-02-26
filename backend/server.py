from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, File, UploadFile, Response
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import secrets
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
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
# CONSTANTS
# ========================

CLIENT_TYPES = {
    "private": "Privato",
    "freelancer": "Libero Professionista",
    "company": "Azienda"
}

EU_COUNTRIES = [
    {"code": "IT", "name": "Italia", "fiscal_id_label": "Codice Fiscale", "vat_prefix": "IT"},
    {"code": "DE", "name": "Germania", "fiscal_id_label": "Steuerliche Identifikationsnummer", "vat_prefix": "DE"},
    {"code": "FR", "name": "Francia", "fiscal_id_label": "Numero fiscal de reference", "vat_prefix": "FR"},
    {"code": "ES", "name": "Spagna", "fiscal_id_label": "NIF / NIE", "vat_prefix": "ES"},
    {"code": "PT", "name": "Portogallo", "fiscal_id_label": "NIF", "vat_prefix": "PT"},
    {"code": "NL", "name": "Paesi Bassi", "fiscal_id_label": "BSN", "vat_prefix": "NL"},
    {"code": "BE", "name": "Belgio", "fiscal_id_label": "Numero nazionale", "vat_prefix": "BE"},
    {"code": "AT", "name": "Austria", "fiscal_id_label": "Steuernummer", "vat_prefix": "AT"},
    {"code": "IE", "name": "Irlanda", "fiscal_id_label": "PPS Number", "vat_prefix": "IE"},
    {"code": "GR", "name": "Grecia", "fiscal_id_label": "AFM", "vat_prefix": "EL"},
    {"code": "PL", "name": "Polonia", "fiscal_id_label": "PESEL / NIP", "vat_prefix": "PL"},
    {"code": "SE", "name": "Svezia", "fiscal_id_label": "Personnummer", "vat_prefix": "SE"},
    {"code": "DK", "name": "Danimarca", "fiscal_id_label": "CPR-nummer", "vat_prefix": "DK"},
    {"code": "FI", "name": "Finlandia", "fiscal_id_label": "Henkilotunnus", "vat_prefix": "FI"},
    {"code": "CZ", "name": "Repubblica Ceca", "fiscal_id_label": "Rodne cislo", "vat_prefix": "CZ"},
    {"code": "RO", "name": "Romania", "fiscal_id_label": "CNP", "vat_prefix": "RO"},
    {"code": "HU", "name": "Ungheria", "fiscal_id_label": "Adoazonosito jel", "vat_prefix": "HU"},
    {"code": "HR", "name": "Croazia", "fiscal_id_label": "OIB", "vat_prefix": "HR"},
    {"code": "SK", "name": "Slovacchia", "fiscal_id_label": "Rodne cislo", "vat_prefix": "SK"},
    {"code": "SI", "name": "Slovenia", "fiscal_id_label": "Davcna stevilka", "vat_prefix": "SI"},
    {"code": "BG", "name": "Bulgaria", "fiscal_id_label": "EGN", "vat_prefix": "BG"},
    {"code": "LT", "name": "Lituania", "fiscal_id_label": "Asmens kodas", "vat_prefix": "LT"},
    {"code": "LV", "name": "Lettonia", "fiscal_id_label": "Personas kods", "vat_prefix": "LV"},
    {"code": "EE", "name": "Estonia", "fiscal_id_label": "Isikukood", "vat_prefix": "EE"},
    {"code": "CY", "name": "Cipro", "fiscal_id_label": "TIC", "vat_prefix": "CY"},
    {"code": "MT", "name": "Malta", "fiscal_id_label": "ID Number", "vat_prefix": "MT"},
    {"code": "LU", "name": "Lussemburgo", "fiscal_id_label": "Matricule", "vat_prefix": "LU"},
]

DOCUMENT_CATEGORIES = [
    {"key": "identity", "label": "Documenti di Identita", "description": "Carta d'identita, passaporto, patente"},
    {"key": "tax_declarations", "label": "Dichiarazioni Fiscali", "description": "Dichiarazioni dei redditi, modelli unici"},
    {"key": "vat_documents", "label": "Documenti IVA", "description": "Registri IVA, liquidazioni periodiche"},
    {"key": "invoices", "label": "Fatture", "description": "Fatture emesse e ricevute"},
    {"key": "company_documents", "label": "Documenti Societari", "description": "Visure, statuti, atti costitutivi"},
    {"key": "accounting", "label": "Documenti Contabili", "description": "Bilanci, registri contabili, prima nota"},
    {"key": "compliance", "label": "Conformita", "description": "Certificazioni, attestazioni, conformita"},
    {"key": "payroll", "label": "Buste Paga e Lavoro", "description": "Cedolini, contratti di lavoro, CU"},
    {"key": "activity", "label": "Apertura / Chiusura Attivita", "description": "Pratiche di apertura o chiusura"},
    {"key": "other", "label": "Altri Documenti", "description": "Documenti non categorizzati"},
]

PRACTICE_TYPES = {
    "vat_registration": "Apertura Partita IVA",
    "vat_closure": "Chiusura Partita IVA",
    "tax_declaration": "Dichiarazione dei Redditi",
    "f24_payment": "Versamento F24",
    "inps_registration": "Iscrizione INPS",
    "accounting_setup": "Impostazione Contabilita",
    "company_formation": "Costituzione Societa",
    "annual_report": "Bilancio Annuale",
    "other": "Altra Pratica"
}

# ========================
# MODELS
# ========================

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    country: Optional[str] = "IT"
    city: Optional[str] = None
    address: Optional[str] = None
    client_type: Optional[str] = "private"
    vat_number: Optional[str] = None
    fiscal_code: Optional[str] = None
    company_name: Optional[str] = None
    privacy_consent: bool = True
    terms_consent: bool = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ProfileUpdate(BaseModel):
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class PracticeCreate(BaseModel):
    practice_type: str
    description: str
    client_name: str
    client_type: str = "private"
    fiscal_code: Optional[str] = None
    vat_number: Optional[str] = None
    country: Optional[str] = "IT"
    additional_data: Optional[dict] = {}

class PracticeUpdate(BaseModel):
    description: Optional[str] = None
    status: Optional[str] = None
    additional_data: Optional[dict] = None

class AgentAction(BaseModel):
    agent_type: str
    practice_id: str
    input_data: dict

class OrchestrationRequest(BaseModel):
    practice_id: str
    query: Optional[str] = "Analizza questa pratica in modo completo"

# ========================
# AUTH ENDPOINTS
# ========================

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    email = user_data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email gia registrata")

    full_name = f"{user_data.first_name} {user_data.last_name}".strip()
    user_doc = {
        "email": email,
        "password_hash": hash_password(user_data.password),
        "first_name": user_data.first_name,
        "last_name": user_data.last_name,
        "name": full_name,
        "phone": user_data.phone,
        "date_of_birth": user_data.date_of_birth,
        "country": user_data.country or "IT",
        "city": user_data.city,
        "address": user_data.address,
        "client_type": user_data.client_type or "private",
        "vat_number": user_data.vat_number if user_data.client_type in ["freelancer", "company"] else None,
        "fiscal_code": user_data.fiscal_code,
        "company_name": user_data.company_name if user_data.client_type == "company" else None,
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "privacy_consent": user_data.privacy_consent,
        "privacy_consent_date": datetime.now(timezone.utc).isoformat(),
        "terms_consent": user_data.terms_consent,
        "terms_consent_date": datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)

    response = JSONResponse(content={
        "id": user_id,
        "email": email,
        "name": full_name,
        "first_name": user_data.first_name,
        "last_name": user_data.last_name,
        "role": "user",
        "client_type": user_data.client_type or "private",
        "country": user_data.country or "IT"
    })
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")

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
        "name": user.get("name", ""),
        "first_name": user.get("first_name", ""),
        "last_name": user.get("last_name", ""),
        "role": user.get("role", "user"),
        "client_type": user.get("client_type", "private"),
        "country": user.get("country", "IT")
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

@api_router.post("/auth/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    email = req.email.lower()
    user = await db.users.find_one({"email": email})
    if not user:
        return {"message": "Se l'email e registrata, riceverai un link per reimpostare la password."}

    token = secrets.token_urlsafe(32)
    await db.password_reset_tokens.insert_one({
        "token": token,
        "user_id": str(user["_id"]),
        "email": email,
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    reset_link = f"{frontend_url}/reset-password?token={token}"
    logger.info(f"[MOCK EMAIL] Password reset link for {email}: {reset_link}")

    return {"message": "Se l'email e registrata, riceverai un link per reimpostare la password."}

@api_router.post("/auth/reset-password")
async def reset_password(req: ResetPasswordRequest):
    token_doc = await db.password_reset_tokens.find_one({
        "token": req.token,
        "used": False,
        "expires_at": {"$gt": datetime.now(timezone.utc)}
    })
    if not token_doc:
        raise HTTPException(status_code=400, detail="Link non valido o scaduto")

    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="La password deve avere almeno 8 caratteri")

    await db.users.update_one(
        {"_id": ObjectId(token_doc["user_id"])},
        {"$set": {"password_hash": hash_password(req.new_password)}}
    )
    await db.password_reset_tokens.update_one(
        {"token": req.token},
        {"$set": {"used": True}}
    )

    return {"message": "Password reimpostata con successo"}

@api_router.get("/auth/profile")
async def get_profile(user: dict = Depends(get_current_user)):
    return user

@api_router.put("/auth/profile")
async def update_profile(update: ProfileUpdate, user: dict = Depends(get_current_user)):
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if update.phone is not None:
        update_data["phone"] = update.phone
    if update.date_of_birth is not None:
        update_data["date_of_birth"] = update.date_of_birth
    if update.country is not None:
        update_data["country"] = update.country
    if update.city is not None:
        update_data["city"] = update.city
    if update.address is not None:
        update_data["address"] = update.address

    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": update_data})
    updated_user = await db.users.find_one({"_id": ObjectId(user["id"])}, {"_id": 0, "password_hash": 0})
    if updated_user:
        updated_user["id"] = user["id"]
    return updated_user

@api_router.put("/auth/change-password")
async def change_password(req: ChangePasswordRequest, user: dict = Depends(get_current_user)):
    user_doc = await db.users.find_one({"_id": ObjectId(user["id"])})
    if not user_doc or not verify_password(req.current_password, user_doc["password_hash"]):
        raise HTTPException(status_code=400, detail="La password attuale non e corretta")

    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="La nuova password deve avere almeno 8 caratteri")

    await db.users.update_one(
        {"_id": ObjectId(user["id"])},
        {"$set": {"password_hash": hash_password(req.new_password)}}
    )
    return {"message": "Password aggiornata con successo"}

# ========================
# REFERENCE DATA
# ========================

@api_router.get("/countries")
async def get_countries():
    return EU_COUNTRIES

@api_router.get("/document-categories")
async def get_document_categories():
    return DOCUMENT_CATEGORIES

# ========================
# PRACTICES ENDPOINTS
# ========================

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
        "country": practice.country or user.get("country", "IT"),
        "additional_data": practice.additional_data or {},
        "status": "pending",
        "status_label": "In Attesa",
        "documents": [],
        "agent_logs": [],
        "orchestration_result": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    await db.practices.insert_one(practice_doc)
    await log_activity(user["id"], "practice", "practice_created", {
        "practice_id": practice_doc["id"],
        "practice_type": practice.practice_type
    })
    await create_notification(user["id"], "Nuova Pratica Creata",
        f"La pratica '{PRACTICE_TYPES.get(practice.practice_type, practice.practice_type)}' per {practice.client_name} e stata creata.", "success")

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
async def upload_document(practice_id: str, file: UploadFile = File(...), category: str = "other", user: dict = Depends(get_current_user)):
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
        "category": category,
        "practice_id": practice_id,
        "user_id": user["id"],
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.documents.insert_one(doc_record)
    await db.practices.update_one(
        {"id": practice_id},
        {"$push": {"documents": {"id": file_id, "filename": file.filename, "category": category, "uploaded_at": doc_record["created_at"]}}}
    )

    await log_activity(user["id"], "document", "document_uploaded", {
        "document_id": file_id, "practice_id": practice_id, "filename": file.filename, "category": category
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
        "step": 1,
        "system_message": """Sei l'Agente di Analisi di Herion - Assistente AI per la gestione fiscale europea.
Il tuo compito e analizzare la situazione fiscale dell'utente e determinare quale pratica e necessaria.
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
        "step": 2,
        "system_message": """Sei l'Agente di Validazione di Herion - Assistente AI per la gestione fiscale europea.
Il tuo compito e verificare che i dati inseriti siano completi e corretti.
Rispondi SEMPRE in italiano.
Identifica eventuali errori o dati mancanti.
Format della risposta:
- Dati ricevuti
- Validazione eseguita
- Errori trovati (se presenti)
- Dati mancanti (se presenti)
- Suggerimenti"""
    },
    "compliance": {
        "name": "Agente di Conformita",
        "description": "Verifica la conformita alle normative fiscali del paese selezionato.",
        "step": 3,
        "system_message": """Sei l'Agente di Conformita di Herion - Assistente AI per la gestione fiscale europea.
Il tuo compito e verificare che la pratica sia conforme alle normative fiscali applicabili.
Rispondi SEMPRE in italiano.
Considera il paese di riferimento e le normative specifiche.
Format della risposta:
- Normative applicabili
- Verifica conformita
- Rischi identificati
- Adempimenti necessari
- Raccomandazioni"""
    },
    "document": {
        "name": "Agente Documenti",
        "description": "Estrae dati strutturati dai documenti e genera bozze.",
        "step": 4,
        "system_message": """Sei l'Agente Documenti di Herion - Assistente AI per la gestione fiscale europea.
Il tuo compito e analizzare i documenti ed estrarre informazioni strutturate, creando report e sintesi.
Rispondi SEMPRE in italiano.
Format della risposta:
- Documento analizzato
- Dati estratti
- Sintesi strutturata
- Note aggiuntive"""
    },
    "communication": {
        "name": "Agente Comunicazione",
        "description": "Spiega chiaramente all'utente cosa sta succedendo con linguaggio semplice.",
        "step": 5,
        "system_message": """Sei l'Agente Comunicazione di Herion - Assistente AI per la gestione fiscale europea.
Il tuo compito e spiegare in modo chiaro e semplice all'utente lo stato della pratica e i risultati dell'analisi.
Rispondi SEMPRE in italiano, usando un linguaggio semplice e accessibile.
Evita termini tecnici quando possibile.
Format della risposta:
- Stato attuale
- Cosa e stato fatto
- Cosa succedera
- Tempistiche stimate
- Consigli pratici"""
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
    agent_log_id = str(uuid.uuid4())
    agent_log = {
        "id": agent_log_id,
        "agent_type": action.agent_type,
        "agent_name": agent_config["name"],
        "step": agent_config["step"],
        "input_data": action.input_data,
        "output_data": None,
        "status": "processing",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
        "explanation": f"Invocazione dell'agente '{agent_config['name']}' con i dati forniti."
    }

    await log_activity(user["id"], "agent", "agent_invoked", {
        "agent_type": action.agent_type, "practice_id": action.practice_id, "input_data": action.input_data
    })

    try:
        chat = LlmChat(
            api_key=EMERGENT_KEY,
            session_id=f"agent-{action.agent_type}-{action.practice_id}-{agent_log_id}",
            system_message=agent_config["system_message"]
        ).with_model("openai", "gpt-5.2")

        practice_context = {
            "tipo_pratica": practice.get("practice_type_label"),
            "cliente": practice.get("client_name"),
            "descrizione": practice.get("description"),
            "codice_fiscale": practice.get("fiscal_code"),
            "partita_iva": practice.get("vat_number"),
            "paese": practice.get("country", "IT"),
            "stato": practice.get("status_label"),
            "dati_aggiuntivi": practice.get("additional_data", {})
        }

        user_input = action.input_data.get("query", "Analizza questa pratica")
        full_message = f"""Contesto della pratica:\n{practice_context}\n\nRichiesta utente:\n{user_input}\n\nDati aggiuntivi forniti:\n{action.input_data}"""

        user_message = UserMessage(text=full_message)
        response = await chat.send_message(user_message)

        agent_log["output_data"] = response
        agent_log["status"] = "completed"
        agent_log["completed_at"] = datetime.now(timezone.utc).isoformat()

        await db.practices.update_one({"id": action.practice_id}, {"$push": {"agent_logs": agent_log}})
        await log_activity(user["id"], "agent", "agent_completed", {
            "agent_type": action.agent_type, "practice_id": action.practice_id, "log_id": agent_log_id
        })

        return {
            "agent": agent_config["name"],
            "step": agent_config["step"],
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
        await db.practices.update_one({"id": action.practice_id}, {"$push": {"agent_logs": agent_log}})
        await log_activity(user["id"], "agent", "agent_error", {
            "agent_type": action.agent_type, "practice_id": action.practice_id, "error": str(e)
        })
        raise HTTPException(status_code=500, detail=f"Errore nell'esecuzione dell'agente: {str(e)}")

@api_router.get("/agents/info")
async def get_agents_info():
    return {
        "agents": [
            {
                "type": agent_type,
                "name": config["name"],
                "description": config["description"],
                "step": config["step"],
                "system_prompt": config["system_message"]
            }
            for agent_type, config in AGENT_DESCRIPTIONS.items()
        ],
        "workflow_steps": ["analysis", "validation", "compliance", "document", "communication"],
        "transparency_note": "Tutti gli agenti AI sono completamente trasparenti. Ogni azione viene registrata con input e output completi."
    }

@api_router.post("/agents/orchestrate")
async def orchestrate_agents(req: OrchestrationRequest, user: dict = Depends(get_current_user)):
    practice = await db.practices.find_one({"id": req.practice_id, "user_id": user["id"]})
    if not practice:
        raise HTTPException(status_code=404, detail="Pratica non trovata")

    orchestration_id = str(uuid.uuid4())
    workflow_steps = ["analysis", "validation", "compliance", "document", "communication"]
    results = []
    previous_output = ""

    await log_activity(user["id"], "orchestration", "orchestration_started", {
        "orchestration_id": orchestration_id, "practice_id": req.practice_id
    })

    for step_type in workflow_steps:
        agent_config = AGENT_DESCRIPTIONS[step_type]
        agent_log_id = str(uuid.uuid4())

        step_result = {
            "id": agent_log_id,
            "agent_type": step_type,
            "agent_name": agent_config["name"],
            "step": agent_config["step"],
            "status": "running",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "input_summary": None,
            "output_data": None,
            "completed_at": None
        }

        try:
            chat = LlmChat(
                api_key=EMERGENT_KEY,
                session_id=f"orch-{orchestration_id}-{step_type}-{agent_log_id}",
                system_message=agent_config["system_message"]
            ).with_model("openai", "gpt-5.2")

            practice_context = {
                "tipo_pratica": practice.get("practice_type_label"),
                "cliente": practice.get("client_name"),
                "descrizione": practice.get("description"),
                "codice_fiscale": practice.get("fiscal_code"),
                "partita_iva": practice.get("vat_number"),
                "paese": practice.get("country", "IT"),
                "stato": practice.get("status_label"),
            }

            context_msg = f"Contesto pratica:\n{practice_context}\n\nRichiesta: {req.query}"
            if previous_output:
                context_msg += f"\n\nOutput dell'agente precedente:\n{previous_output}"

            step_result["input_summary"] = context_msg[:200]

            user_message = UserMessage(text=context_msg)
            response = await chat.send_message(user_message)

            step_result["output_data"] = response
            step_result["status"] = "completed"
            step_result["completed_at"] = datetime.now(timezone.utc).isoformat()
            previous_output = response

        except Exception as e:
            logger.error(f"Orchestration step {step_type} error: {str(e)}")
            step_result["output_data"] = f"Errore: {str(e)}"
            step_result["status"] = "failed"
            step_result["completed_at"] = datetime.now(timezone.utc).isoformat()

        results.append(step_result)

    orchestration_result = {
        "id": orchestration_id,
        "steps": results,
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "agents_used": [r["agent_name"] for r in results],
        "final_status": "completed" if all(r["status"] == "completed" for r in results) else "partial"
    }

    await db.practices.update_one(
        {"id": req.practice_id},
        {"$set": {"orchestration_result": orchestration_result, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    for r in results:
        agent_log_entry = {
            "id": r["id"],
            "agent_type": r["agent_type"],
            "agent_name": r["agent_name"],
            "step": r["step"],
            "input_data": {"orchestration_id": orchestration_id, "query": req.query},
            "output_data": r["output_data"],
            "status": r["status"],
            "started_at": r["started_at"],
            "completed_at": r["completed_at"],
            "explanation": f"Orchestrazione automatica - Step {r['step']}: {r['agent_name']}"
        }
        await db.practices.update_one({"id": req.practice_id}, {"$push": {"agent_logs": agent_log_entry}})

    await log_activity(user["id"], "orchestration", "orchestration_completed", {
        "orchestration_id": orchestration_id, "practice_id": req.practice_id, "final_status": orchestration_result["final_status"]
    })

    return orchestration_result

# ========================
# ACTIVITY LOG ENDPOINTS
# ========================

async def log_activity(user_id: str, category: str, action: str, details: dict):
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
        {"user_id": user["id"], "details.practice_id": practice_id}, {"_id": 0}
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
    notifications = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    return notifications

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    result = await db.notifications.update_one({"id": notification_id, "user_id": user["id"]}, {"$set": {"read": True}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notifica non trovata")
    return {"message": "Notifica segnata come letta"}

@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"], "read": False}, {"$set": {"read": True}})
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
        {"_id": 0, "id": 1, "practice_type_label": 1, "client_name": 1, "status": 1, "status_label": 1, "created_at": 1}
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

from reportlab.lib import colors as rl_colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.enums import TA_CENTER
from io import BytesIO

HERION_TEAL = rl_colors.HexColor('#0F4C5C')
HERION_ACCENT = rl_colors.HexColor('#5DD9C1')
HERION_GRAY = rl_colors.HexColor('#475569')
HERION_LIGHT_GRAY = rl_colors.HexColor('#F7FAFC')
HERION_BORDER = rl_colors.HexColor('#E2E8F0')

def create_herion_logo_drawing(width=50, height=50):
    from reportlab.graphics.shapes import Drawing, Rect, Line
    d = Drawing(width, height)
    d.add(Rect(2, 2, width-4, height-4, fillColor=HERION_TEAL, strokeColor=None, rx=8, ry=8))
    stroke_width = 3
    d.add(Line(width*0.3, height*0.75, width*0.3, height*0.25, strokeColor=HERION_ACCENT, strokeWidth=stroke_width))
    d.add(Line(width*0.7, height*0.75, width*0.7, height*0.25, strokeColor=HERION_ACCENT, strokeWidth=stroke_width))
    d.add(Line(width*0.3, height*0.5, width*0.7, height*0.5, strokeColor=HERION_ACCENT, strokeWidth=stroke_width))
    return d

def generate_practice_pdf(practice: dict, user: dict) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle('HerionTitle', parent=styles['Heading1'], fontSize=24, textColor=HERION_TEAL, spaceAfter=6, fontName='Helvetica-Bold')
    subtitle_style = ParagraphStyle('HerionSubtitle', parent=styles['Normal'], fontSize=10, textColor=HERION_GRAY, spaceAfter=20, fontName='Helvetica')
    section_style = ParagraphStyle('HerionSection', parent=styles['Heading2'], fontSize=14, textColor=HERION_TEAL, spaceBefore=20, spaceAfter=10, fontName='Helvetica-Bold')
    body_style = ParagraphStyle('HerionBody', parent=styles['Normal'], fontSize=10, textColor=rl_colors.black, spaceAfter=8, fontName='Helvetica', leading=14)
    ai_style = ParagraphStyle('HerionAI', parent=styles['Normal'], fontSize=10, textColor=rl_colors.black, fontName='Helvetica', leading=14, leftIndent=10, rightIndent=10, backColor=HERION_LIGHT_GRAY)
    footer_style = ParagraphStyle('HerionFooter', parent=styles['Normal'], fontSize=8, textColor=HERION_GRAY, alignment=TA_CENTER)

    elements = []

    header_data = [[create_herion_logo_drawing(40, 40), Paragraph('<font size="20" color="#0F4C5C"><b>HERION</b></font><br/><font size="8" color="#475569">Precision. Control. Confidence.</font>', styles['Normal'])]]
    header_table = Table(header_data, colWidths=[50, 400])
    header_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('LEFTPADDING', (0, 0), (0, 0), 0), ('LEFTPADDING', (1, 0), (1, 0), 10)]))
    elements.append(header_table)
    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=2, color=HERION_ACCENT, spaceBefore=5, spaceAfter=20))

    elements.append(Paragraph("RAPPORTO PRATICA FISCALE", title_style))
    elements.append(Paragraph(f"Documento generato il {datetime.now().strftime('%d/%m/%Y alle %H:%M')}", subtitle_style))

    ref_data = [[Paragraph('<font size="8" color="#475569">RIFERIMENTO PRATICA</font>', styles['Normal']), Paragraph(f'<font size="12" color="#0F4C5C"><b>{practice.get("id", "N/A")[:8].upper()}</b></font>', styles['Normal'])]]
    ref_table = Table(ref_data, colWidths=[120, 350])
    ref_table.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), HERION_LIGHT_GRAY), ('BOX', (0, 0), (-1, -1), 1, HERION_BORDER), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('LEFTPADDING', (0, 0), (-1, -1), 10), ('RIGHTPADDING', (0, 0), (-1, -1), 10), ('TOPPADDING', (0, 0), (-1, -1), 8), ('BOTTOMPADDING', (0, 0), (-1, -1), 8)]))
    elements.append(ref_table)
    elements.append(Spacer(1, 20))

    elements.append(Paragraph("INFORMAZIONI PRATICA", section_style))
    practice_data = [
        ["Tipo Pratica:", practice.get("practice_type_label", "N/A")],
        ["Stato:", practice.get("status_label", "N/A")],
        ["Paese:", practice.get("country", "IT")],
        ["Data Creazione:", practice.get("created_at", "N/A")[:10] if practice.get("created_at") else "N/A"],
        ["Ultimo Aggiornamento:", practice.get("updated_at", "N/A")[:10] if practice.get("updated_at") else "N/A"],
    ]
    practice_table = Table(practice_data, colWidths=[150, 320])
    practice_table.setStyle(TableStyle([('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'), ('FONTNAME', (1, 0), (1, -1), 'Helvetica'), ('FONTSIZE', (0, 0), (-1, -1), 10), ('TEXTCOLOR', (0, 0), (0, -1), HERION_GRAY), ('TEXTCOLOR', (1, 0), (1, -1), rl_colors.black), ('BOTTOMPADDING', (0, 0), (-1, -1), 8), ('TOPPADDING', (0, 0), (-1, -1), 8), ('LINEBELOW', (0, 0), (-1, -2), 0.5, HERION_BORDER)]))
    elements.append(practice_table)
    elements.append(Spacer(1, 10))

    elements.append(Paragraph("DATI CLIENTE", section_style))
    client_data = [["Nome/Ragione Sociale:", practice.get("client_name", "N/A")], ["Tipo Cliente:", CLIENT_TYPES.get(practice.get("client_type", ""), practice.get("client_type_label", "N/A"))]]
    if practice.get("fiscal_code"):
        client_data.append(["Codice Fiscale:", practice.get("fiscal_code")])
    if practice.get("vat_number"):
        client_data.append(["Partita IVA:", practice.get("vat_number")])
    client_table = Table(client_data, colWidths=[150, 320])
    client_table.setStyle(TableStyle([('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'), ('FONTNAME', (1, 0), (1, -1), 'Helvetica'), ('FONTSIZE', (0, 0), (-1, -1), 10), ('TEXTCOLOR', (0, 0), (0, -1), HERION_GRAY), ('TEXTCOLOR', (1, 0), (1, -1), rl_colors.black), ('BOTTOMPADDING', (0, 0), (-1, -1), 8), ('TOPPADDING', (0, 0), (-1, -1), 8), ('LINEBELOW', (0, 0), (-1, -2), 0.5, HERION_BORDER)]))
    elements.append(client_table)
    elements.append(Spacer(1, 10))

    elements.append(Paragraph("DESCRIZIONE RICHIESTA", section_style))
    elements.append(Paragraph(practice.get("description", "Nessuna descrizione disponibile."), body_style))
    elements.append(Spacer(1, 10))

    agent_logs = practice.get("agent_logs", [])
    if agent_logs:
        elements.append(Paragraph("ANALISI HERION AI", section_style))
        for log in agent_logs:
            if log.get("status") == "completed" and log.get("output_data"):
                elements.append(Paragraph(f'<font color="#0F4C5C"><b>{log.get("agent_name", "Agente")}</b></font>', body_style))
                output_text = str(log.get("output_data", ""))[:2000].replace('\n', '<br/>')
                output_data = [[Paragraph(output_text, ai_style)]]
                output_table = Table(output_data, colWidths=[470])
                output_table.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), HERION_LIGHT_GRAY), ('BOX', (0, 0), (-1, -1), 1, HERION_BORDER), ('LEFTPADDING', (0, 0), (-1, -1), 12), ('RIGHTPADDING', (0, 0), (-1, -1), 12), ('TOPPADDING', (0, 0), (-1, -1), 10), ('BOTTOMPADDING', (0, 0), (-1, -1), 10)]))
                elements.append(output_table)
                elements.append(Spacer(1, 15))

    elements.append(Spacer(1, 30))
    elements.append(HRFlowable(width="100%", thickness=1, color=HERION_BORDER, spaceBefore=10, spaceAfter=10))
    elements.append(Paragraph(
        f"Documento generato automaticamente da Herion - Precision. Control. Confidence.<br/>"
        f"Questo documento e stato creato il {datetime.now().strftime('%d/%m/%Y alle %H:%M')} e ha valore informativo.<br/>"
        f"Riferimento: {practice.get('id', 'N/A')}", footer_style))

    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes

@api_router.get("/practices/{practice_id}/pdf")
async def download_practice_pdf(practice_id: str, user: dict = Depends(get_current_user)):
    practice = await db.practices.find_one({"id": practice_id, "user_id": user["id"]}, {"_id": 0})
    if not practice:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    if practice.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Il PDF e disponibile solo per pratiche completate")

    try:
        pdf_bytes = generate_practice_pdf(practice, user)
        await log_activity(user["id"], "document", "pdf_downloaded", {"practice_id": practice_id, "practice_type": practice.get("practice_type_label")})
        filename = f"Herion_Pratica_{practice.get('practice_type', 'report')}_{practice_id[:8]}.pdf"
        return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}"'})
    except Exception as e:
        logger.error(f"PDF generation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Errore nella generazione del PDF")

# ========================
# ROOT ENDPOINT
# ========================

@api_router.get("/")
async def root():
    return {"message": "Herion API - Precision. Control. Confidence.", "version": "2.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include the router
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
    await db.users.create_index("email", unique=True)
    await db.practices.create_index([("user_id", 1), ("created_at", -1)])
    await db.documents.create_index([("practice_id", 1), ("is_deleted", 1)])
    await db.activity_logs.create_index([("user_id", 1), ("timestamp", -1)])
    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.password_reset_tokens.create_index("token")

    try:
        init_storage()
        logger.info("Storage initialized successfully")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@aic.it")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin123!")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "first_name": "Admin",
            "last_name": "Herion",
            "name": "Admin Herion",
            "role": "admin",
            "client_type": "private",
            "country": "IT",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "privacy_consent": True,
            "privacy_consent_date": datetime.now(timezone.utc).isoformat(),
            "terms_consent": True,
            "terms_consent_date": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin user created: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info("Admin password updated")

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
- POST /api/auth/forgot-password - Request password reset
- POST /api/auth/reset-password - Reset password with token
- GET /api/auth/profile - Get user profile
- PUT /api/auth/profile - Update user profile
- PUT /api/auth/change-password - Change password

## Client Types
- private: Privato (no VAT number required)
- freelancer: Libero Professionista (VAT number required)
- company: Azienda (VAT number + company name required)
""")

    logger.info("Herion v2.0 - Precision. Control. Confidence. - started successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
