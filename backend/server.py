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

class PracticeChatRequest(BaseModel):
    question: str

class ReminderCreate(BaseModel):
    title: str
    content: str
    category: str = "platform_updates"
    country: Optional[str] = None
    priority: str = "normal"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    active: bool = True

# ========================
# AUTH ENDPOINTS
# ========================

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    email = user_data.email.lower()

    # Block creator email from public registration
    if email == CREATOR_EMAIL.lower():
        raise HTTPException(status_code=400, detail="Registrazione non disponibile per questo account")

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
        "is_creator": user.get("is_creator", False),
        "creator_uuid": user.get("creator_uuid"),
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
# PRACTICE CATALOG
# ========================

@api_router.get("/catalog")
async def get_practice_catalog(user: dict = Depends(get_current_user)):
    entries = await db.practice_catalog.find({}, {"_id": 0}).to_list(200)
    return entries

@api_router.get("/catalog/{practice_id}")
async def get_catalog_entry(practice_id: str, user: dict = Depends(get_current_user)):
    entry = await db.practice_catalog.find_one({"practice_id": practice_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Servizio non trovato nel catalogo")
    return entry

# ========================
# AUTHORITY REGISTRY
# ========================

@api_router.get("/registry")
async def get_authority_registry(user: dict = Depends(get_current_user)):
    entries = await db.authority_registry.find({}, {"_id": 0}).to_list(200)
    return entries

@api_router.get("/registry/{registry_id}")
async def get_registry_entry(registry_id: str, user: dict = Depends(get_current_user)):
    entry = await db.authority_registry.find_one({"registry_id": registry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Ente non trovato nel registro")
    return entry

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
        "status": "draft",
        "status_label": "Bozza",
        "documents": [],
        "agent_logs": [],
        "orchestration_result": None,
        "risk_level": None,
        "delegation_status": None,
        "delegation_info": {"status": "not_required", "label": "Non richiesta"},
        "approval_snapshot_id": None,
        "approved_at": None,
        "submitted_at": None,
        "completed_at": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    await db.practices.insert_one(practice_doc)

    await add_timeline_event(practice_doc["id"], user["id"], "practice_created", {
        "practice_type": practice.practice_type,
        "client_name": practice.client_name
    })

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
    # Admin/creator can view any practice
    is_admin = user.get("role") in ["admin", "creator"]
    query = {"id": practice_id} if is_admin else {"id": practice_id, "user_id": user["id"]}
    practice = await db.practices.find_one(query, {"_id": 0})
    if not practice:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    return practice

@api_router.put("/practices/{practice_id}")
async def update_practice(practice_id: str, update: PracticeUpdate, user: dict = Depends(get_current_user)):
    # Admin/creator can update any practice
    is_admin = user.get("role") in ["admin", "creator"]
    query = {"id": practice_id} if is_admin else {"id": practice_id, "user_id": user["id"]}
    practice = await db.practices.find_one(query)
    if not practice:
        raise HTTPException(status_code=404, detail="Pratica non trovata")

    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if update.description:
        update_data["description"] = update.description
    if update.status:
        update_data["status"] = update.status
        update_data["status_label"] = STATUS_LABELS.get(update.status, update.status)
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
    # Admin/creator can view any practice documents
    is_admin = user.get("role") in ["admin", "creator"]
    query = {"practice_id": practice_id, "is_deleted": False}
    if not is_admin:
        query["user_id"] = user["id"]
    docs = await db.documents.find(query, {"_id": 0}).to_list(100)
    return docs

# ========================
# AI AGENTS ENDPOINTS
# ========================

from emergentintegrations.llm.chat import LlmChat, UserMessage

AGENT_DESCRIPTIONS = {
    "intake": {
        "name": "Raccolta e Classificazione",
        "branded_name": "Herion Intake",
        "icon_key": "intake",
        "description": "Comprende il caso iniziale, classifica la procedura, identifica se personale o aziendale, standard o complesso.",
        "step": 1,
        "system_message": """Sei Herion Intake, l'agente di raccolta e classificazione della piattaforma Herion.
Il tuo compito e comprendere il caso dell'utente e classificarlo correttamente.
Devi determinare:
1. Tipo di procedura richiesta
2. Se e un caso personale o aziendale
3. Se e standard o complesso
4. Quali dati e documenti sono necessari
5. Se c'e bisogno di delega o autorizzazione

Rispondi SEMPRE in italiano. Sii preciso e strutturato.
Format:
- Procedura identificata
- Classificazione (personale/aziendale, standard/complesso)
- Dati necessari
- Documenti richiesti
- Requisiti di delega (se applicabile)
- Livello di rischio iniziale"""
    },
    "ledger": {
        "name": "Contabilita e Dati Finanziari",
        "branded_name": "Herion Ledger",
        "icon_key": "ledger",
        "description": "Gestisce i dati contabili strutturati, calcoli fiscali, importi e dati finanziari della pratica.",
        "step": 2,
        "system_message": """Sei Herion Ledger, l'agente contabile della piattaforma Herion.
Il tuo compito e gestire tutti gli aspetti contabili e finanziari della pratica.
Devi:
1. Strutturare i dati finanziari
2. Verificare importi e calcoli
3. Identificare le voci rilevanti
4. Preparare dati per dichiarazioni
5. Segnalare anomalie contabili

Rispondi SEMPRE in italiano.
Format:
- Dati finanziari strutturati
- Calcoli eseguiti
- Voci rilevanti
- Anomalie (se presenti)
- Note contabili"""
    },
    "compliance": {
        "name": "Conformita Normativa",
        "branded_name": "Herion Compliance",
        "icon_key": "compliance",
        "description": "Verifica la conformita alle normative fiscali del paese, controlla coerenza e segnala rischi normativi.",
        "step": 3,
        "system_message": """Sei Herion Compliance, l'agente di conformita della piattaforma Herion.
Il tuo compito e verificare che la pratica rispetti le normative applicabili.
Devi:
1. Identificare le normative applicabili
2. Verificare la conformita dei dati
3. Controllare coerenza tra documenti
4. Segnalare rischi normativi
5. Indicare adempimenti obbligatori

Rispondi SEMPRE in italiano.
Format:
- Normative applicabili
- Stato conformita
- Rischi identificati
- Adempimenti necessari
- Raccomandazioni
- Livello di rischio (basso/medio/alto)"""
    },
    "documents": {
        "name": "Preparazione Documenti",
        "branded_name": "Herion Documents",
        "icon_key": "documents",
        "description": "Prepara, verifica completezza e organizza la documentazione necessaria per la procedura.",
        "step": 4,
        "system_message": """Sei Herion Documents, l'agente documentale della piattaforma Herion.
Il tuo compito e gestire tutta la documentazione della pratica.
Devi:
1. Elencare documenti necessari
2. Verificare completezza
3. Identificare documenti mancanti
4. Preparare bozze e sintesi
5. Organizzare per categoria

Rispondi SEMPRE in italiano.
Format:
- Documenti presenti
- Documenti mancanti
- Stato completezza
- Bozze preparate
- Azioni necessarie"""
    },
    "delegate": {
        "name": "Delega e Autorizzazioni",
        "branded_name": "Herion Delegate",
        "icon_key": "delegate",
        "description": "Verifica se servono deleghe o autorizzazioni, controlla canali ufficiali e stato del mandato.",
        "step": 5,
        "system_message": """Sei Herion Delegate, l'agente di delega della piattaforma Herion.
Il tuo compito e verificare gli aspetti di delega e autorizzazione.
Devi determinare:
1. Se la pratica richiede delega
2. Se la delega e completa
3. Se i canali ufficiali sono disponibili
4. Se la piattaforma puo procedere per conto dell'utente
5. Se serve conferma aggiuntiva

Rispondi SEMPRE in italiano.
Possibili esiti:
- Autorizzato
- Parzialmente autorizzato
- Delega mancante
- Canale di contatto mancante
- In attesa di conferma utente

Format:
- Stato delega
- Dettagli
- Canali disponibili
- Azione richiesta"""
    },
    "deadline": {
        "name": "Scadenze e Tempistiche",
        "branded_name": "Herion Deadline",
        "icon_key": "deadline",
        "description": "Monitora scadenze, finestre di presentazione, tempistiche procedurali e rischi legati al tempo.",
        "step": 6,
        "system_message": """Sei Herion Deadline, l'agente di monitoraggio scadenze della piattaforma Herion.
Il tuo compito e monitorare tutte le scadenze e tempistiche rilevanti per la pratica.
Devi determinare:
1. Scadenze legali o procedurali applicabili
2. Finestre di presentazione disponibili
3. Tempistiche raccomandate
4. Rischi legati a ritardi
5. Promemoria necessari

Distingui sempre tra:
- SCADENZE RIGIDE: conseguenze, sanzioni o invalidita se mancate
- PROMEMORIA SOFT: suggerimenti organizzativi senza conseguenze dirette
- SCADENZE OPERATIVE: attese del sistema (approvazione, documenti, deleghe)

Rispondi SEMPRE in italiano.
Format:
- Scadenze identificate (con livello di certezza)
- Urgenza (lontana/prossima/urgente/scaduta)
- Azioni richieste prima della scadenza
- Rischi in caso di ritardo
- Promemoria raccomandati
- Stato temporale complessivo"""
    },
    "flow": {
        "name": "Gestione Flusso",
        "branded_name": "Herion Flow",
        "icon_key": "flow",
        "description": "Gestisce la progressione del flusso di lavoro, identifica blocchi e determina i prossimi passi.",
        "step": 7,
        "system_message": """Sei Herion Flow, l'agente di gestione flusso della piattaforma Herion.
Il tuo compito e gestire la progressione della pratica.
Devi determinare:
1. Step corrente
2. Step completati
3. Blocchi presenti
4. Prossima azione necessaria
5. Se si puo procedere

Rispondi SEMPRE in italiano.
Possibili esiti:
- Pronto a continuare
- Bloccato
- In attesa caricamento documento
- In attesa input esterno
- In attesa autorizzazione

Format:
- Step corrente
- Passi completati
- Blocchi
- Prossima azione
- Stato prontezza"""
    },
    "monitor": {
        "name": "Monitoraggio e Promemoria",
        "branded_name": "Herion Monitor",
        "icon_key": "monitor",
        "description": "Traccia lo stato, genera promemoria, identifica scadenze e suggerisce le prossime azioni.",
        "step": 8,
        "system_message": """Sei Herion Monitor, l'agente di monitoraggio della piattaforma Herion.
Il tuo compito e tracciare lo stato della pratica e generare promemoria.
Devi:
1. Riassumere lo stato attuale
2. Identificare scadenze
3. Suggerire prossime azioni
4. Segnalare ritardi
5. Monitorare avanzamento

Rispondi SEMPRE in italiano.
Format:
- Stato attuale
- Scadenze
- Promemoria
- Prossime azioni
- Avvertimenti"""
    },
    "advisor": {
        "name": "Spiegazione Finale",
        "branded_name": "Herion Advisor",
        "icon_key": "advisor",
        "description": "Spiega chiaramente all'utente il risultato, lo stato e i prossimi passi con linguaggio semplice.",
        "step": 9,
        "system_message": """Sei Herion Advisor, l'agente di comunicazione della piattaforma Herion.
Il tuo compito e spiegare all'utente in modo chiaro e semplice.
La tua risposta DEVE includere:
1. Problema compreso
2. Tipo di procedura
3. Dati/documenti mancanti
4. Flusso passo-passo
5. Errori da evitare
6. Esito atteso
7. Riepilogo con livello di rischio

Rispondi SEMPRE in italiano con linguaggio semplice.
Evita termini tecnici quando possibile. Sii rassicurante ma preciso."""
    },
    "research": {
        "name": "Ricerca e Verifica Fonti",
        "branded_name": "Herion Research",
        "icon_key": "research",
        "description": "Ricerca, verifica e struttura le fonti ufficiali necessarie per la corretta gestione della pratica.",
        "step": 10,
        "system_message": """Sei Herion Research, l'agente di ricerca della piattaforma Herion.
Il tuo compito e ricercare, verificare e strutturare le informazioni ufficiali necessarie per la pratica.
Devi determinare:
1. Se la pratica richiesta e supportata e da fonti ufficiali note
2. Quali sono le fonti ufficiali rilevanti (portali istituzionali, enti, normative)
3. Quali modelli, istruzioni e note procedurali servono
4. Se servono canali specifici (email, PEC, portale ufficiale, solo preparazione)
5. Scadenze e tempistiche rilevanti dove disponibili
6. Segnalare incertezze, ambiguita o mancanza di fonti chiare

Priorita fonti:
- Portali enti fiscali ufficiali
- Istituzioni previdenziali / pubbliche
- Portali camerali e registri
- Fonti normative EU dove rilevante

Non inventare MAI procedure, moduli, scadenze o canali.
Se le fonti non sono sufficientemente chiare, segnalalo esplicitamente.

Rispondi SEMPRE in italiano.
Format:
- Supporto: supportato / parzialmente supportato / non supportato
- Fonti ufficiali identificate
- Modelli o documenti rilevanti
- Canale suggerito
- Note su scadenze se disponibili
- Note su incertezze
- Livello di confidenza"""
    },
    "routing": {
        "name": "Canale e Destinazione",
        "branded_name": "Herion Routing",
        "icon_key": "routing",
        "description": "Determina il canale di comunicazione e il destinatario corretto per ogni pratica.",
        "step": 11,
        "system_message": """Sei Herion Routing, l'agente di routing della piattaforma Herion.
Il tuo compito e determinare il canale e il destinatario corretti per ogni pratica.

Canali disponibili:
- email: comunicazioni a basso rischio, promemoria, invio documenti preliminari
- PEC: comunicazioni formali obbligatorie (specifico Italia)
- portale_ufficiale: procedure strutturate su portali istituzionali
- solo_preparazione: raccolta dati e documenti senza invio
- escalation: casi ad alto rischio o ambigui

Input di routing:
- Tipo procedura
- Tipo utente
- Paese
- Livello di rischio
- Stato delega
- Completezza documenti
- Disponibilita canale

Regole:
- Non trattare l'email come canale universale
- Non auto-inviare casi poco chiari o rischiosi
- Bloccare il routing se documenti mancanti o delega assente
- Verificare sempre che il destinatario sia supportato dal registro enti

Rispondi SEMPRE in italiano.
Format:
- Canale selezionato
- Destinatario selezionato
- Motivazione
- Elementi mancanti
- Se l'invio e consentito
- Prossimo passo"""
    }
}

# Father Agent system prompt - supreme orchestrator
FATHER_AGENT_PROMPT = """Sei Herion Father Agent, il supervisore supremo della piattaforma Herion.
Sei il genitore di tutti gli agenti. Il tuo ruolo e:
1. Supervisionare tutti gli agenti specializzati continuamente
2. Coordinare l'orchestrazione completa
3. Rilevare fallimenti, anomalie, interruzioni, stati bloccati
4. Verificare che il sistema stia progredendo correttamente
5. Valutare il livello di rischio complessivo (basso/medio/alto)
6. Determinare lo stato della delega
7. Identificare dati o documenti mancanti
8. Preparare il riepilogo per l'approvazione dell'utente
9. Bloccare l'esecuzione se il rischio e troppo alto

Gestisci un team di 11 agenti specializzati:
- Herion Intake: comprensione e classificazione del caso
- Herion Ledger: dati contabili e finanziari
- Herion Compliance: conformita normativa
- Herion Documents: preparazione e verifica documenti
- Herion Delegate: delega e autorizzazioni
- Herion Deadline: scadenze e tempistiche
- Herion Flow: gestione flusso di lavoro
- Herion Monitor: monitoraggio e promemoria
- Herion Advisor: spiegazione finale all'utente
- Herion Research: ricerca e verifica fonti ufficiali
- Herion Routing: canale e destinazione

Regole assolute:
- MAI eseguire senza approvazione esplicita dell'utente
- Ogni decisione deve essere trasparente e motivata
- Se il caso e incompleto, ambiguo, multi-paese o ad alto rischio: prepara checklist ed escalation
- MAI nascondere incidenti o errori
- MAI modificare regole strategiche senza autorizzazione del Creator

Nella tua risposta finale, DEVI includere queste sezioni strutturate:

## RIEPILOGO PRATICA
[Riassunto del caso]

## LIVELLO DI RISCHIO
[basso/medio/alto] - [motivazione]

## STATO DELEGA
[autorizzato/parzialmente autorizzato/delega mancante/non necessaria]

## DATI E DOCUMENTI
[Presenti / Mancanti]

## CANALE E DESTINATARIO
[Canale selezionato e destinatario]

## AZIONE RACCOMANDATA
[Cosa succede dopo l'approvazione]

## AVVERTENZE
[Rischi, scadenze critiche, note importanti]

IMPORTANTE: Includi OBBLIGATORIAMENTE questi tag nel testo:
- Per il rischio: [RISCHIO_BASSO] oppure [RISCHIO_MEDIO] oppure [RISCHIO_ALTO]
- Per la delega: [DELEGA_AUTORIZZATA] oppure [DELEGA_PARZIALE] oppure [DELEGA_MANCANTE] oppure [DELEGA_NON_NECESSARIA]

Rispondi SEMPRE in italiano con tono professionale e rassicurante."""

# Creator bootstrap configuration - protected, non-public
CREATOR_EMAIL = "gegexia94@gmail.com"
CREATOR_NAME = "Gege-Xia"
CREATOR_UUID = "HERION-CREATOR-001"
STATUS_LABELS = {
    "draft": "Bozza",
    "pending": "In Attesa",
    "in_progress": "In Elaborazione",
    "processing": "In Elaborazione",
    "waiting_approval": "In Attesa di Approvazione",
    "approved": "Approvata",
    "submitted": "Inviata",
    "completed": "Completata",
    "blocked": "Bloccata",
    "escalated": "Escalation",
    "rejected": "Rifiutata",
}

DELEGATION_STATUS = {
    "authorized": "Autorizzato",
    "partially_authorized": "Parzialmente autorizzato",
    "missing_delegation": "Delega mancante",
    "missing_channel": "Canale di contatto mancante",
    "waiting_confirmation": "In attesa conferma utente",
    "not_required": "Non necessaria"
}

RISK_LEVELS = {
    "low": {"label": "Basso", "color": "emerald", "action": "proceed"},
    "medium": {"label": "Medio", "color": "amber", "action": "review"},
    "high": {"label": "Alto", "color": "red", "action": "escalate"}
}

# Ordered specialist pipeline for controlled execution
SPECIALIST_PIPELINE = ["intake", "ledger", "compliance", "documents", "delegate", "deadline", "flow", "routing", "research", "monitor", "advisor"]

# Timeline event types
TIMELINE_EVENTS = {
    "practice_created": "Pratica creata",
    "orchestration_started": "Analisi avviata",
    "intake_completed": "Raccolta completata",
    "ledger_completed": "Analisi contabile completata",
    "compliance_completed": "Verifica conformita completata",
    "documents_completed": "Verifica documenti completata",
    "delegate_completed": "Verifica delega completata",
    "deadline_completed": "Analisi scadenze completata",
    "flow_completed": "Analisi flusso completata",
    "monitor_completed": "Monitoraggio completato",
    "advisor_completed": "Spiegazione finale completata",
    "draft_prepared": "Bozza preparata",
    "risk_evaluated": "Rischio valutato",
    "documents_requested": "Documenti richiesti",
    "documents_uploaded": "Documenti caricati",
    "waiting_approval": "In attesa di approvazione",
    "approved": "Approvata dall'utente",
    "submitted": "Inviata",
    "completed": "Completata",
    "blocked": "Bloccata",
    "escalated": "Escalation attivata",
    "status_changed": "Stato aggiornato",
    "delegation_requested": "Delega richiesta",
    "delegation_uploaded": "Documento delega caricato",
    "delegation_verified": "Delega verificata",
    "delegation_rejected": "Delega rifiutata",
    "delegation_reset": "Delega reimpostata",
    "submission_failed": "Invio fallito",
    "submission_retried": "Invio ritentato",
}

async def add_timeline_event(practice_id: str, user_id: str, event_type: str, details: dict = None):
    event = {
        "id": str(uuid.uuid4()),
        "practice_id": practice_id,
        "user_id": user_id,
        "event_type": event_type,
        "event_label": TIMELINE_EVENTS.get(event_type, event_type),
        "details": details or {},
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.practice_timeline.insert_one(event)
    return event

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
        "branded_name": agent_config["branded_name"],
        "icon_key": agent_config["icon_key"],
        "step": agent_config["step"],
        "input_data": action.input_data,
        "output_data": None,
        "status": "processing",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
        "explanation": f"{agent_config['branded_name']} sta elaborando la richiesta."
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
            "branded_name": agent_config["branded_name"],
            "icon_key": agent_config["icon_key"],
            "step": agent_config["step"],
            "input": action.input_data,
            "output": response,
            "log_id": agent_log_id,
            "explanation": f"{agent_config['branded_name']} ha elaborato la richiesta. Tutti i passaggi sono registrati nel log."
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
async def get_agents_info(user: dict = Depends(get_current_user)):
    is_admin = user.get("role") == "admin"

    agents = []
    for agent_type, config in AGENT_DESCRIPTIONS.items():
        agent_info = {
            "type": agent_type,
            "name": config["name"],
            "branded_name": config["branded_name"],
            "icon_key": config["icon_key"],
            "description": config["description"],
            "step": config["step"],
        }
        if is_admin:
            agent_info["system_prompt"] = config["system_message"]
        agents.append(agent_info)

    result = {
        "agents": agents,
        "admin_agent": {
            "name": "Herion Father Agent",
            "icon_key": "father",
            "description": "Supervisore supremo: coordina tutti gli agenti, valuta il rischio, supervisiona il sistema e prepara il riepilogo per l'approvazione."
        },
        "workflow_steps": SPECIALIST_PIPELINE,
        "total_agents": len(AGENT_DESCRIPTIONS) + 1,
        "transparency_note": "Tutti gli agenti AI operano in modo trasparente all'interno della piattaforma di esecuzione controllata. Ogni azione viene registrata nel registro della pratica."
    }

    if is_admin:
        result["admin_prompt"] = FATHER_AGENT_PROMPT

    return result

@api_router.post("/agents/orchestrate")
async def orchestrate_agents(req: OrchestrationRequest, user: dict = Depends(get_current_user)):
    practice = await db.practices.find_one({"id": req.practice_id, "user_id": user["id"]})
    if not practice:
        raise HTTPException(status_code=404, detail="Pratica non trovata")

    if practice.get("status") in ["approved", "submitted", "completed"]:
        raise HTTPException(status_code=400, detail="Questa pratica e gia stata approvata o completata")

    orchestration_id = str(uuid.uuid4())
    results = []
    previous_outputs = {}

    await db.practices.update_one(
        {"id": req.practice_id},
        {"$set": {"status": "in_progress", "status_label": "In Elaborazione", "agent_logs": [], "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    await add_timeline_event(req.practice_id, user["id"], "orchestration_started", {
        "orchestration_id": orchestration_id,
        "agents_planned": SPECIALIST_PIPELINE
    })

    await log_activity(user["id"], "orchestration", "orchestration_started", {
        "orchestration_id": orchestration_id, "practice_id": req.practice_id
    })

    for agent_type in SPECIALIST_PIPELINE:
        agent_config = AGENT_DESCRIPTIONS[agent_type]
        agent_log_id = str(uuid.uuid4())

        step_result = {
            "id": agent_log_id,
            "agent_type": agent_type,
            "agent_name": agent_config["name"],
            "branded_name": agent_config["branded_name"],
            "icon_key": agent_config["icon_key"],
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
                session_id=f"orch-{orchestration_id}-{agent_type}-{agent_log_id}",
                system_message=agent_config["system_message"]
            ).with_model("openai", "gpt-5.2")

            practice_context = {
                "tipo_pratica": practice.get("practice_type_label"),
                "cliente": practice.get("client_name"),
                "tipo_cliente": CLIENT_TYPES.get(practice.get("client_type", ""), ""),
                "descrizione": practice.get("description"),
                "codice_fiscale": practice.get("fiscal_code"),
                "partita_iva": practice.get("vat_number"),
                "paese": practice.get("country", "IT"),
                "documenti_caricati": len(practice.get("documents", [])),
                "dati_aggiuntivi": practice.get("additional_data", {}),
            }

            context_msg = f"Contesto pratica:\n{practice_context}\n\nRichiesta: {req.query}"

            if previous_outputs:
                prev_summary = "\n".join([f"- {k}: {v[:500]}" for k, v in previous_outputs.items()])
                context_msg += f"\n\nOutput agenti precedenti:\n{prev_summary}"

            step_result["input_summary"] = context_msg[:300]

            user_message = UserMessage(text=context_msg)
            response = await chat.send_message(user_message)

            step_result["output_data"] = response
            step_result["status"] = "completed"
            step_result["completed_at"] = datetime.now(timezone.utc).isoformat()
            previous_outputs[agent_config["branded_name"]] = response

            await add_timeline_event(req.practice_id, user["id"], f"{agent_type}_completed", {
                "orchestration_id": orchestration_id,
                "agent": agent_config["branded_name"],
                "step": agent_config["step"]
            })

        except Exception as e:
            logger.error(f"Orchestration step {agent_type} error: {str(e)}")
            step_result["output_data"] = f"Errore: {str(e)}"
            step_result["status"] = "failed"
            step_result["completed_at"] = datetime.now(timezone.utc).isoformat()

        results.append(step_result)

    # Herion Admin coordination and risk assessment
    admin_summary = ""
    risk_level = "medium"
    delegation_status = "not_required"
    intended_recipient = "Non specificato"
    expected_outcome = ""

    try:
        admin_chat = LlmChat(
            api_key=EMERGENT_KEY,
            session_id=f"orch-{orchestration_id}-admin",
            system_message=FATHER_AGENT_PROMPT
        ).with_model("openai", "gpt-5.2")

        all_outputs = "\n\n".join([
            f"### {r['branded_name']} (Step {r['step']}):\n{r.get('output_data', 'Nessun output')}"
            for r in results
        ])

        admin_message = f"""Tutti i 9 agenti specializzati hanno completato la loro analisi.

Contesto pratica:
- Tipo: {practice.get('practice_type_label')}
- Cliente: {practice.get('client_name')}
- Tipo cliente: {CLIENT_TYPES.get(practice.get('client_type', ''), '')}
- Paese: {practice.get('country', 'IT')}
- Documenti caricati: {len(practice.get('documents', []))}
- Codice Fiscale: {practice.get('fiscal_code', 'Non fornito')}
- Partita IVA: {practice.get('vat_number', 'Non fornita')}

Output di tutti gli agenti:
{all_outputs}

Prepara il tuo riepilogo coordinato completo per l'approvazione dell'utente."""

        admin_response = await admin_chat.send_message(UserMessage(text=admin_message))
        admin_summary = admin_response

        if "[RISCHIO_ALTO]" in admin_response:
            risk_level = "high"
        elif "[RISCHIO_BASSO]" in admin_response:
            risk_level = "low"
        else:
            risk_level = "medium"

        if "[DELEGA_AUTORIZZATA]" in admin_response:
            delegation_status = "authorized"
        elif "[DELEGA_PARZIALE]" in admin_response:
            delegation_status = "partially_authorized"
        elif "[DELEGA_MANCANTE]" in admin_response:
            delegation_status = "missing_delegation"
        else:
            delegation_status = "not_required"

    except Exception as e:
        logger.error(f"Admin coordination error: {str(e)}")
        admin_summary = f"Errore nella coordinazione: {str(e)}"

    await add_timeline_event(req.practice_id, user["id"], "risk_evaluated", {
        "risk_level": risk_level,
        "delegation_status": delegation_status
    })

    all_completed = all(r["status"] == "completed" for r in results)

    if risk_level == "high":
        final_status = "escalated"
        final_label = STATUS_LABELS["escalated"]
        await add_timeline_event(req.practice_id, user["id"], "escalated", {
            "reason": "Livello di rischio alto",
            "risk_level": risk_level
        })
    elif not all_completed:
        final_status = "blocked"
        final_label = STATUS_LABELS["blocked"]
        failed_agents = [r["branded_name"] for r in results if r["status"] != "completed"]
        await add_timeline_event(req.practice_id, user["id"], "blocked", {
            "reason": "Agenti con errori",
            "failed_agents": failed_agents
        })
    elif delegation_status == "missing_delegation":
        final_status = "blocked"
        final_label = STATUS_LABELS["blocked"]
        await add_timeline_event(req.practice_id, user["id"], "blocked", {
            "reason": "Delega mancante"
        })
    else:
        final_status = "waiting_approval"
        final_label = STATUS_LABELS["waiting_approval"]
        await add_timeline_event(req.practice_id, user["id"], "waiting_approval", {
            "risk_level": risk_level,
            "delegation_status": delegation_status
        })

    orchestration_result = {
        "id": orchestration_id,
        "steps": results,
        "admin_summary": admin_summary,
        "risk_level": risk_level,
        "risk_label": RISK_LEVELS.get(risk_level, {}).get("label", risk_level),
        "delegation_status": delegation_status,
        "delegation_label": DELEGATION_STATUS.get(delegation_status, delegation_status),
        "intended_recipient": intended_recipient,
        "expected_outcome": expected_outcome,
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "agents_used": [r["branded_name"] for r in results],
        "final_status": final_status,
    }

    await db.practices.update_one(
        {"id": req.practice_id},
        {"$set": {
            "orchestration_result": orchestration_result,
            "status": final_status,
            "status_label": final_label,
            "risk_level": risk_level,
            "delegation_status": delegation_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    for r in results:
        agent_log_entry = {
            "id": r["id"],
            "agent_type": r["agent_type"],
            "agent_name": r["agent_name"],
            "branded_name": r["branded_name"],
            "icon_key": r["icon_key"],
            "step": r["step"],
            "input_data": {"orchestration_id": orchestration_id, "query": req.query},
            "output_data": r["output_data"],
            "status": r["status"],
            "started_at": r["started_at"],
            "completed_at": r["completed_at"],
            "explanation": f"Esecuzione controllata - Step {r['step']}: {r['branded_name']}"
        }
        await db.practices.update_one({"id": req.practice_id}, {"$push": {"agent_logs": agent_log_entry}})

    await log_activity(user["id"], "orchestration", "orchestration_completed", {
        "orchestration_id": orchestration_id,
        "practice_id": req.practice_id,
        "final_status": final_status,
        "risk_level": risk_level
    })

    return orchestration_result

# ========================
# PRACTICE APPROVAL
# ========================

@api_router.post("/practices/{practice_id}/approve")
async def approve_practice(practice_id: str, user: dict = Depends(get_current_user)):
    practice = await db.practices.find_one({"id": practice_id, "user_id": user["id"]}, {"_id": 0})
    if not practice:
        raise HTTPException(status_code=404, detail="Pratica non trovata")

    if practice.get("status") != "waiting_approval":
        raise HTTPException(status_code=400, detail="La pratica non e in attesa di approvazione")

    orchestration = practice.get("orchestration_result") or {}
    now = datetime.now(timezone.utc).isoformat()

    approval_snapshot = {
        "id": str(uuid.uuid4()),
        "practice_id": practice_id,
        "user_id": user["id"],
        "summary_shown": orchestration.get("admin_summary", ""),
        "risk_level": orchestration.get("risk_level", "unknown"),
        "delegation_status": orchestration.get("delegation_status", "unknown"),
        "data_used": {
            "practice_type": practice.get("practice_type_label"),
            "client_name": practice.get("client_name"),
            "client_type": practice.get("client_type_label"),
            "fiscal_code": practice.get("fiscal_code"),
            "vat_number": practice.get("vat_number"),
            "country": practice.get("country"),
            "description": practice.get("description"),
        },
        "documents_included": practice.get("documents", []),
        "intended_recipient": orchestration.get("intended_recipient", "Non specificato"),
        "expected_outcome": orchestration.get("expected_outcome", ""),
        "agents_executed": orchestration.get("agents_used", []),
        "approved_at": now,
        "approval_action": "explicit_user_approval",
        "approval_metadata": {
            "user_email": user.get("email"),
            "user_name": user.get("name"),
        }
    }

    await db.approval_snapshots.insert_one(approval_snapshot)

    await db.practices.update_one(
        {"id": practice_id},
        {"$set": {
            "status": "approved",
            "status_label": STATUS_LABELS["approved"],
            "approval_snapshot_id": approval_snapshot["id"],
            "approved_at": now,
            "updated_at": now
        }}
    )
    await add_timeline_event(practice_id, user["id"], "approved", {
        "approval_snapshot_id": approval_snapshot["id"],
        "risk_level": orchestration.get("risk_level")
    })

    submitted_at = datetime.now(timezone.utc).isoformat()
    await db.practices.update_one(
        {"id": practice_id},
        {"$set": {
            "status": "submitted",
            "status_label": STATUS_LABELS["submitted"],
            "submitted_at": submitted_at,
            "updated_at": submitted_at
        }}
    )
    await add_timeline_event(practice_id, user["id"], "submitted", {
        "submission_type": "simulated",
        "note": "Invio simulato dalla piattaforma"
    })

    completed_at = datetime.now(timezone.utc).isoformat()
    await db.practices.update_one(
        {"id": practice_id},
        {"$set": {
            "status": "completed",
            "status_label": STATUS_LABELS["completed"],
            "completed_at": completed_at,
            "updated_at": completed_at
        }}
    )
    await add_timeline_event(practice_id, user["id"], "completed", {
        "note": "Pratica completata con successo"
    })

    await log_activity(user["id"], "practice", "practice_approved", {
        "practice_id": practice_id,
        "approval_snapshot_id": approval_snapshot["id"]
    })

    await create_notification(user["id"], "Pratica Approvata e Completata",
        f"La pratica '{practice.get('practice_type_label')}' e stata approvata, inviata e completata con successo.", "success")

    approval_snapshot.pop("_id", None)
    return {
        "message": "Pratica approvata, inviata e completata con successo",
        "approval_snapshot": approval_snapshot,
        "final_status": "completed",
        "transitions": ["waiting_approval", "approved", "submitted", "completed"]
    }

# ========================
# PRACTICE TIMELINE
# ========================

@api_router.get("/practices/{practice_id}/timeline")
async def get_practice_timeline(practice_id: str, user: dict = Depends(get_current_user)):
    # Admin/creator can view any practice timeline
    is_admin = user.get("role") in ["admin", "creator"]
    query = {"id": practice_id} if is_admin else {"id": practice_id, "user_id": user["id"]}
    practice = await db.practices.find_one(query)
    if not practice:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    events = await db.practice_timeline.find(
        {"practice_id": practice_id},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(200)
    return events

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
    # Admin/creator can view any practice activity logs
    is_admin = user.get("role") in ["admin", "creator"]
    query = {"details.practice_id": practice_id}
    if not is_admin:
        query["user_id"] = user["id"]
    logs = await db.activity_logs.find(query, {"_id": 0}).sort("timestamp", -1).to_list(100)
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
# DELEGATION SYSTEM
# ========================

DELEGATION_STATUSES = {
    "not_required": "Non richiesta",
    "required": "Richiesta",
    "requested": "In attesa di delega",
    "incomplete": "Incompleta",
    "under_review": "In revisione",
    "valid": "Valida",
    "expired": "Scaduta",
    "rejected": "Rifiutata",
    "blocked": "Bloccata"
}

class DelegationUpdate(BaseModel):
    action: str  # request, upload_confirm, verify, reject, reset
    notes: Optional[str] = None
    delegation_type: Optional[str] = None

@api_router.put("/practices/{practice_id}/delegation")
async def update_delegation(practice_id: str, update: DelegationUpdate, user: dict = Depends(get_current_user)):
    # Admin/creator can update any practice delegation
    is_admin = user.get("role") in ["admin", "creator"]
    query = {"id": practice_id} if is_admin else {"id": practice_id, "user_id": user["id"]}
    practice = await db.practices.find_one(query)
    if not practice:
        raise HTTPException(status_code=404, detail="Pratica non trovata")

    now = datetime.now(timezone.utc).isoformat()
    delegation = practice.get("delegation_info") or {}
    action = update.action

    if action == "request":
        delegation["status"] = "requested"
        delegation["requested_at"] = now
        delegation["delegation_type"] = update.delegation_type or delegation.get("delegation_type", "general")
        event_type = "delegation_requested"
    elif action == "upload_confirm":
        delegation["status"] = "under_review"
        delegation["uploaded_at"] = now
        event_type = "delegation_uploaded"
    elif action == "verify":
        delegation["status"] = "valid"
        delegation["verified_at"] = now
        delegation["verified_by"] = user.get("email")
        event_type = "delegation_verified"
    elif action == "reject":
        delegation["status"] = "rejected"
        delegation["rejected_at"] = now
        delegation["rejected_by"] = user.get("email")
        delegation["rejection_reason"] = update.notes
        event_type = "delegation_rejected"
    elif action == "reset":
        delegation["status"] = "required"
        event_type = "delegation_reset"
    else:
        raise HTTPException(status_code=400, detail="Azione di delega non valida")

    delegation["notes"] = update.notes or delegation.get("notes", "")
    delegation["updated_at"] = now
    delegation["label"] = DELEGATION_STATUSES.get(delegation["status"], delegation["status"])

    await db.practices.update_one({"id": practice_id}, {"$set": {
        "delegation_info": delegation,
        "delegation_status": delegation["status"],
        "updated_at": now
    }})
    await add_timeline_event(practice_id, user["id"], event_type, {
        "delegation_status": delegation["status"],
        "notes": update.notes
    })
    await log_activity(user["id"], "delegation", event_type, {"practice_id": practice_id})

    return {"delegation": delegation, "message": f"Delega aggiornata: {delegation['label']}"}

# ========================
# READINESS ENGINE
# ========================

async def calculate_readiness(practice: dict) -> dict:
    """Calculate submission readiness for a practice."""
    blockers = []
    warnings = []
    missing_items = []

    practice_type = practice.get("practice_type")
    status = practice.get("status", "draft")

    # Look up catalog entry for requirements
    catalog_entry = await db.practice_catalog.find_one(
        {"practice_id": practice_type}, {"_id": 0}
    ) if practice_type else None

    # Check required documents
    docs = await db.documents.find(
        {"practice_id": practice["id"], "is_deleted": False}, {"_id": 0}
    ).to_list(50)
    doc_categories = set(d.get("category") for d in docs)

    if catalog_entry and catalog_entry.get("required_documents"):
        for req_doc in catalog_entry["required_documents"]:
            if req_doc not in doc_categories:
                blockers.append(f"Documento mancante: {req_doc.replace('_', ' ')}")
                missing_items.append({"type": "document", "key": req_doc, "label": req_doc.replace("_", " ")})

    # Check data completeness
    if not practice.get("client_name"):
        blockers.append("Nome cliente mancante")
        missing_items.append({"type": "data", "key": "client_name", "label": "Nome cliente"})
    if not practice.get("description"):
        warnings.append("Descrizione mancante")

    # Check delegation
    delegation_required = False
    delegation_valid = True
    if catalog_entry and catalog_entry.get("delegation_required"):
        delegation_required = True
        delegation_info = practice.get("delegation_info") or {}
        d_status = delegation_info.get("status", "not_required")
        if d_status not in ["valid", "not_required"]:
            delegation_valid = False
            blockers.append(f"Delega: {DELEGATION_STATUSES.get(d_status, d_status)}")
            missing_items.append({"type": "delegation", "key": "delegation", "label": "Delega valida"})

    # Check approval
    approval_required = catalog_entry.get("approval_required", False) if catalog_entry else False
    approval_status = "not_required"
    if approval_required:
        if status == "approved":
            approval_status = "approved"
        elif status == "waiting_approval":
            approval_status = "pending"
            warnings.append("In attesa di approvazione")
        elif practice.get("orchestration_result"):
            approval_status = "ready_to_request"
        else:
            approval_status = "not_started"
            blockers.append("Approvazione richiesta ma non ancora avviata")
            missing_items.append({"type": "approval", "key": "approval", "label": "Approvazione utente"})

    # Check routing
    routing_clear = True
    if catalog_entry:
        channel = catalog_entry.get("expected_channel", "preparation_only")
        destination = catalog_entry.get("destination_type", "internal")
        if channel == "official_portal":
            registry_entry = await db.authority_registry.find_one(
                {"related_practices": practice_type}, {"_id": 0}
            )
            if not registry_entry:
                routing_clear = False
                warnings.append("Destinazione nel registro non trovata")
    else:
        routing_clear = False
        warnings.append("Tipo pratica non trovato nel catalogo")

    # Calculate support level
    support_level = catalog_entry.get("support_level", "unknown") if catalog_entry else "unknown"
    if support_level == "not_supported":
        blockers.append("Pratica non supportata dalla piattaforma")

    # Determine readiness state
    is_blocked = len(blockers) > 0
    has_warnings = len(warnings) > 0

    if status in ["completed", "submitted"]:
        readiness_state = "completed" if status == "completed" else "submitted"
    elif status in ["blocked", "escalated", "rejected"]:
        readiness_state = status
    elif is_blocked:
        readiness_state = "not_ready"
    elif status == "waiting_approval":
        readiness_state = "waiting_approval"
    elif status == "approved":
        readiness_state = "ready_to_submit"
    elif practice.get("orchestration_result") and not approval_required:
        readiness_state = "ready_to_submit"
    elif practice.get("orchestration_result") and approval_required:
        readiness_state = "waiting_approval"
    else:
        readiness_state = "in_preparation"

    return {
        "readiness_state": readiness_state,
        "is_ready": readiness_state == "ready_to_submit",
        "blockers": blockers,
        "warnings": warnings,
        "missing_items": missing_items,
        "delegation_required": delegation_required,
        "delegation_valid": delegation_valid,
        "delegation_status": (practice.get("delegation_info") or {}).get("status", "not_required"),
        "approval_required": approval_required,
        "approval_status": approval_status,
        "routing_clear": routing_clear,
        "support_level": support_level,
        "risk_level": practice.get("risk_level") or (catalog_entry.get("risk_level") if catalog_entry else "unknown"),
        "document_count": len(docs),
        "channel": catalog_entry.get("expected_channel", "unknown") if catalog_entry else "unknown",
        "destination_type": catalog_entry.get("destination_type", "unknown") if catalog_entry else "unknown",
    }

@api_router.get("/practices/{practice_id}/readiness")
async def get_practice_readiness(practice_id: str, user: dict = Depends(get_current_user)):
    # Admin/creator can view any practice readiness
    is_admin = user.get("role") in ["admin", "creator"]
    query = {"id": practice_id} if is_admin else {"id": practice_id, "user_id": user["id"]}
    practice = await db.practices.find_one(query, {"_id": 0})
    if not practice:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    readiness = await calculate_readiness(practice)
    return {"practice_id": practice_id, **readiness}

# ========================
# SUBMISSION CENTER
# ========================

READINESS_LABELS = {
    "ready_to_submit": "Pronta per l'invio",
    "waiting_approval": "In attesa di approvazione",
    "not_ready": "Non pronta",
    "in_preparation": "In preparazione",
    "submitted": "Inviata",
    "completed": "Completata",
    "blocked": "Bloccata",
    "escalated": "Escalation",
    "rejected": "Rifiutata",
    "failed_submission": "Invio fallito"
}

@api_router.get("/submission-center")
async def get_submission_center(user: dict = Depends(get_current_user)):
    """Get all practices grouped by submission readiness state."""
    is_admin = user.get("role") in ["admin", "creator"]
    query = {} if is_admin else {"user_id": user["id"]}
    practices = await db.practices.find(query, {"_id": 0}).sort("updated_at", -1).to_list(200)

    sections = {
        "ready_to_submit": [], "waiting_approval": [], "not_ready": [],
        "in_preparation": [], "submitted": [], "completed": [],
        "blocked": [], "escalated": [], "failed_submission": [], "rejected": []
    }

    for p in practices:
        readiness = await calculate_readiness(p)
        state = readiness["readiness_state"]
        entry = {
            "id": p["id"],
            "practice_type": p.get("practice_type"),
            "practice_type_label": p.get("practice_type_label"),
            "client_name": p.get("client_name"),
            "client_type": p.get("client_type"),
            "client_type_label": p.get("client_type_label"),
            "country": p.get("country", "IT"),
            "status": p.get("status"),
            "status_label": p.get("status_label"),
            "risk_level": readiness["risk_level"],
            "support_level": readiness["support_level"],
            "channel": readiness["channel"],
            "destination_type": readiness["destination_type"],
            "approval_status": readiness["approval_status"],
            "delegation_status": readiness["delegation_status"],
            "delegation_required": readiness["delegation_required"],
            "is_ready": readiness["is_ready"],
            "blockers": readiness["blockers"],
            "warnings": readiness["warnings"],
            "missing_items": readiness["missing_items"],
            "document_count": readiness["document_count"],
            "readiness_state": state,
            "readiness_label": READINESS_LABELS.get(state, state),
            "next_action": readiness["blockers"][0] if readiness["blockers"] else (readiness["warnings"][0] if readiness["warnings"] else "Nessuna azione richiesta"),
            "updated_at": p.get("updated_at"),
            "created_at": p.get("created_at"),
        }
        if state in sections:
            sections[state].append(entry)
        else:
            sections.setdefault("not_ready", []).append(entry)

    counts = {k: len(v) for k, v in sections.items()}
    counts["total"] = sum(counts.values())

    return {"sections": sections, "counts": counts}

@api_router.post("/practices/{practice_id}/submit")
async def submit_practice(practice_id: str, user: dict = Depends(get_current_user)):
    """Execute submission with pre-checks."""
    # Admin/creator can submit any practice
    is_admin = user.get("role") in ["admin", "creator"]
    query = {"id": practice_id} if is_admin else {"id": practice_id, "user_id": user["id"]}
    practice = await db.practices.find_one(query, {"_id": 0})
    if not practice:
        raise HTTPException(status_code=404, detail="Pratica non trovata")

    readiness = await calculate_readiness(practice)

    if not readiness["is_ready"]:
        return {
            "success": False,
            "message": "La pratica non e pronta per l'invio",
            "blockers": readiness["blockers"],
            "missing_items": readiness["missing_items"],
            "readiness_state": readiness["readiness_state"]
        }

    now = datetime.now(timezone.utc).isoformat()

    # Record submission
    submission_record = {
        "id": str(uuid.uuid4()),
        "practice_id": practice_id,
        "user_id": user["id"],
        "channel": readiness["channel"],
        "destination_type": readiness["destination_type"],
        "status": "submitted",
        "submitted_at": now,
        "result": None,
        "receipt": None,
        "notes": f"Invio tramite {readiness['channel']}",
    }
    await db.submission_records.insert_one(submission_record)

    await db.practices.update_one({"id": practice_id}, {"$set": {
        "status": "submitted",
        "status_label": STATUS_LABELS.get("submitted", "Inviata"),
        "submitted_at": now,
        "updated_at": now,
        "submission_id": submission_record["id"]
    }})

    await add_timeline_event(practice_id, user["id"], "submitted", {
        "channel": readiness["channel"],
        "destination_type": readiness["destination_type"],
        "submission_id": submission_record["id"]
    })

    # Auto-complete for preparation_only and email channels
    if readiness["channel"] in ["preparation_only", "email"]:
        completed_at = datetime.now(timezone.utc).isoformat()
        await db.practices.update_one({"id": practice_id}, {"$set": {
            "status": "completed",
            "status_label": STATUS_LABELS.get("completed", "Completata"),
            "completed_at": completed_at,
            "updated_at": completed_at
        }})
        await add_timeline_event(practice_id, user["id"], "completed", {
            "note": "Pratica completata con successo"
        })
        submission_record["status"] = "completed"

    await log_activity(user["id"], "submission", "practice_submitted", {"practice_id": practice_id})
    await create_notification(user["id"], "Pratica Inviata",
        f"La pratica '{practice.get('practice_type_label')}' e stata inviata.", "success")

    submission_record.pop("_id", None)
    return {
        "success": True,
        "message": "Pratica inviata con successo",
        "submission": submission_record,
        "final_status": submission_record["status"]
    }

# ========================
# DEADLINE DASHBOARD
# ========================

@api_router.get("/deadlines")
async def get_deadline_dashboard(user: dict = Depends(get_current_user)):
    """Aggregated deadline and operational dashboard."""
    is_admin = user.get("role") in ["admin", "creator"]
    query = {} if is_admin else {"user_id": user["id"]}
    practices = await db.practices.find(query, {"_id": 0}).sort("updated_at", -1).to_list(300)

    sections = {
        "pending_approvals": [],
        "blocked": [],
        "escalated": [],
        "waiting_delegation": [],
        "in_progress": [],
        "overdue": [],
        "upcoming_actions": [],
    }

    now = datetime.now(timezone.utc)

    for p in practices:
        status = p.get("status", "draft")
        created = p.get("created_at", "")
        updated = p.get("updated_at", "")

        entry = {
            "id": p["id"],
            "practice_type_label": p.get("practice_type_label"),
            "client_name": p.get("client_name"),
            "client_type_label": p.get("client_type_label"),
            "country": p.get("country", "IT"),
            "status": status,
            "status_label": p.get("status_label"),
            "risk_level": p.get("risk_level"),
            "delegation_status": p.get("delegation_status") or (p.get("delegation_info") or {}).get("status", "not_required"),
            "created_at": created,
            "updated_at": updated,
        }

        # Check if overdue (no update in 7+ days for active practices)
        if updated and status in ["draft", "in_progress", "pending", "waiting_approval"]:
            try:
                updated_dt = datetime.fromisoformat(updated.replace("Z", "+00:00")) if isinstance(updated, str) else updated
                if (now - updated_dt.replace(tzinfo=timezone.utc if updated_dt.tzinfo is None else updated_dt.tzinfo)).days >= 7:
                    entry["overdue_days"] = (now - updated_dt.replace(tzinfo=timezone.utc if updated_dt.tzinfo is None else updated_dt.tzinfo)).days
                    sections["overdue"].append(entry)
                    continue
            except (ValueError, TypeError):
                pass

        if status == "waiting_approval":
            sections["pending_approvals"].append(entry)
        elif status == "blocked":
            sections["blocked"].append(entry)
        elif status == "escalated":
            sections["escalated"].append(entry)
        elif p.get("delegation_status") in ["requested", "incomplete", "under_review"] or \
             (p.get("delegation_info") or {}).get("status") in ["requested", "incomplete", "under_review"]:
            sections["waiting_delegation"].append(entry)
        elif status in ["in_progress", "processing"]:
            sections["in_progress"].append(entry)
        elif status in ["draft", "pending"]:
            entry["next_action"] = "Avviare l'esecuzione controllata"
            sections["upcoming_actions"].append(entry)

    counts = {k: len(v) for k, v in sections.items()}
    counts["total_active"] = sum(counts.values())

    # Calculate urgency score
    urgency = "normal"
    if counts["blocked"] > 0 or counts["escalated"] > 0 or counts["overdue"] > 0:
        urgency = "high"
    if counts["blocked"] > 2 or counts["escalated"] > 1 or counts["overdue"] > 3:
        urgency = "critical"

    return {"sections": sections, "counts": counts, "urgency": urgency}

# ========================
# DASHBOARD STATS
# ========================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    total_practices = await db.practices.count_documents({"user_id": user["id"]})
    pending = await db.practices.count_documents({"user_id": user["id"], "status": {"$in": ["pending", "draft"]}})
    processing = await db.practices.count_documents({"user_id": user["id"], "status": {"$in": ["processing", "in_progress"]}})
    waiting_approval = await db.practices.count_documents({"user_id": user["id"], "status": "waiting_approval"})
    completed = await db.practices.count_documents({"user_id": user["id"], "status": "completed"})
    blocked = await db.practices.count_documents({"user_id": user["id"], "status": {"$in": ["blocked", "escalated"]}})
    unread_notifications = await db.notifications.count_documents({"user_id": user["id"], "read": False})

    recent_practices = await db.practices.find(
        {"user_id": user["id"]},
        {"_id": 0, "id": 1, "practice_type_label": 1, "client_name": 1, "status": 1, "status_label": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5).to_list(5)

    return {
        "total_practices": total_practices,
        "pending": pending,
        "processing": processing,
        "waiting_approval": waiting_approval,
        "completed": completed,
        "blocked": blocked,
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
# PRACTICE Q&A CHAT
# ========================

@api_router.post("/practices/{practice_id}/chat")
async def practice_chat(practice_id: str, req: PracticeChatRequest, user: dict = Depends(get_current_user)):
    # Admin/creator can chat on any practice
    is_admin = user.get("role") in ["admin", "creator"]
    query = {"id": practice_id} if is_admin else {"id": practice_id, "user_id": user["id"]}
    practice = await db.practices.find_one(query, {"_id": 0})
    if not practice:
        raise HTTPException(status_code=404, detail="Pratica non trovata")

    chat_id = str(uuid.uuid4())

    try:
        practice_context = {
            "tipo_pratica": practice.get("practice_type_label"),
            "cliente": practice.get("client_name"),
            "tipo_cliente": practice.get("client_type_label"),
            "descrizione": practice.get("description"),
            "codice_fiscale": practice.get("fiscal_code"),
            "partita_iva": practice.get("vat_number"),
            "paese": practice.get("country", "IT"),
            "stato": practice.get("status_label"),
            "documenti": len(practice.get("documents", [])),
            "agenti_eseguiti": [
                {"agente": log.get("branded_name") or log.get("agent_name"), "stato": log.get("status"), "output": str(log.get("output_data", ""))[:300]}
                for log in practice.get("agent_logs", [])[-5:]
            ]
        }

        orchestration = practice.get("orchestration_result")
        orch_summary = ""
        if orchestration and orchestration.get("steps"):
            orch_summary = "\n".join([
                f"- {s.get('branded_name', s.get('agent_name'))}: {s.get('status')} - {str(s.get('output_data', ''))[:200]}"
                for s in orchestration["steps"]
            ])

        system_msg = f"""{FATHER_AGENT_PROMPT}

Contesto della pratica corrente:
{practice_context}

Risultati orchestrazione precedente:
{orch_summary if orch_summary else 'Nessuna orchestrazione eseguita.'}"""

        chat = LlmChat(
            api_key=EMERGENT_KEY,
            session_id=f"chat-{practice_id}-{chat_id}",
            system_message=system_msg
        ).with_model("openai", "gpt-5.2")

        user_message = UserMessage(text=req.question)
        response = await chat.send_message(user_message)

        chat_entry = {
            "id": chat_id,
            "practice_id": practice_id,
            "user_id": user["id"],
            "question": req.question,
            "answer": response,
            "answered_by": "Herion Admin",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.practice_chats.insert_one(chat_entry)

        await log_activity(user["id"], "chat", "practice_question", {
            "practice_id": practice_id, "chat_id": chat_id, "question": req.question[:100]
        })

        return {
            "id": chat_id,
            "question": req.question,
            "answer": response,
            "answered_by": "Herion Admin",
            "timestamp": chat_entry["timestamp"]
        }

    except Exception as e:
        logger.error(f"Practice chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Errore nella risposta: {str(e)}")

@api_router.get("/practices/{practice_id}/chat")
async def get_practice_chat_history(practice_id: str, user: dict = Depends(get_current_user)):
    # Admin/creator can view any practice chat history
    is_admin = user.get("role") in ["admin", "creator"]
    query = {"practice_id": practice_id} if is_admin else {"practice_id": practice_id, "user_id": user["id"]}
    chats = await db.practice_chats.find(
        query,
        {"_id": 0}
    ).sort("timestamp", -1).limit(20).to_list(20)
    return chats

# ========================
# SMART REMINDERS / ANNOUNCEMENTS
# ========================

REMINDER_CATEGORIES = [
    {"key": "deadlines", "label": "Scadenze"},
    {"key": "declarations", "label": "Dichiarazioni"},
    {"key": "vat_reminders", "label": "Promemoria IVA"},
    {"key": "document_preparation", "label": "Preparazione Documenti"},
    {"key": "country_notices", "label": "Avvisi Nazionali"},
    {"key": "platform_updates", "label": "Aggiornamenti Piattaforma"},
]

@api_router.get("/reminders")
async def get_reminders(user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    user_country = user.get("country", "IT")
    reminders = await db.reminders.find(
        {
            "active": True,
            "$or": [{"country": None}, {"country": ""}, {"country": user_country}],
            "$and": [
                {"$or": [{"start_date": None}, {"start_date": ""}, {"start_date": {"$lte": now}}]},
                {"$or": [{"end_date": None}, {"end_date": ""}, {"end_date": {"$gte": now}}]},
            ]
        },
        {"_id": 0}
    ).sort("priority_order", 1).limit(10).to_list(10)
    return reminders

@api_router.get("/reminders/categories")
async def get_reminder_categories():
    return REMINDER_CATEGORIES

@api_router.post("/reminders")
async def create_reminder(reminder: ReminderCreate, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo gli amministratori possono creare promemoria")

    priority_map = {"urgent": 1, "high": 2, "normal": 3, "low": 4}
    reminder_doc = {
        "id": str(uuid.uuid4()),
        "title": reminder.title,
        "content": reminder.content,
        "category": reminder.category,
        "category_label": next((c["label"] for c in REMINDER_CATEGORIES if c["key"] == reminder.category), reminder.category),
        "country": reminder.country,
        "priority": reminder.priority,
        "priority_order": priority_map.get(reminder.priority, 3),
        "start_date": reminder.start_date or datetime.now(timezone.utc).isoformat(),
        "end_date": reminder.end_date,
        "active": reminder.active,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.reminders.insert_one(reminder_doc)
    reminder_doc.pop("_id", None)
    return reminder_doc

@api_router.delete("/reminders/{reminder_id}")
async def delete_reminder(reminder_id: str, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo gli amministratori possono eliminare promemoria")
    result = await db.reminders.delete_one({"id": reminder_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Promemoria non trovato")
    return {"message": "Promemoria eliminato"}

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
    await db.practice_chats.create_index([("practice_id", 1), ("timestamp", -1)])
    await db.reminders.create_index([("active", 1), ("priority_order", 1)])
    await db.practice_timeline.create_index([("practice_id", 1), ("timestamp", 1)])
    await db.approval_snapshots.create_index([("practice_id", 1)])

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
    # Ensure admin has required identity fields
    if existing and not existing.get("first_name"):
        await db.users.update_one({"email": admin_email}, {"$set": {"first_name": "Admin", "last_name": "Herion", "name": "Admin Herion"}})

    Path("/app/memory").mkdir(exist_ok=True)
    creator_pw = os.environ.get("CREATOR_PASSWORD")
    if not creator_pw:
        logger.error("CREATOR_PASSWORD not set in environment. Creator bootstrap requires a secure password via env var.")
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"""# Test Credentials for Herion

## Creator Account (Protected Bootstrap)
- Email: {CREATOR_EMAIL}
- Password: {creator_pw or '(SET VIA CREATOR_PASSWORD env var)'}
- Role: creator
- Creator UUID: {CREATOR_UUID}

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

    # Creator bootstrap - protected identity
    creator_exists = await db.users.find_one({"email": CREATOR_EMAIL.lower()})
    if creator_exists is None:
        creator_password = os.environ.get("CREATOR_PASSWORD")
        if not creator_password:
            logger.error("CREATOR_PASSWORD env var not set. Cannot bootstrap Creator account. Set it in backend/.env")
        else:
            await db.users.insert_one({
                "email": CREATOR_EMAIL.lower(),
                "password_hash": hash_password(creator_password),
                "first_name": "Gege",
                "last_name": "Xia",
                "name": CREATOR_NAME,
                "role": "creator",
                "is_creator": True,
                "creator_uuid": CREATOR_UUID,
                "client_type": "private",
                "country": "IT",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "privacy_consent": True,
                "privacy_consent_date": datetime.now(timezone.utc).isoformat(),
                "terms_consent": True,
                "terms_consent_date": datetime.now(timezone.utc).isoformat()
            })
            logger.info(f"Creator account bootstrapped: {CREATOR_EMAIL}")
    elif not creator_exists.get("is_creator"):
        creator_password = os.environ.get("CREATOR_PASSWORD")
        if not creator_password:
            logger.error("CREATOR_PASSWORD env var not set. Cannot restore Creator identity.")
        else:
            await db.users.update_one({"email": CREATOR_EMAIL.lower()}, {"$set": {
                "role": "creator", "is_creator": True, "creator_uuid": CREATOR_UUID,
                "name": CREATOR_NAME, "first_name": "Gege", "last_name": "Xia",
                "password_hash": hash_password(creator_password)
            }})
            logger.info("Creator identity restored")

    # Seed Practice Catalog
    await db.practice_catalog.create_index("practice_id", unique=True)
    await db.authority_registry.create_index("registry_id", unique=True)
    catalog_count = await db.practice_catalog.count_documents({})
    if catalog_count == 0:
        catalog_entries = [
            {"practice_id": "INFO_FISCAL_GENERIC", "name": "Richiesta informazioni fiscali generiche", "description": "Richiesta di chiarimenti su adempimenti fiscali di base.", "user_type": ["private", "freelancer", "company"], "country_scope": "EU", "risk_level": "basic", "support_level": "supported", "expected_channel": "email", "destination_type": "informational", "required_documents": [], "delegation_required": False, "approval_required": False, "agents": ["intake", "research", "advisor"], "blocking_conditions": [], "escalation_conditions": ["ambiguita normativa"], "next_step": "Invio informazioni", "user_explanation": "Richiesta di informazioni fiscali di base. Herion raccoglie la domanda e fornisce indicazioni chiare."},
            {"practice_id": "DOC_MISSING_REQUEST", "name": "Richiesta documenti mancanti", "description": "Notifica all'utente sui documenti necessari per procedere.", "user_type": ["private", "freelancer", "company"], "country_scope": "all", "risk_level": "basic", "support_level": "supported", "expected_channel": "email", "destination_type": "user_communication", "required_documents": [], "delegation_required": False, "approval_required": False, "agents": ["documents", "flow", "advisor"], "blocking_conditions": [], "escalation_conditions": [], "next_step": "Attesa caricamento documenti", "user_explanation": "Ti indichiamo quali documenti servono per completare la tua pratica."},
            {"practice_id": "DOC_PRELIMINARY_SEND", "name": "Invio documenti preliminari", "description": "Invio di documentazione preliminare a un destinatario.", "user_type": ["private", "freelancer", "company"], "country_scope": "all", "risk_level": "basic", "support_level": "supported", "expected_channel": "email", "destination_type": "external_recipient", "required_documents": ["identity"], "delegation_required": False, "approval_required": True, "agents": ["documents", "routing", "advisor"], "blocking_conditions": ["documenti mancanti"], "escalation_conditions": [], "next_step": "Conferma ricezione", "user_explanation": "Preparazione e invio della documentazione preliminare richiesta."},
            {"practice_id": "PRACTICE_FOLLOWUP", "name": "Promemoria e follow-up pratica", "description": "Promemoria sullo stato di avanzamento di una pratica.", "user_type": ["private", "freelancer", "company"], "country_scope": "all", "risk_level": "basic", "support_level": "supported", "expected_channel": "email", "destination_type": "user_communication", "required_documents": [], "delegation_required": False, "approval_required": False, "agents": ["monitor", "deadline", "advisor"], "blocking_conditions": [], "escalation_conditions": [], "next_step": "Verifica stato pratica", "user_explanation": "Ricevi aggiornamenti e promemoria sullo stato della tua pratica."},
            {"practice_id": "BLOCKED_RECOVERY", "name": "Recupero pratica bloccata", "description": "Recupero di una pratica in stato bloccato.", "user_type": ["private", "freelancer", "company"], "country_scope": "all", "risk_level": "basic", "support_level": "supported", "expected_channel": "preparation_only", "destination_type": "internal", "required_documents": [], "delegation_required": False, "approval_required": False, "agents": ["flow", "monitor", "documents"], "blocking_conditions": [], "escalation_conditions": ["blocco persistente"], "next_step": "Identificazione causa blocco", "user_explanation": "Identifichiamo cosa blocca la pratica e ti guidiamo nella risoluzione."},
            {"practice_id": "DOSSIER_DELIVERY", "name": "Consegna dossier finale", "description": "Consegna del fascicolo completo della pratica.", "user_type": ["private", "freelancer", "company"], "country_scope": "all", "risk_level": "basic", "support_level": "supported", "expected_channel": "email", "destination_type": "user_delivery", "required_documents": ["practice_documents"], "delegation_required": False, "approval_required": True, "agents": ["documents", "advisor"], "blocking_conditions": ["documenti incompleti"], "escalation_conditions": [], "next_step": "Download o invio dossier", "user_explanation": "Il fascicolo completo della pratica viene preparato e consegnato."},
            {"practice_id": "STATUS_UPDATE", "name": "Aggiornamento stato pratica", "description": "Comunicazione di aggiornamento sullo stato della pratica.", "user_type": ["private", "freelancer", "company"], "country_scope": "all", "risk_level": "basic", "support_level": "supported", "expected_channel": "email", "destination_type": "user_communication", "required_documents": [], "delegation_required": False, "approval_required": False, "agents": ["monitor", "advisor"], "blocking_conditions": [], "escalation_conditions": [], "next_step": "Prossima azione", "user_explanation": "Ricevi un riepilogo aggiornato sullo stato della tua pratica."},
            {"practice_id": "DOC_COMPLETENESS", "name": "Verifica completezza documenti", "description": "Controllo che tutti i documenti necessari siano presenti.", "user_type": ["private", "freelancer", "company"], "country_scope": "all", "risk_level": "basic", "support_level": "supported", "expected_channel": "preparation_only", "destination_type": "internal", "required_documents": [], "delegation_required": False, "approval_required": False, "agents": ["documents", "flow"], "blocking_conditions": [], "escalation_conditions": [], "next_step": "Risultato verifica", "user_explanation": "Verifichiamo che tutti i documenti necessari siano stati caricati."},
            {"practice_id": "USER_APPROVAL_REQ", "name": "Richiesta approvazione utente", "description": "Richiesta di approvazione esplicita prima di procedere.", "user_type": ["private", "freelancer", "company"], "country_scope": "all", "risk_level": "basic", "support_level": "supported", "expected_channel": "email", "destination_type": "user_communication", "required_documents": [], "delegation_required": False, "approval_required": True, "agents": ["flow", "monitor"], "blocking_conditions": [], "escalation_conditions": [], "next_step": "Attesa approvazione", "user_explanation": "Prima di procedere, ti chiediamo di verificare e approvare il riepilogo."},
            {"practice_id": "PDF_REPORT_DELIVERY", "name": "Consegna PDF/report finale", "description": "Generazione e consegna del report PDF finale.", "user_type": ["private", "freelancer", "company"], "country_scope": "all", "risk_level": "basic", "support_level": "supported", "expected_channel": "email", "destination_type": "user_delivery", "required_documents": [], "delegation_required": False, "approval_required": False, "agents": ["documents", "advisor"], "blocking_conditions": [], "escalation_conditions": [], "next_step": "Download report", "user_explanation": "Il report finale della pratica viene generato e messo a disposizione."},
            {"practice_id": "VAT_OPEN_PF", "name": "Apertura Partita IVA persone fisiche", "description": "Preparazione della pratica di apertura partita IVA per individui e freelance.", "user_type": ["freelancer"], "country_scope": "IT", "risk_level": "medium", "support_level": "supported", "expected_channel": "official_portal", "destination_type": "tax_authority", "required_documents": ["identity", "tax_declarations"], "delegation_required": False, "approval_required": True, "agents": ["intake", "research", "routing", "documents", "flow"], "blocking_conditions": ["documenti identita mancanti", "codice fiscale mancante"], "escalation_conditions": ["multi-paese", "struttura societaria complessa"], "next_step": "Preparazione modello AA9/12", "user_explanation": "Ti guidiamo nella preparazione della pratica di apertura partita IVA presso l'Agenzia delle Entrate."},
            {"practice_id": "VAT_VARIATION_PF", "name": "Variazione Partita IVA persone fisiche", "description": "Modifica dei dati della partita IVA per persone fisiche.", "user_type": ["freelancer"], "country_scope": "IT", "risk_level": "medium", "support_level": "supported", "expected_channel": "official_portal", "destination_type": "tax_authority", "required_documents": ["identity"], "delegation_required": False, "approval_required": True, "agents": ["research", "routing", "documents", "flow"], "blocking_conditions": ["partita IVA non attiva"], "escalation_conditions": ["variazione complessa"], "next_step": "Preparazione variazione", "user_explanation": "Preparazione della variazione dei dati della tua partita IVA."},
            {"practice_id": "VAT_CLOSURE_PF", "name": "Chiusura Partita IVA persone fisiche", "description": "Preparazione della chiusura della partita IVA.", "user_type": ["freelancer"], "country_scope": "IT", "risk_level": "medium", "support_level": "supported", "expected_channel": "official_portal", "destination_type": "tax_authority", "required_documents": ["identity", "tax_declarations"], "delegation_required": False, "approval_required": True, "agents": ["research", "routing", "documents", "flow", "delegate"], "blocking_conditions": ["debiti pendenti non verificati"], "escalation_conditions": ["pendenze fiscali complesse"], "next_step": "Verifica pendenze e preparazione chiusura", "user_explanation": "Ti guidiamo nella chiusura della partita IVA, verificando che tutto sia in ordine."},
            {"practice_id": "F24_PREPARATION", "name": "Preparazione e validazione F24", "description": "Supporto nella compilazione e verifica del modello F24.", "user_type": ["private", "freelancer", "company"], "country_scope": "IT", "risk_level": "medium", "support_level": "supported", "expected_channel": "preparation_only", "destination_type": "tax_payment", "required_documents": ["accounting"], "delegation_required": False, "approval_required": True, "agents": ["ledger", "documents", "compliance", "advisor"], "blocking_conditions": ["dati contabili insufficienti"], "escalation_conditions": ["importi significativi non verificati"], "next_step": "Compilazione F24", "user_explanation": "Prepariamo e verifichiamo il modello F24 per i tuoi pagamenti fiscali."},
            {"practice_id": "F24_WEB", "name": "Supporto F24 Web", "description": "Supporto per la compilazione F24 tramite portale web.", "user_type": ["private", "freelancer", "company"], "country_scope": "IT", "risk_level": "medium", "support_level": "supported", "expected_channel": "official_portal", "destination_type": "tax_payment", "required_documents": ["accounting"], "delegation_required": False, "approval_required": True, "agents": ["routing", "research", "ledger", "flow"], "blocking_conditions": ["accesso portale non verificato"], "escalation_conditions": [], "next_step": "Accesso e compilazione F24 Web", "user_explanation": "Ti guidiamo nell'uso del portale F24 Web dell'Agenzia delle Entrate."},
            {"practice_id": "VAT_DECLARATION", "name": "Supporto dichiarazione IVA", "description": "Preparazione della dichiarazione IVA periodica.", "user_type": ["freelancer", "company"], "country_scope": "IT", "risk_level": "medium", "support_level": "supported", "expected_channel": "official_portal", "destination_type": "tax_authority", "required_documents": ["vat_documents", "invoices", "accounting"], "delegation_required": False, "approval_required": True, "agents": ["research", "documents", "compliance", "flow"], "blocking_conditions": ["registri IVA incompleti"], "escalation_conditions": ["operazioni intracomunitarie complesse"], "next_step": "Preparazione dichiarazione", "user_explanation": "Prepariamo la tua dichiarazione IVA verificando registri e documenti."},
            {"practice_id": "EINVOICING", "name": "Supporto fatturazione elettronica", "description": "Supporto per l'emissione e gestione delle fatture elettroniche.", "user_type": ["freelancer", "company"], "country_scope": "IT", "risk_level": "medium", "support_level": "supported", "expected_channel": "official_portal", "destination_type": "tax_authority", "required_documents": ["invoices"], "delegation_required": False, "approval_required": False, "agents": ["research", "routing", "documents", "advisor"], "blocking_conditions": [], "escalation_conditions": ["fatturazione internazionale complessa"], "next_step": "Configurazione fatturazione elettronica", "user_explanation": "Ti supportiamo nella gestione della fatturazione elettronica tramite il portale dell'Agenzia delle Entrate."},
            {"practice_id": "INPS_GESTIONE_SEP", "name": "Iscrizione Gestione Separata INPS", "description": "Supporto per l'iscrizione alla Gestione Separata INPS.", "user_type": ["freelancer"], "country_scope": "IT", "risk_level": "medium", "support_level": "supported", "expected_channel": "official_portal", "destination_type": "social_security", "required_documents": ["identity", "tax_declarations"], "delegation_required": False, "approval_required": True, "agents": ["research", "routing", "documents", "flow"], "blocking_conditions": ["partita IVA non attiva"], "escalation_conditions": [], "next_step": "Preparazione iscrizione INPS", "user_explanation": "Ti guidiamo nell'iscrizione alla Gestione Separata INPS per liberi professionisti."},
            {"practice_id": "INPS_CASSETTO", "name": "Supporto cassetto previdenziale", "description": "Supporto per la consultazione del cassetto previdenziale.", "user_type": ["freelancer"], "country_scope": "IT", "risk_level": "medium", "support_level": "supported", "expected_channel": "official_portal", "destination_type": "social_security", "required_documents": [], "delegation_required": False, "approval_required": False, "agents": ["research", "routing", "advisor", "monitor"], "blocking_conditions": [], "escalation_conditions": [], "next_step": "Accesso cassetto previdenziale", "user_explanation": "Ti aiutiamo a consultare e comprendere il tuo cassetto previdenziale INPS."},
            {"practice_id": "COMPANY_CLOSURE", "name": "Preparazione chiusura post-liquidazione", "description": "Preparazione del flusso di chiusura societaria dopo liquidazione.", "user_type": ["company"], "country_scope": "IT", "risk_level": "medium", "support_level": "partially_supported", "expected_channel": "official_portal", "destination_type": "chamber_registry", "required_documents": ["company_documents", "accounting", "identity"], "delegation_required": True, "approval_required": True, "agents": ["research", "deadline", "flow", "routing", "delegate", "documents"], "blocking_conditions": ["liquidazione non completata", "documenti societari mancanti"], "escalation_conditions": ["contenziosi pendenti", "debiti non risolti"], "next_step": "Verifica requisiti chiusura", "user_explanation": "Prepariamo il percorso di chiusura post-liquidazione, verificando tutti i requisiti necessari."},
        ]
        for entry in catalog_entries:
            entry["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.practice_catalog.insert_many(catalog_entries)
        logger.info(f"Practice catalog seeded with {len(catalog_entries)} entries")

    # Seed Authority Registry
    registry_count = await db.authority_registry.count_documents({})
    if registry_count == 0:
        registry_entries = [
            {"registry_id": "AE_VAT_OPEN_PF", "name": "Agenzia delle Entrate - Apertura P.IVA Persone Fisiche", "destination_type": "tax_authority", "country": "IT", "related_practices": ["VAT_OPEN_PF"], "portal_url": "https://www.agenziaentrate.gov.it/portale/schede/istanze/aa9_11-apertura-variazione-chiusura-pf/modello-e-istr-pi-pf", "required_channel": "official_portal", "allowed_channels": ["official_portal", "preparation_only"], "auto_submission": False, "preparation_only": True, "escalation_default": False, "notes": "Modello AA9/12 per apertura, variazione o chiusura P.IVA persone fisiche"},
            {"registry_id": "AE_VAT_VARIATION_PF", "name": "Agenzia delle Entrate - Variazione P.IVA Persone Fisiche", "destination_type": "tax_authority", "country": "IT", "related_practices": ["VAT_VARIATION_PF"], "portal_url": "https://www.agenziaentrate.gov.it/portale/schede/istanze/aa9_11-apertura-variazione-chiusura-pf/modello-e-istr-pi-pf", "required_channel": "official_portal", "allowed_channels": ["official_portal", "PEC", "preparation_only"], "auto_submission": False, "preparation_only": True, "escalation_default": False, "notes": "Variazione dati tramite modello AA9/12"},
            {"registry_id": "AE_VAT_CLOSURE_PF", "name": "Agenzia delle Entrate - Chiusura P.IVA Persone Fisiche", "destination_type": "tax_authority", "country": "IT", "related_practices": ["VAT_CLOSURE_PF"], "portal_url": "https://www.agenziaentrate.gov.it/portale/schede/istanze/aa9_11-apertura-variazione-chiusura-pf/modello-e-istr-pi-pf", "required_channel": "official_portal", "allowed_channels": ["official_portal", "PEC", "preparation_only"], "auto_submission": False, "preparation_only": True, "escalation_default": False, "notes": "Chiusura P.IVA tramite modello AA9/12"},
            {"registry_id": "AE_F24_STANDARD", "name": "Agenzia delle Entrate - F24 Ordinario", "destination_type": "tax_payment", "country": "IT", "related_practices": ["F24_PREPARATION"], "portal_url": "https://www.agenziaentrate.gov.it/portale/modello-f24", "required_channel": "preparation_only", "allowed_channels": ["preparation_only"], "auto_submission": False, "preparation_only": True, "escalation_default": False, "notes": "Modello F24 ordinario per pagamenti fiscali e contributivi"},
            {"registry_id": "AE_F24_WEB", "name": "Agenzia delle Entrate - F24 Web", "destination_type": "tax_payment", "country": "IT", "related_practices": ["F24_WEB"], "portal_url": "https://www.agenziaentrate.gov.it/portale/web/guest/f24-web", "required_channel": "official_portal", "allowed_channels": ["official_portal", "preparation_only"], "auto_submission": False, "preparation_only": True, "escalation_default": False, "notes": "Compilazione e invio F24 tramite servizio web"},
            {"registry_id": "AE_VAT_DECLARATION", "name": "Agenzia delle Entrate - Dichiarazioni IVA", "destination_type": "tax_authority", "country": "IT", "related_practices": ["VAT_DECLARATION"], "portal_url": "https://www.agenziaentrate.gov.it/portale/web/guest/iva", "required_channel": "official_portal", "allowed_channels": ["official_portal", "preparation_only"], "auto_submission": False, "preparation_only": True, "escalation_default": False, "notes": "Dichiarazioni IVA periodiche e annuali"},
            {"registry_id": "AE_EINVOICING", "name": "Agenzia delle Entrate - Fatture e Corrispettivi", "destination_type": "tax_authority", "country": "IT", "related_practices": ["EINVOICING"], "portal_url": "https://www.agenziaentrate.gov.it/portale/web/guest/fatture-e-corrispettivi", "required_channel": "official_portal", "allowed_channels": ["official_portal", "preparation_only"], "auto_submission": False, "preparation_only": True, "escalation_default": False, "notes": "Portale fatturazione elettronica"},
            {"registry_id": "INPS_GESTIONE_SEP", "name": "INPS - Iscrizione Gestione Separata", "destination_type": "social_security", "country": "IT", "related_practices": ["INPS_GESTIONE_SEP"], "portal_url": "https://www.inps.it/it/it/dettaglio-scheda.schede-servizio-strumento.schede-servizi.iscrizione-gestione-separata--liberi-professionisti-50104.iscrizione-gestione-separata--liberi-professionisti.html", "required_channel": "official_portal", "allowed_channels": ["official_portal", "preparation_only"], "auto_submission": False, "preparation_only": True, "escalation_default": False, "notes": "Iscrizione Gestione Separata per liberi professionisti"},
            {"registry_id": "INPS_CASSETTO", "name": "INPS - Cassetto Previdenziale", "destination_type": "social_security", "country": "IT", "related_practices": ["INPS_CASSETTO"], "portal_url": "https://www.inps.it/it/it/dettaglio-scheda.schede-servizio-strumento.schede-servizi.cassetto-previdenziale-per-liberi-professionisti-50466.cassetto-previdenziale-per-liberi-professionisti.html", "required_channel": "official_portal", "allowed_channels": ["official_portal", "preparation_only"], "auto_submission": False, "preparation_only": True, "escalation_default": False, "notes": "Consultazione cassetto previdenziale"},
            {"registry_id": "SUAP_GENERIC", "name": "SUAP / Impresa in un Giorno", "destination_type": "public_portal", "country": "IT", "related_practices": [], "portal_url": "https://www.impresainungiorno.gov.it/", "required_channel": "official_portal", "allowed_channels": ["official_portal", "preparation_only"], "auto_submission": False, "preparation_only": True, "escalation_default": True, "notes": "Pratiche SUAP - richiedono verifica specifica per tipologia"},
            {"registry_id": "USER_EMAIL_DELIVERY", "name": "Consegna email utente", "destination_type": "internal", "country": "multi", "related_practices": ["DOSSIER_DELIVERY", "STATUS_UPDATE", "PRACTICE_FOLLOWUP"], "portal_url": None, "required_channel": "email", "allowed_channels": ["email"], "auto_submission": True, "preparation_only": False, "escalation_default": False, "notes": "Comunicazioni a basso rischio verso l'utente"},
            {"registry_id": "EXTERNAL_INFO_REQ", "name": "Destinatario informazioni esterne", "destination_type": "external_recipient", "country": "multi", "related_practices": ["INFO_FISCAL_GENERIC"], "portal_url": None, "required_channel": "email", "allowed_channels": ["email"], "auto_submission": False, "preparation_only": True, "escalation_default": False, "notes": "Richieste informative verso destinatari esterni validati"},
            {"registry_id": "ESCALATION_HUMAN", "name": "Escalation revisione professionale", "destination_type": "professional_review", "country": "multi", "related_practices": [], "portal_url": None, "required_channel": "escalation", "allowed_channels": ["escalation", "preparation_only"], "auto_submission": False, "preparation_only": True, "escalation_default": True, "notes": "Casi che richiedono revisione professionale umana"},
            {"registry_id": "PREPARATION_ONLY", "name": "Solo preparazione interna", "destination_type": "internal", "country": "multi", "related_practices": ["DOC_COMPLETENESS", "BLOCKED_RECOVERY"], "portal_url": None, "required_channel": "preparation_only", "allowed_channels": ["preparation_only"], "auto_submission": False, "preparation_only": True, "escalation_default": False, "notes": "Raccolta dati e documenti senza invio"},
        ]
        for entry in registry_entries:
            entry["created_at"] = datetime.now(timezone.utc).isoformat()
            entry["source_freshness"] = "current"
            entry["last_verified"] = datetime.now(timezone.utc).isoformat()
        await db.authority_registry.insert_many(registry_entries)
        logger.info(f"Authority registry seeded with {len(registry_entries)} entries")

    # Seed reminders if empty
    reminder_count = await db.reminders.count_documents({})
    if reminder_count == 0:
        default_reminders = [
            {"id": str(uuid.uuid4()), "title": "Dichiarazione IVA Trimestrale", "content": "Ricorda di preparare e inviare la dichiarazione IVA trimestrale entro la scadenza prevista dal tuo paese.", "category": "vat_reminders", "category_label": "Promemoria IVA", "country": None, "priority": "high", "priority_order": 2, "start_date": datetime.now(timezone.utc).isoformat(), "end_date": None, "active": True, "created_by": "system", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "title": "Organizza i Documenti Fiscali", "content": "Mantieni in ordine fatture, ricevute e documenti contabili. Una buona organizzazione semplifica ogni adempimento.", "category": "document_preparation", "category_label": "Preparazione Documenti", "country": None, "priority": "normal", "priority_order": 3, "start_date": datetime.now(timezone.utc).isoformat(), "end_date": None, "active": True, "created_by": "system", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "title": "Verifica Conformita Aziendale", "content": "Controlla che la tua attivita rispetti tutti i requisiti di conformita fiscale e amministrativa previsti.", "category": "declarations", "category_label": "Dichiarazioni", "country": None, "priority": "normal", "priority_order": 3, "start_date": datetime.now(timezone.utc).isoformat(), "end_date": None, "active": True, "created_by": "system", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "title": "Herion AI: Piattaforma di Esecuzione Controllata", "content": "Usa l'analisi completa a 9 agenti specializzati per ogni pratica. Herion Admin coordina Intake, Ledger, Compliance, Documents, Delegate, Deadline, Flow, Monitor e Advisor per un controllo totale.", "category": "platform_updates", "category_label": "Aggiornamenti Piattaforma", "country": None, "priority": "low", "priority_order": 4, "start_date": datetime.now(timezone.utc).isoformat(), "end_date": None, "active": True, "created_by": "system", "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.reminders.insert_many(default_reminders)
        logger.info("Default reminders seeded")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
