from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, File, UploadFile, Response
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import secrets
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import requests
import resend
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

# Resend Config
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY
    logger.info("Resend email service configured")
else:
    logger.warning("RESEND_API_KEY not set — email sending will be disabled")

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
        # Log failed login for security monitoring
        await log_security_event("failed_login", email, reason="Credenziali non valide")
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

    frontend_url = os.environ.get("FRONTEND_URL", os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:3000"))
    reset_link = f"{frontend_url}/reset-password?token={token}"

    # Send real email via Resend
    if RESEND_API_KEY:
        try:
            html_content = f"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0;">Herion</h1>
                    <p style="color: #64748B; font-size: 13px; margin-top: 4px;">Piattaforma operativa fiscale</p>
                </div>
                <h2 style="color: #0F172A; font-size: 18px; font-weight: 600;">Reimposta la tua password</h2>
                <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                    Hai richiesto il ripristino della password del tuo account Herion.
                    Clicca il pulsante qui sotto per procedere.
                </p>
                <div style="text-align: center; margin: 28px 0;">
                    <a href="{reset_link}" style="background-color: #0F4C5C; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                        Reimposta Password
                    </a>
                </div>
                <p style="color: #94A3B8; font-size: 12px; line-height: 1.5;">
                    Il link scade tra 1 ora. Se non hai richiesto tu il ripristino, ignora questa email.
                </p>
                <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
                <p style="color: #CBD5E1; font-size: 11px; text-align: center;">Herion — Gestione fiscale operativa per l'Italia</p>
            </div>
            """
            await asyncio.to_thread(resend.Emails.send, {
                "from": SENDER_EMAIL,
                "to": [email],
                "subject": "Herion — Reimposta la tua password",
                "html": html_content,
            })
            logger.info(f"Password reset email sent to {email}")
        except Exception as e:
            logger.error(f"Failed to send password reset email: {str(e)}")
    else:
        logger.info(f"[EMAIL DISABLED] Password reset link for {email}: {reset_link}")

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
# PRIORITY ENGINE
# ========================

PRIORITY_LEVELS = {
    "low": {"label": "Bassa", "order": 0},
    "normal": {"label": "Normale", "order": 1},
    "high": {"label": "Alta", "order": 2},
    "urgent": {"label": "Urgente", "order": 3},
}


def evaluate_practice_priority(practice: dict) -> str:
    """Calculate practice priority from real conditions. Returns priority level string."""
    status = practice.get("status", "draft")
    risk = practice.get("risk_level")
    deadline_str = practice.get("deadline")
    updated_str = practice.get("updated_at")
    now = datetime.now(timezone.utc)

    score = 1  # normal baseline

    # Rule A: Deadline proximity
    if deadline_str:
        try:
            dl = datetime.fromisoformat(deadline_str.replace("Z", "+00:00"))
            if dl.tzinfo is None:
                dl = dl.replace(tzinfo=timezone.utc)
            days_left = (dl - now).total_seconds() / 86400
            if days_left < 0:
                score = max(score, 3)  # passed → urgent
            elif days_left < 3:
                score = max(score, 2)  # <3 days → high
            elif days_left < 7:
                score = max(score, 1)  # <7 days → normal
        except (ValueError, TypeError):
            pass

    # Rule B: Status-based
    if status in ("waiting_approval", "waiting_user_review", "waiting_signature"):
        score = max(score, 2)
    elif status in ("failed", "internal_validation_failed", "rejected_by_entity"):
        score = max(score, 2)
    elif status == "escalated":
        score = max(score, 3)
    elif status == "blocked":
        score = max(score, 2)
    elif status == "waiting_user_documents":
        score = max(score, 1)

    # Rule C: Risk interaction
    if risk == "high":
        score = max(score, 2)
        if status == "waiting_approval":
            score = 3  # high risk + waiting → urgent

    # Rule D: Stale practices (no update for >7 days while processing)
    if updated_str and status in ("in_progress", "processing", "internal_processing", "waiting_user_documents"):
        try:
            upd = datetime.fromisoformat(updated_str.replace("Z", "+00:00"))
            if upd.tzinfo is None:
                upd = upd.replace(tzinfo=timezone.utc)
            days_stale = (now - upd).total_seconds() / 86400
            if days_stale > 7:
                score = max(score, 2)
        except (ValueError, TypeError):
            pass

    # Rule E: Completed → low
    if status in ("completed", "submitted", "submitted_manually", "submitted_via_channel", "accepted_by_entity"):
        score = 0

    levels = ["low", "normal", "high", "urgent"]
    return levels[min(score, 3)]


async def refresh_practice_priority(practice_id: str):
    """Recalculate and persist priority for a single practice."""
    practice = await db.practices.find_one({"id": practice_id}, {"_id": 0})
    if not practice:
        return
    new_priority = evaluate_practice_priority(practice)
    if practice.get("priority") != new_priority:
        await db.practices.update_one(
            {"id": practice_id},
            {"$set": {"priority": new_priority}}
        )
    return new_priority


async def refresh_all_priorities(user_id: str = None):
    """Recalculate priority for all active practices. Optionally scoped to a user."""
    query = {"status": {"$nin": ["completed", "submitted", "submitted_manually", "submitted_via_channel", "accepted_by_entity"]}}
    if user_id:
        query["user_id"] = user_id
    practices = await db.practices.find(query, {"_id": 0, "id": 1, "status": 1, "risk_level": 1, "deadline": 1, "updated_at": 1}).to_list(500)
    updates = []
    for p in practices:
        new_pri = evaluate_practice_priority(p)
        if p.get("priority") != new_pri:
            updates.append({"id": p["id"], "priority": new_pri})
    for u in updates:
        await db.practices.update_one({"id": u["id"]}, {"$set": {"priority": u["priority"]}})
    return len(updates)


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
        "priority": "normal",
        "deadline": practice.additional_data.get("deadline") if practice.additional_data else None,
        "current_step": None,
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

    await refresh_practice_priority(practice_doc["id"])
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
    is_admin = user.get("role") in ["admin", "creator"]
    query = {} if is_admin else {"user_id": user["id"]}
    practices = await db.practices.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    priority_order = {"urgent": 0, "high": 1, "normal": 2, "low": 3}
    for p in practices:
        p["priority"] = evaluate_practice_priority(p)
        p["priority_label"] = PRIORITY_LEVELS.get(p["priority"], {}).get("label", p["priority"])
        p["priority_order"] = priority_order.get(p["priority"], 2)
    practices.sort(key=lambda x: (x["priority_order"], x.get("created_at", "")))
    for p in practices:
        p.pop("priority_order", None)
    return practices

@api_router.get("/practices/{practice_id}")
async def get_practice(practice_id: str, user: dict = Depends(get_current_user)):
    # Admin/creator can view any practice
    is_admin = user.get("role") in ["admin", "creator"]
    query = {"id": practice_id} if is_admin else {"id": practice_id, "user_id": user["id"]}
    practice = await db.practices.find_one(query, {"_id": 0})
    if not practice:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    practice["priority"] = evaluate_practice_priority(practice)
    practice["priority_label"] = PRIORITY_LEVELS.get(practice["priority"], {}).get("label", practice["priority"])

    # Enrich with catalog info
    practice_type = practice.get("practice_type", "")
    catalog_entry = await db.practice_catalog.find_one({"practice_id": practice_type}, {"_id": 0})

    # Fallback mapping for legacy practice types to catalog IDs
    if not catalog_entry:
        PRACTICE_TYPE_TO_CATALOG = {
            "vat_registration": "VAT_OPEN_PF",
            "vat_closure": "VAT_CLOSURE_PF",
            "tax_declaration": "VAT_DECLARATION",
            "f24_payment": "F24_PREPARATION",
            "inps_registration": "INPS_GESTIONE_SEP",
            "company_formation": "COMPANY_CLOSURE",
        }
        mapped_id = PRACTICE_TYPE_TO_CATALOG.get(practice_type)
        if mapped_id:
            catalog_entry = await db.practice_catalog.find_one({"practice_id": mapped_id}, {"_id": 0})
    practice["catalog_info"] = catalog_entry

    # Enrich with channel/entity info from authority registry
    channel_entry = None
    if catalog_entry:
        catalog_id = catalog_entry.get("practice_id", "")
        channel_entry = await db.authority_registry.find_one(
            {"related_practices": catalog_id}, {"_id": 0}
        )
    practice["channel_info"] = channel_entry

    # Add step position for 6-step flow
    status = practice.get("status", "draft")
    practice["current_step"] = PRACTICE_STEP_MAP.get(status, 0)
    practice["user_status"] = USER_STATUS_DISPLAY.get(status, USER_STATUS_DISPLAY.get("draft"))

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

    await refresh_practice_priority(practice_id)

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
        "vault_status": "stored",
        "sensitivity_level": "high" if category in ["identity", "delegation", "tax"] else "medium",
        "verification_status": "pending",
        "version": 1,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
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

# NOTE: Static routes must come BEFORE parameterized routes to avoid route conflicts
@api_router.get("/documents/matrix-types")
async def get_all_document_matrix_types_early(user: dict = Depends(get_current_user)):
    """Get all practice types that have a document matrix defined."""
    types = []
    for practice_type, matrix in DOCUMENT_MATRIX.items():
        catalog_entry = await db.practice_catalog.find_one({"practice_id": practice_type}, {"_id": 0, "name": 1, "support_level": 1})
        types.append({
            "practice_type": practice_type,
            "name": catalog_entry.get("name", practice_type) if catalog_entry else practice_type,
            "support_level": catalog_entry.get("support_level") if catalog_entry else "unknown",
            "required_count": len(matrix.get("required", [])),
            "optional_count": len(matrix.get("optional", [])),
            "conditional_count": len(matrix.get("conditional", [])),
            "output_count": len(matrix.get("expected_outputs", [])),
            "has_signed_docs": any(d.get("signed_required") for d in matrix.get("required", []) + matrix.get("conditional", [])),
            "has_confidential_docs": any(d.get("sensitivity") == "confidential" for d in matrix.get("required", []) + matrix.get("conditional", [])),
        })
    return types

@api_router.get("/documents/sensitivity-levels")
async def get_sensitivity_levels_early(user: dict = Depends(get_current_user)):
    """Get the sensitivity level definitions and visibility rules."""
    return SENSITIVITY_LEVELS_CONFIG

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
    "guard": {
        "name": "Guardia e Confini Operativi",
        "branded_name": "Herion Guard",
        "icon_key": "guard",
        "description": "Valuta i confini operativi, verifica la prontezza e propone alternative sicure quando l'esecuzione non e possibile.",
        "step": 12,
        "system_message": """Sei Herion Guard, l'agente di protezione e confini operativi della piattaforma Herion.
Il tuo compito e valutare se una pratica puo procedere in sicurezza verso il prossimo stato.
Non sei un semplice blocco: sei un confine intelligente che protegge e guida.

Devi valutare:
1. Prontezza complessiva della pratica (documenti, dati, delega, approvazione)
2. Livello di supporto della piattaforma per questo tipo di pratica
3. Chiarezza del routing e della destinazione
4. Validita della delega (se richiesta)
5. Stato dell'approvazione (se richiesta)
6. Rischio complessivo

Per ogni problema trovato, DEVI suggerire un'alternativa sicura e concreta:
- Se mancano documenti: suggerisci quali caricare
- Se la delega non e valida: suggerisci come richiederla o aggiornarla
- Se il rischio e alto: suggerisci escalation o revisione
- Se il routing non e chiaro: suggerisci verifica con l'amministratore

Il tuo verdetto deve essere uno di:
- AUTORIZZATO: la pratica puo procedere senza ostacoli
- SORVEGLIATO: ci sono avvertimenti ma si puo procedere con cautela
- BLOCCATO: non si puo procedere, ma esistono alternative sicure

Rispondi SEMPRE in italiano. Sii protettivo ma mai opaco.
Format:
- Verdetto: AUTORIZZATO / SORVEGLIATO / BLOCCATO
- Dimensioni valutate (con esito per ciascuna)
- Problemi identificati
- Alternative sicure suggerite
- Prossimo passo raccomandato"""
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

Gestisci un team di 12 agenti specializzati:
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
- Herion Guard: protezione confini operativi e alternative sicure

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
    # New semantic statuses
    "draft": "Bozza",
    "waiting_user_documents": "In Attesa Documenti",
    "documents_received": "Documenti Ricevuti",
    "internal_processing": "In Elaborazione Interna",
    "internal_validation_passed": "Validazione Interna Superata",
    "internal_validation_failed": "Validazione Fallita",
    "waiting_user_review": "In Attesa della Tua Verifica",
    "waiting_signature": "In Attesa di Firma",
    "ready_for_submission": "Pronta per l'Invio",
    "submitted_manually": "Inviata Manualmente",
    "submitted_via_channel": "Inviata via Canale Ufficiale",
    "waiting_external_response": "In Attesa Risposta Ente",
    "accepted_by_entity": "Accettata dall'Ente",
    "rejected_by_entity": "Rifiutata dall'Ente",
    "completed": "Completata",
    "blocked": "Bloccata",
    # Legacy compatibility
    "pending": "In Attesa",
    "in_progress": "In Elaborazione",
    "processing": "In Elaborazione",
    "waiting_approval": "In Attesa di Approvazione",
    "approved": "Approvata",
    "submitted": "Inviata",
    "escalated": "Escalation",
    "rejected": "Rifiutata",
}

# Maps practice status to the 6-step flow position (0-indexed)
# Steps: 0=Comprendi, 1=Carica, 2=Elabora, 3=Verifica, 4=Firma, 5=Completa
PRACTICE_STEP_MAP = {
    "draft": 0,
    "waiting_user_documents": 1,
    "documents_received": 1,
    "internal_processing": 2,
    "internal_validation_passed": 3,
    "internal_validation_failed": 3,
    "waiting_user_review": 3,
    "waiting_signature": 4,
    "ready_for_submission": 5,
    "submitted_manually": 5,
    "submitted_via_channel": 5,
    "waiting_external_response": 5,
    "accepted_by_entity": 5,
    "rejected_by_entity": 5,
    "completed": 5,
    "blocked": -1,
    # Legacy
    "pending": 1,
    "in_progress": 2,
    "processing": 2,
    "waiting_approval": 3,
    "approved": 5,
    "submitted": 5,
    "escalated": -1,
    "rejected": -1,
}

# User-facing status categories (simplified for UI)
USER_STATUS_DISPLAY = {
    "draft": {"label": "Non iniziata", "color": "#5B6475", "category": "not_started"},
    "waiting_user_documents": {"label": "In attesa dei tuoi documenti", "color": "#F59E0B", "category": "waiting_user"},
    "documents_received": {"label": "Documenti ricevuti", "color": "#3B82F6", "category": "under_review"},
    "internal_processing": {"label": "In revisione da Herion", "color": "#3B82F6", "category": "under_review"},
    "internal_validation_passed": {"label": "Revisione completata", "color": "#10B981", "category": "under_review"},
    "internal_validation_failed": {"label": "Problemi trovati", "color": "#EF4444", "category": "blocked"},
    "waiting_user_review": {"label": "In attesa della tua verifica", "color": "#F59E0B", "category": "waiting_user"},
    "waiting_signature": {"label": "In attesa della tua firma", "color": "#F59E0B", "category": "waiting_user"},
    "ready_for_submission": {"label": "Pronta per l'invio", "color": "#06B6D4", "category": "ready"},
    "submitted_manually": {"label": "Inviata", "color": "#06B6D4", "category": "submitted"},
    "submitted_via_channel": {"label": "Inviata", "color": "#06B6D4", "category": "submitted"},
    "waiting_external_response": {"label": "In attesa risposta ente", "color": "#8B5CF6", "category": "waiting_external"},
    "accepted_by_entity": {"label": "Accettata dall'ente", "color": "#10B981", "category": "completed"},
    "rejected_by_entity": {"label": "Rifiutata dall'ente", "color": "#EF4444", "category": "blocked"},
    "completed": {"label": "Completata", "color": "#10B981", "category": "completed"},
    "blocked": {"label": "Bloccata", "color": "#EF4444", "category": "blocked"},
    # Legacy
    "pending": {"label": "In attesa", "color": "#F59E0B", "category": "waiting_user"},
    "in_progress": {"label": "In elaborazione", "color": "#3B82F6", "category": "under_review"},
    "processing": {"label": "In elaborazione", "color": "#3B82F6", "category": "under_review"},
    "waiting_approval": {"label": "In attesa della tua verifica", "color": "#F59E0B", "category": "waiting_user"},
    "approved": {"label": "Approvata", "color": "#10B981", "category": "completed"},
    "submitted": {"label": "Inviata", "color": "#06B6D4", "category": "submitted"},
    "escalated": {"label": "Escalation", "color": "#EF4444", "category": "blocked"},
    "rejected": {"label": "Rifiutata", "color": "#EF4444", "category": "blocked"},
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
SPECIALIST_PIPELINE = ["intake", "ledger", "compliance", "documents", "delegate", "deadline", "flow", "routing", "research", "monitor", "advisor", "guard"]

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
    "guard_evaluated": "Herion Guard: valutazione confini",
    "guard_cleared": "Herion Guard: autorizzato",
    "guard_guarded": "Herion Guard: sorvegliato con avvertimenti",
    "guard_blocked": "Herion Guard: bloccato con alternative",
    "follow_up_created": "Follow-up creato",
    "follow_up_resolved": "Follow-up risolto",
    "follow_up_overdue": "Follow-up scaduto",
    "email_draft_created": "Bozza email creata",
    "email_submitted_review": "Email inviata in revisione",
    "email_approved": "Email approvata",
    "email_sent": "Email inviata",
    "email_send_failed": "Invio email fallito",
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
        final_status = "waiting_user_review"
        final_label = STATUS_LABELS["waiting_user_review"]
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

    await refresh_practice_priority(req.practice_id)

    return orchestration_result


@api_router.post("/practices/{practice_id}/run")
async def run_practice_workflow(practice_id: str, user: dict = Depends(get_current_user)):
    """Convenience wrapper: run full agent workflow for a practice."""
    req = OrchestrationRequest(practice_id=practice_id, query="Analisi completa della pratica")
    return await orchestrate_agents(req, user)


# ========================
# PRACTICE APPROVAL
# ========================

@api_router.post("/practices/{practice_id}/approve")
async def approve_practice(practice_id: str, user: dict = Depends(get_current_user)):
    practice = await db.practices.find_one({"id": practice_id, "user_id": user["id"]}, {"_id": 0})
    if not practice:
        raise HTTPException(status_code=404, detail="Pratica non trovata")

    if practice.get("status") not in ("waiting_approval", "waiting_user_review"):
        raise HTTPException(status_code=400, detail="La pratica non e in attesa di approvazione")

    # Governance check for approval
    perm = check_permission(user.get("role", "user"), "approve_practice")
    if not perm["allowed"]:
        await log_audit_event(user["id"], user.get("role", "user"), "approval_denied_permission", "practice", practice_id,
            reason=perm["reason"], severity="high", practice_id=practice_id)
        raise HTTPException(status_code=403, detail=perm["reason"])

    await log_audit_event(user["id"], user.get("role", "user"), "approval_granted", "practice", practice_id,
        previous_state="waiting_approval", new_state="approved", severity="medium", practice_id=practice_id)

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

    # Determine next status based on practice channel info
    catalog_entry = await db.practice_catalog.find_one({"practice_id": practice.get("practice_type", "")}, {"_id": 0})
    needs_external_submission = False
    if catalog_entry:
        channel = catalog_entry.get("expected_channel", "preparation_only")
        needs_external_submission = channel in ("official_portal", "PEC")

    if needs_external_submission:
        next_status = "ready_for_submission"
        next_label = STATUS_LABELS["ready_for_submission"]
        message = "Pratica approvata. Pronta per l'invio all'ente competente."
    else:
        next_status = "completed"
        next_label = STATUS_LABELS["completed"]
        message = "Pratica approvata e completata."

    await db.practices.update_one(
        {"id": practice_id},
        {"$set": {
            "status": next_status,
            "status_label": next_label,
            "approval_snapshot_id": approval_snapshot["id"],
            "approved_at": now,
            "completed_at": now if next_status == "completed" else None,
            "updated_at": now
        }}
    )
    await add_timeline_event(practice_id, user["id"], "approved", {
        "approval_snapshot_id": approval_snapshot["id"],
        "risk_level": orchestration.get("risk_level"),
        "next_status": next_status
    })

    if next_status == "completed":
        await add_timeline_event(practice_id, user["id"], "completed", {
            "note": "Pratica completata — nessun invio esterno richiesto"
        })

    await log_activity(user["id"], "practice", "practice_approved", {
        "practice_id": practice_id,
        "approval_snapshot_id": approval_snapshot["id"]
    })

    await create_notification(user["id"], "Pratica Approvata",
        f"La pratica '{practice.get('practice_type_label')}' e stata approvata. {message}", "success")

    approval_snapshot.pop("_id", None)
    await refresh_practice_priority(practice_id)

    return {
        "message": message,
        "approval_snapshot": approval_snapshot,
        "final_status": next_status,
        "needs_external_submission": needs_external_submission,
    }


class SubmissionMarkRequest(BaseModel):
    submission_type: str = "manual"  # "manual" or "channel"
    notes: Optional[str] = None


@api_router.post("/practices/{practice_id}/start")
async def start_practice(practice_id: str, user: dict = Depends(get_current_user)):
    """Transition from draft to waiting_user_documents (user acknowledged understanding)."""
    practice = await db.practices.find_one({"id": practice_id, "user_id": user["id"]}, {"_id": 0})
    if not practice:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    if practice.get("status") != "draft":
        raise HTTPException(status_code=400, detail="La pratica non e in stato bozza")

    now = datetime.now(timezone.utc).isoformat()
    await db.practices.update_one(
        {"id": practice_id},
        {"$set": {
            "status": "waiting_user_documents",
            "status_label": STATUS_LABELS["waiting_user_documents"],
            "updated_at": now
        }}
    )
    await add_timeline_event(practice_id, user["id"], "status_changed", {
        "from": "draft", "to": "waiting_user_documents",
        "note": "Utente ha compreso la pratica e iniziato il percorso"
    })
    await log_activity(user["id"], "practice", "practice_started", {"practice_id": practice_id})
    await refresh_practice_priority(practice_id)
    return {"message": "Pratica avviata", "status": "waiting_user_documents"}


@api_router.post("/practices/{practice_id}/mark-submitted")
async def mark_practice_submitted(practice_id: str, req: SubmissionMarkRequest, user: dict = Depends(get_current_user)):
    """User marks practice as submitted (manually or via channel)."""
    practice = await db.practices.find_one({"id": practice_id, "user_id": user["id"]}, {"_id": 0})
    if not practice:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    if practice.get("status") != "ready_for_submission":
        raise HTTPException(status_code=400, detail="La pratica non e pronta per l'invio")

    now = datetime.now(timezone.utc).isoformat()
    new_status = "submitted_manually" if req.submission_type == "manual" else "submitted_via_channel"

    await db.practices.update_one(
        {"id": practice_id},
        {"$set": {
            "status": new_status,
            "status_label": STATUS_LABELS[new_status],
            "submitted_at": now,
            "updated_at": now
        }}
    )
    await add_timeline_event(practice_id, user["id"], "submitted", {
        "submission_type": req.submission_type,
        "notes": req.notes
    })
    await log_activity(user["id"], "practice", "practice_submitted", {
        "practice_id": practice_id, "submission_type": req.submission_type
    })
    await create_notification(user["id"], "Pratica Inviata",
        f"Hai confermato l'invio della pratica '{practice.get('practice_type_label')}'.", "success")
    await refresh_practice_priority(practice_id)
    return {"message": "Invio confermato", "status": new_status}


@api_router.post("/practices/{practice_id}/mark-completed")
async def mark_practice_completed(practice_id: str, user: dict = Depends(get_current_user)):
    """User marks practice as fully completed (accepted by entity or done)."""
    practice = await db.practices.find_one({"id": practice_id, "user_id": user["id"]}, {"_id": 0})
    if not practice:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    if practice.get("status") not in ("submitted_manually", "submitted_via_channel", "waiting_external_response", "accepted_by_entity"):
        raise HTTPException(status_code=400, detail="La pratica non e in uno stato che permette la chiusura")

    now = datetime.now(timezone.utc).isoformat()
    await db.practices.update_one(
        {"id": practice_id},
        {"$set": {
            "status": "completed",
            "status_label": STATUS_LABELS["completed"],
            "completed_at": now,
            "updated_at": now
        }}
    )
    await add_timeline_event(practice_id, user["id"], "completed", {
        "note": "Pratica completata dall'utente"
    })
    await log_activity(user["id"], "practice", "practice_completed", {"practice_id": practice_id})
    await create_notification(user["id"], "Pratica Completata",
        f"La pratica '{practice.get('practice_type_label')}' e stata completata.", "success")
    await refresh_practice_priority(practice_id)
    return {"message": "Pratica completata", "status": "completed"}

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
# EMAIL DRAFT / REVIEW / SEND SYSTEM
# ========================

EMAIL_STATUSES = {
    "draft": "Bozza",
    "review": "In revisione",
    "approved": "Approvata",
    "sending": "In invio",
    "sent": "Inviata",
    "failed": "Invio fallito",
    "blocked": "Bloccata",
}

# Shared HTML helpers
_SIG = '<p style="color: #475569; font-size: 13px; line-height: 1.5; margin-top: 20px;">Un caro saluto,<br/><strong style="color: #0F4C5C;">Il team Herion</strong></p><p style="color: #94A3B8; font-size: 11px; margin-top: 16px;">Herion — Gestione fiscale operativa per l\'Italia</p>'
_BTN = lambda txt, href: f'<div style="text-align:center;margin:24px 0;"><a href="{href}" style="background:#0F4C5C;color:#fff;padding:11px 26px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;">{txt}</a></div>'

EMAIL_TEMPLATES = {
    # ─── A. PRIVATE USERS ───
    "private_missing_docs": {
        "id": "private_missing_docs", "group": "private", "group_label": "Privati",
        "name": "Richiesta documenti mancanti (privato)",
        "subject": "Herion — Documenti necessari per la tua pratica [nome_pratica]",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Ciao <strong>[Nome]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">ti scriviamo perche per la tua pratica <strong>[nome_pratica]</strong> (codice: [codice_pratica]) risultano ancora alcuni documenti necessari per poter proseguire.</p><p style="color:#475569;font-size:14px;line-height:1.6;"><strong>Documenti mancanti:</strong></p><div style="background:#F7FAFC;border-radius:8px;padding:14px;margin:12px 0;">[elenco_documenti]</div><p style="color:#475569;font-size:14px;line-height:1.6;">Puoi caricarli direttamente dalla piattaforma accedendo alla tua pratica.</p>' + _BTN("Vai alla pratica", "[link_pratica]") + '<p style="color:#475569;font-size:14px;line-height:1.6;"><strong>Prossimo passo:</strong> [prossimo_step]</p>' + _SIG,
        "placeholders": ["Nome", "nome_pratica", "codice_pratica", "elenco_documenti", "link_pratica", "prossimo_step"],
        "user_types": ["private"], "practice_types": [],
    },
    "private_status_update": {
        "id": "private_status_update", "group": "private", "group_label": "Privati",
        "name": "Aggiornamento stato pratica (privato)",
        "subject": "Herion — Aggiornamento sulla tua pratica [nome_pratica]",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Ciao <strong>[Nome]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">ti aggiorniamo sullo stato della tua pratica <strong>[nome_pratica]</strong>.</p><div style="background:#F7FAFC;border-radius:8px;padding:14px;margin:12px 0;"><p style="margin:0;font-size:13px;"><strong>Stato attuale:</strong> [stato_pratica]</p><p style="margin:6px 0 0;font-size:13px;"><strong>Tipo pratica:</strong> [tipo_pratica]</p></div><p style="color:#475569;font-size:14px;line-height:1.6;">[azione_richiesta]</p>' + _BTN("Vai alla pratica", "[link_pratica]") + '<p style="color:#475569;font-size:14px;line-height:1.6;"><strong>Prossimo passo:</strong> [prossimo_step]</p>' + _SIG,
        "placeholders": ["Nome", "nome_pratica", "stato_pratica", "tipo_pratica", "azione_richiesta", "link_pratica", "prossimo_step"],
        "user_types": ["private"], "practice_types": [],
    },
    "private_reminder": {
        "id": "private_reminder", "group": "private", "group_label": "Privati",
        "name": "Promemoria pratica (privato)",
        "subject": "Herion — Promemoria: la tua pratica [nome_pratica] richiede attenzione",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Ciao <strong>[Nome]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">ti ricordiamo che la pratica <strong>[nome_pratica]</strong> e in attesa di un tuo intervento.</p><div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;padding:14px;margin:12px 0;"><p style="margin:0;font-size:13px;color:#9A3412;"><strong>Azione richiesta:</strong> [azione_richiesta]</p><p style="margin:6px 0 0;font-size:13px;color:#9A3412;"><strong>Scadenza:</strong> [data_scadenza]</p></div><p style="color:#475569;font-size:14px;line-height:1.6;">Non ti preoccupare, siamo qui per aiutarti. Accedi alla piattaforma per completare quanto necessario.</p>' + _BTN("Completa ora", "[link_pratica]") + _SIG,
        "placeholders": ["Nome", "nome_pratica", "azione_richiesta", "data_scadenza", "link_pratica"],
        "user_types": ["private"], "practice_types": [],
    },
    "private_blocked": {
        "id": "private_blocked", "group": "private", "group_label": "Privati",
        "name": "Pratica bloccata (privato)",
        "subject": "Herion — La tua pratica [nome_pratica] e momentaneamente sospesa",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Ciao <strong>[Nome]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">ti informiamo che la pratica <strong>[nome_pratica]</strong> non puo proseguire al momento.</p><div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:14px;margin:12px 0;"><p style="margin:0;font-size:13px;color:#991B1B;"><strong>Motivo:</strong> [elemento_mancante]</p></div><p style="color:#475569;font-size:14px;line-height:1.6;">Per sbloccare la situazione, ti chiediamo di: <strong>[azione_richiesta]</strong></p>' + _BTN("Vai alla pratica", "[link_pratica]") + '<p style="color:#475569;font-size:14px;line-height:1.6;">Se hai bisogno di aiuto, rispondi a questa email e ti assisteremo.</p>' + _SIG,
        "placeholders": ["Nome", "nome_pratica", "elemento_mancante", "azione_richiesta", "link_pratica"],
        "user_types": ["private"], "practice_types": [],
    },
    "private_dossier_delivery": {
        "id": "private_dossier_delivery", "group": "private", "group_label": "Privati",
        "name": "Consegna dossier finale (privato)",
        "subject": "Herion — Il dossier della tua pratica [nome_pratica] e pronto",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Ciao <strong>[Nome]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">siamo lieti di comunicarti che il dossier finale della tua pratica <strong>[nome_pratica]</strong> e stato completato ed e disponibile per il download.</p><div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;padding:14px;margin:12px 0;"><p style="margin:0;font-size:13px;color:#065F46;"><strong>Pratica completata con successo</strong></p><p style="margin:6px 0 0;font-size:13px;color:#065F46;">Tutti i documenti sono stati verificati e archiviati.</p></div>' + _BTN("Scarica il dossier", "[link_pratica]") + '<p style="color:#475569;font-size:14px;line-height:1.6;">Ti consigliamo di conservare una copia dei documenti per i tuoi archivi.</p>' + _SIG,
        "placeholders": ["Nome", "nome_pratica", "link_pratica"],
        "user_types": ["private"], "practice_types": [],
    },
    # ─── B. FREELANCERS ───
    "freelancer_vat_missing_docs": {
        "id": "freelancer_vat_missing_docs", "group": "freelancer", "group_label": "Liberi Professionisti",
        "name": "Documenti mancanti IVA (libero professionista)",
        "subject": "Herion — Documenti necessari per la pratica IVA [nome_pratica]",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Gentile <strong>[Nome]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">per procedere con la tua pratica <strong>[nome_pratica]</strong> relativa alla Partita IVA, abbiamo bisogno dei seguenti documenti:</p><div style="background:#F7FAFC;border-radius:8px;padding:14px;margin:12px 0;">[elenco_documenti]</div><p style="color:#475569;font-size:14px;line-height:1.6;">Carica i documenti direttamente sulla piattaforma per permetterci di procedere con la verifica.</p>' + _BTN("Carica documenti", "[link_pratica]") + '<p style="color:#475569;font-size:14px;line-height:1.6;"><strong>Prossimo passo:</strong> [prossimo_step]</p>' + _SIG,
        "placeholders": ["Nome", "nome_pratica", "elenco_documenti", "link_pratica", "prossimo_step"],
        "user_types": ["freelancer"], "practice_types": ["VAT_OPEN_PF", "VAT_VARIATION_PF", "VAT_CLOSURE_PF"],
    },
    "freelancer_f24_update": {
        "id": "freelancer_f24_update", "group": "freelancer", "group_label": "Liberi Professionisti",
        "name": "Aggiornamento F24 / supporto fiscale",
        "subject": "Herion — Aggiornamento sulla tua pratica fiscale [nome_pratica]",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Gentile <strong>[Nome]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">ti aggiorniamo sulla pratica <strong>[nome_pratica]</strong> relativa al supporto fiscale F24.</p><div style="background:#F7FAFC;border-radius:8px;padding:14px;margin:12px 0;"><p style="margin:0;font-size:13px;"><strong>Stato:</strong> [stato_pratica]</p><p style="margin:6px 0 0;font-size:13px;"><strong>Tipo:</strong> [tipo_pratica]</p></div><p style="color:#475569;font-size:14px;line-height:1.6;">[azione_richiesta]</p>' + _BTN("Vai alla pratica", "[link_pratica]") + _SIG,
        "placeholders": ["Nome", "nome_pratica", "stato_pratica", "tipo_pratica", "azione_richiesta", "link_pratica"],
        "user_types": ["freelancer"], "practice_types": ["F24_PREPARATION", "F24_WEB"],
    },
    "freelancer_approval_request": {
        "id": "freelancer_approval_request", "group": "freelancer", "group_label": "Liberi Professionisti",
        "name": "Richiesta approvazione (libero professionista)",
        "subject": "Herion — La tua approvazione e necessaria per [nome_pratica]",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Gentile <strong>[Nome]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">la pratica <strong>[nome_pratica]</strong> e stata analizzata dai nostri agenti ed e pronta per la tua approvazione.</p><p style="color:#475569;font-size:14px;line-height:1.6;">Prima di procedere all\'invio, ti chiediamo di verificare che tutti i dati siano corretti e di confermare con la tua approvazione esplicita.</p>' + _BTN("Rivedi e approva", "[link_pratica]") + '<p style="color:#94A3B8;font-size:12px;">Nessuna azione sara intrapresa senza la tua conferma.</p>' + _SIG,
        "placeholders": ["Nome", "nome_pratica", "link_pratica"],
        "user_types": ["freelancer"], "practice_types": [],
    },
    "freelancer_blocked": {
        "id": "freelancer_blocked", "group": "freelancer", "group_label": "Liberi Professionisti",
        "name": "Pratica bloccata (libero professionista)",
        "subject": "Herion — La pratica [nome_pratica] richiede il tuo intervento",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Gentile <strong>[Nome]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">la pratica <strong>[nome_pratica]</strong> non puo proseguire per il seguente motivo:</p><div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:14px;margin:12px 0;"><p style="margin:0;font-size:13px;color:#991B1B;"><strong>[elemento_mancante]</strong></p></div><p style="color:#475569;font-size:14px;line-height:1.6;">Per risolvere: <strong>[azione_richiesta]</strong></p>' + _BTN("Risolvi ora", "[link_pratica]") + _SIG,
        "placeholders": ["Nome", "nome_pratica", "elemento_mancante", "azione_richiesta", "link_pratica"],
        "user_types": ["freelancer"], "practice_types": [],
    },
    "freelancer_delivery": {
        "id": "freelancer_delivery", "group": "freelancer", "group_label": "Liberi Professionisti",
        "name": "Consegna documenti finale (libero professionista)",
        "subject": "Herion — Documenti pronti per [nome_pratica]",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Gentile <strong>[Nome]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">il pacchetto documentale per <strong>[nome_pratica]</strong> e completo e disponibile.</p><div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;padding:14px;margin:12px 0;"><p style="margin:0;font-size:13px;color:#065F46;"><strong>Documenti verificati e pronti</strong></p></div>' + _BTN("Scarica documenti", "[link_pratica]") + '<p style="color:#475569;font-size:14px;line-height:1.6;">Conserva una copia per i tuoi archivi professionali.</p>' + _SIG,
        "placeholders": ["Nome", "nome_pratica", "link_pratica"],
        "user_types": ["freelancer"], "practice_types": [],
    },
    # ─── C. COMPANIES ───
    "company_status_update": {
        "id": "company_status_update", "group": "company", "group_label": "Aziende",
        "name": "Aggiornamento pratica societaria",
        "subject": "Herion — Aggiornamento pratica [nome_pratica] per [nome_azienda]",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Gentile referente di <strong>[nome_azienda]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">le comunichiamo un aggiornamento sulla pratica <strong>[nome_pratica]</strong>.</p><div style="background:#F7FAFC;border-radius:8px;padding:14px;margin:12px 0;"><p style="margin:0;font-size:13px;"><strong>Stato:</strong> [stato_pratica]</p><p style="margin:6px 0 0;font-size:13px;"><strong>Codice:</strong> [codice_pratica]</p></div><p style="color:#475569;font-size:14px;line-height:1.6;">[azione_richiesta]</p>' + _BTN("Accedi alla pratica", "[link_pratica]") + _SIG,
        "placeholders": ["nome_azienda", "nome_pratica", "stato_pratica", "codice_pratica", "azione_richiesta", "link_pratica"],
        "user_types": ["company"], "practice_types": [],
    },
    "company_delegation_required": {
        "id": "company_delegation_required", "group": "company", "group_label": "Aziende",
        "name": "Delega richiesta (azienda)",
        "subject": "Herion — Delega necessaria per [nome_pratica] di [nome_azienda]",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Gentile referente di <strong>[nome_azienda]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">per procedere con la pratica <strong>[nome_pratica]</strong>, e necessario caricare una delega firmata.</p><div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;padding:14px;margin:12px 0;"><p style="margin:0;font-size:13px;color:#9A3412;"><strong>Documento richiesto:</strong> Delega firmata (formato PDF o P7M con firma digitale)</p></div><p style="color:#475569;font-size:14px;line-height:1.6;">Senza la delega valida, la pratica non potra essere inoltrata all\'ente competente.</p>' + _BTN("Carica la delega", "[link_pratica]") + _SIG,
        "placeholders": ["nome_azienda", "nome_pratica", "link_pratica"],
        "user_types": ["company"], "practice_types": ["COMPANY_CLOSURE"],
    },
    "company_signed_doc_required": {
        "id": "company_signed_doc_required", "group": "company", "group_label": "Aziende",
        "name": "Documento firmato richiesto (azienda)",
        "subject": "Herion — Firma digitale necessaria per [nome_pratica]",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Gentile referente di <strong>[nome_azienda]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">per la pratica <strong>[nome_pratica]</strong>, alcuni documenti richiedono la firma digitale (P7M o PAdES).</p><div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:14px;margin:12px 0;"><p style="margin:0;font-size:13px;color:#991B1B;"><strong>Documenti da firmare:</strong></p><p style="margin:6px 0 0;font-size:13px;color:#991B1B;">[elenco_documenti]</p></div><p style="color:#475569;font-size:14px;line-height:1.6;">Carica le versioni firmate digitalmente per poter proseguire.</p>' + _BTN("Carica documenti firmati", "[link_pratica]") + _SIG,
        "placeholders": ["nome_azienda", "nome_pratica", "elenco_documenti", "link_pratica"],
        "user_types": ["company"], "practice_types": [],
    },
    "company_blocked": {
        "id": "company_blocked", "group": "company", "group_label": "Aziende",
        "name": "Pratica societaria bloccata",
        "subject": "Herion — Pratica [nome_pratica] sospesa per [nome_azienda]",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Gentile referente di <strong>[nome_azienda]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">la pratica <strong>[nome_pratica]</strong> e attualmente sospesa.</p><div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:14px;margin:12px 0;"><p style="margin:0;font-size:13px;color:#991B1B;"><strong>Motivo:</strong> [elemento_mancante]</p></div><p style="color:#475569;font-size:14px;line-height:1.6;">Per ripristinare la pratica: <strong>[azione_richiesta]</strong></p>' + _BTN("Risolvi", "[link_pratica]") + _SIG,
        "placeholders": ["nome_azienda", "nome_pratica", "elemento_mancante", "azione_richiesta", "link_pratica"],
        "user_types": ["company"], "practice_types": [],
    },
    "company_dossier_delivery": {
        "id": "company_dossier_delivery", "group": "company", "group_label": "Aziende",
        "name": "Consegna dossier societario",
        "subject": "Herion — Dossier completo per [nome_pratica] di [nome_azienda]",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Gentile referente di <strong>[nome_azienda]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">il dossier completo per la pratica <strong>[nome_pratica]</strong> e stato finalizzato e verificato.</p><div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;padding:14px;margin:12px 0;"><p style="margin:0;font-size:13px;color:#065F46;"><strong>Pratica completata</strong></p><p style="margin:6px 0 0;font-size:13px;color:#065F46;">Documentazione verificata, archiviata e pronta per il download.</p></div>' + _BTN("Scarica il dossier", "[link_pratica]") + '<p style="color:#475569;font-size:14px;line-height:1.6;">Si consiglia di conservare una copia completa negli archivi aziendali.</p>' + _SIG,
        "placeholders": ["nome_azienda", "nome_pratica", "link_pratica"],
        "user_types": ["company"], "practice_types": [],
    },
    # ─── D. BLOCKED PRACTICES ───
    "blocked_missing_doc": {
        "id": "blocked_missing_doc", "group": "blocked", "group_label": "Pratiche Bloccate",
        "name": "Blocco: documenti mancanti",
        "subject": "Herion — Pratica [nome_pratica]: documenti mancanti",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Gentile <strong>[Nome]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">la pratica <strong>[nome_pratica]</strong> non puo proseguire perche mancano uno o piu documenti obbligatori.</p><div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:14px;margin:12px 0;"><p style="margin:0;font-size:13px;color:#991B1B;"><strong>Documenti mancanti:</strong></p>[elenco_documenti]</div>' + _BTN("Carica documenti", "[link_pratica]") + _SIG,
        "placeholders": ["Nome", "nome_pratica", "elenco_documenti", "link_pratica"],
        "user_types": ["private", "freelancer", "company"], "practice_types": [],
    },
    "blocked_missing_delegation": {
        "id": "blocked_missing_delegation", "group": "blocked", "group_label": "Pratiche Bloccate",
        "name": "Blocco: delega mancante",
        "subject": "Herion — Pratica [nome_pratica]: delega necessaria",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Gentile <strong>[Nome]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">la pratica <strong>[nome_pratica]</strong> richiede una delega firmata per poter proseguire.</p><div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:14px;margin:12px 0;"><p style="margin:0;font-size:13px;color:#991B1B;">La delega deve essere in formato PDF o P7M con firma digitale valida.</p></div>' + _BTN("Carica la delega", "[link_pratica]") + _SIG,
        "placeholders": ["Nome", "nome_pratica", "link_pratica"],
        "user_types": ["private", "freelancer", "company"], "practice_types": [],
    },
    "blocked_approval": {
        "id": "blocked_approval", "group": "blocked", "group_label": "Pratiche Bloccate",
        "name": "Blocco: approvazione mancante",
        "subject": "Herion — Pratica [nome_pratica]: in attesa della tua approvazione",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Gentile <strong>[Nome]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">la pratica <strong>[nome_pratica]</strong> e stata analizzata ed e pronta, ma richiede la tua approvazione esplicita prima di procedere.</p><div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;padding:14px;margin:12px 0;"><p style="margin:0;font-size:13px;color:#9A3412;">Nessun invio verra effettuato senza la tua conferma.</p></div>' + _BTN("Rivedi e approva", "[link_pratica]") + _SIG,
        "placeholders": ["Nome", "nome_pratica", "link_pratica"],
        "user_types": ["private", "freelancer", "company"], "practice_types": [],
    },
    "blocked_routing": {
        "id": "blocked_routing", "group": "blocked", "group_label": "Pratiche Bloccate",
        "name": "Blocco: routing non chiaro",
        "subject": "Herion — Pratica [nome_pratica]: destinazione da verificare",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Gentile <strong>[Nome]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">per la pratica <strong>[nome_pratica]</strong>, non e stato possibile determinare con certezza la destinazione corretta.</p><p style="color:#475569;font-size:14px;line-height:1.6;">Un nostro operatore verifichera il canale e la destinazione appropriata. Ti aggiorneremo appena la situazione sara chiarita.</p>' + _BTN("Dettagli pratica", "[link_pratica]") + _SIG,
        "placeholders": ["Nome", "nome_pratica", "link_pratica"],
        "user_types": ["private", "freelancer", "company"], "practice_types": [],
    },
    "blocked_signature": {
        "id": "blocked_signature", "group": "blocked", "group_label": "Pratiche Bloccate",
        "name": "Blocco: firma digitale mancante",
        "subject": "Herion — Pratica [nome_pratica]: firma digitale richiesta",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Gentile <strong>[Nome]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">alcuni documenti della pratica <strong>[nome_pratica]</strong> richiedono una firma digitale valida (P7M o PAdES) per poter proseguire.</p><div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:14px;margin:12px 0;"><p style="margin:0;font-size:13px;color:#991B1B;"><strong>Documenti da firmare:</strong></p>[elenco_documenti]</div><p style="color:#475569;font-size:14px;line-height:1.6;">Carica le versioni firmate per sbloccare la pratica.</p>' + _BTN("Carica firmati", "[link_pratica]") + _SIG,
        "placeholders": ["Nome", "nome_pratica", "elenco_documenti", "link_pratica"],
        "user_types": ["private", "freelancer", "company"], "practice_types": [],
    },
    "blocked_sensitive_attachment": {
        "id": "blocked_sensitive_attachment", "group": "blocked", "group_label": "Pratiche Bloccate",
        "name": "Blocco: allegato riservato non inviabile",
        "subject": "Herion — Pratica [nome_pratica]: allegato riservato",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Gentile <strong>[Nome]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">un documento allegato alla pratica <strong>[nome_pratica]</strong> e classificato come riservato e non puo essere inviato via email per motivi di sicurezza.</p><div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:14px;margin:12px 0;"><p style="margin:0;font-size:13px;color:#991B1B;"><strong>[elemento_mancante]</strong></p></div><p style="color:#475569;font-size:14px;line-height:1.6;">Contatta l\'amministratore per definire una modalita di consegna sicura.</p>' + _SIG,
        "placeholders": ["Nome", "nome_pratica", "elemento_mancante"],
        "user_types": ["private", "freelancer", "company"], "practice_types": [],
    },
    # ─── F. APPROVAL FLOW ───
    "approval_requested": {
        "id": "approval_requested", "group": "approval", "group_label": "Flusso Approvazione",
        "name": "Approvazione richiesta",
        "subject": "Herion — La tua approvazione e necessaria per [nome_pratica]",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Gentile <strong>[Nome]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">la pratica <strong>[nome_pratica]</strong> ([tipo_pratica]) e stata analizzata dai nostri agenti specializzati ed e ora pronta per la tua revisione.</p><p style="color:#475569;font-size:14px;line-height:1.6;">Ti chiediamo di verificare i dati, i documenti e il riepilogo, e di confermare la tua approvazione.</p>' + _BTN("Rivedi e approva", "[link_pratica]") + '<p style="color:#94A3B8;font-size:12px;">Herion non procedera con nessun invio senza la tua esplicita approvazione.</p>' + _SIG,
        "placeholders": ["Nome", "nome_pratica", "tipo_pratica", "link_pratica"],
        "user_types": ["private", "freelancer", "company"], "practice_types": [],
    },
    "approval_reminder": {
        "id": "approval_reminder", "group": "approval", "group_label": "Flusso Approvazione",
        "name": "Promemoria approvazione",
        "subject": "Herion — Promemoria: approvazione in attesa per [nome_pratica]",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Gentile <strong>[Nome]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">ti ricordiamo che la pratica <strong>[nome_pratica]</strong> e in attesa della tua approvazione da diverso tempo.</p><div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;padding:14px;margin:12px 0;"><p style="margin:0;font-size:13px;color:#9A3412;"><strong>Scadenza consigliata:</strong> [data_scadenza]</p></div><p style="color:#475569;font-size:14px;line-height:1.6;">Se hai bisogno di chiarimenti, rispondi a questa email.</p>' + _BTN("Approva ora", "[link_pratica]") + _SIG,
        "placeholders": ["Nome", "nome_pratica", "data_scadenza", "link_pratica"],
        "user_types": ["private", "freelancer", "company"], "practice_types": [],
    },
    "approval_confirmed": {
        "id": "approval_confirmed", "group": "approval", "group_label": "Flusso Approvazione",
        "name": "Conferma approvazione ricevuta",
        "subject": "Herion — Approvazione confermata per [nome_pratica]",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Gentile <strong>[Nome]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">la tua approvazione per la pratica <strong>[nome_pratica]</strong> e stata registrata con successo.</p><div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;padding:14px;margin:12px 0;"><p style="margin:0;font-size:13px;color:#065F46;"><strong>Approvazione confermata</strong></p><p style="margin:6px 0 0;font-size:13px;color:#065F46;">Prossimo passo: [prossimo_step]</p></div>' + _BTN("Segui la pratica", "[link_pratica]") + _SIG,
        "placeholders": ["Nome", "nome_pratica", "prossimo_step", "link_pratica"],
        "user_types": ["private", "freelancer", "company"], "practice_types": [],
    },
    # ─── G. DELEGATION FLOW ───
    "delegation_requested": {
        "id": "delegation_requested", "group": "delegation", "group_label": "Flusso Delega",
        "name": "Delega richiesta",
        "subject": "Herion — Delega necessaria per la pratica [nome_pratica]",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Gentile <strong>[Nome]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">per la pratica <strong>[nome_pratica]</strong> e necessario caricare un documento di delega firmato.</p><p style="color:#475569;font-size:14px;line-height:1.6;">La delega autorizza Herion o un intermediario a gestire la pratica per vostro conto presso l\'ente competente.</p><div style="background:#F7FAFC;border-radius:8px;padding:14px;margin:12px 0;"><p style="margin:0;font-size:13px;"><strong>Formati accettati:</strong> PDF, P7M (firma digitale CAdES)</p><p style="margin:6px 0 0;font-size:13px;"><strong>Requisiti:</strong> Firma del legale rappresentante o del titolare</p></div>' + _BTN("Carica la delega", "[link_pratica]") + _SIG,
        "placeholders": ["Nome", "nome_pratica", "link_pratica"],
        "user_types": ["private", "freelancer", "company"], "practice_types": [],
    },
    "delegation_under_review": {
        "id": "delegation_under_review", "group": "delegation", "group_label": "Flusso Delega",
        "name": "Delega in fase di verifica",
        "subject": "Herion — Delega per [nome_pratica] in verifica",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Gentile <strong>[Nome]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">la delega caricata per la pratica <strong>[nome_pratica]</strong> e ora in fase di verifica.</p><p style="color:#475569;font-size:14px;line-height:1.6;">Riceverai una conferma non appena la verifica sara completata. Non e necessaria alcuna azione da parte tua al momento.</p>' + _SIG,
        "placeholders": ["Nome", "nome_pratica"],
        "user_types": ["private", "freelancer", "company"], "practice_types": [],
    },
    "delegation_rejected": {
        "id": "delegation_rejected", "group": "delegation", "group_label": "Flusso Delega",
        "name": "Delega respinta",
        "subject": "Herion — Delega per [nome_pratica] non valida",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Gentile <strong>[Nome]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">purtroppo la delega caricata per la pratica <strong>[nome_pratica]</strong> non ha superato la verifica.</p><div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:14px;margin:12px 0;"><p style="margin:0;font-size:13px;color:#991B1B;"><strong>Motivo:</strong> [elemento_mancante]</p></div><p style="color:#475569;font-size:14px;line-height:1.6;">Ti chiediamo di caricare una nuova delega corretta.</p>' + _BTN("Carica nuova delega", "[link_pratica]") + _SIG,
        "placeholders": ["Nome", "nome_pratica", "elemento_mancante", "link_pratica"],
        "user_types": ["private", "freelancer", "company"], "practice_types": [],
    },
    "delegation_valid": {
        "id": "delegation_valid", "group": "delegation", "group_label": "Flusso Delega",
        "name": "Delega confermata valida",
        "subject": "Herion — Delega per [nome_pratica] confermata",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Gentile <strong>[Nome]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">la delega per la pratica <strong>[nome_pratica]</strong> e stata verificata e confermata come valida.</p><div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;padding:14px;margin:12px 0;"><p style="margin:0;font-size:13px;color:#065F46;"><strong>Delega valida</strong></p><p style="margin:6px 0 0;font-size:13px;color:#065F46;">La pratica puo ora proseguire regolarmente.</p></div>' + _BTN("Vai alla pratica", "[link_pratica]") + _SIG,
        "placeholders": ["Nome", "nome_pratica", "link_pratica"],
        "user_types": ["private", "freelancer", "company"], "practice_types": [],
    },
    # ─── H. FINAL DELIVERY ───
    "delivery_dossier_ready": {
        "id": "delivery_dossier_ready", "group": "delivery", "group_label": "Consegna Finale",
        "name": "Dossier finale pronto",
        "subject": "Herion — Dossier finale pronto per [nome_pratica]",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Gentile <strong>[Nome]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">il dossier finale per la pratica <strong>[nome_pratica]</strong> e stato completato.</p><div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;padding:14px;margin:12px 0;"><p style="margin:0;font-size:13px;color:#065F46;"><strong>Contenuto del dossier:</strong></p><p style="margin:6px 0 0;font-size:13px;color:#065F46;">[elenco_documenti]</p></div>' + _BTN("Scarica il dossier", "[link_pratica]") + _SIG,
        "placeholders": ["Nome", "nome_pratica", "elenco_documenti", "link_pratica"],
        "user_types": ["private", "freelancer", "company"], "practice_types": [],
    },
    "delivery_pdf_report": {
        "id": "delivery_pdf_report", "group": "delivery", "group_label": "Consegna Finale",
        "name": "Report PDF pronto",
        "subject": "Herion — Report PDF della pratica [nome_pratica]",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Gentile <strong>[Nome]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">il report PDF riassuntivo per <strong>[nome_pratica]</strong> e disponibile per il download.</p>' + _BTN("Scarica il report", "[link_pratica]") + '<p style="color:#475569;font-size:14px;line-height:1.6;">Conserva il documento per i tuoi archivi.</p>' + _SIG,
        "placeholders": ["Nome", "nome_pratica", "link_pratica"],
        "user_types": ["private", "freelancer", "company"], "practice_types": [],
    },
    "delivery_package_sent": {
        "id": "delivery_package_sent", "group": "delivery", "group_label": "Consegna Finale",
        "name": "Pacchetto pratica inviato",
        "subject": "Herion — Pratica [nome_pratica] completata e inviata",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Gentile <strong>[Nome]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">la pratica <strong>[nome_pratica]</strong> e stata completata e il pacchetto documentale e stato inviato all\'ente competente.</p><div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;padding:14px;margin:12px 0;"><p style="margin:0;font-size:13px;color:#065F46;"><strong>Stato: Inviata con successo</strong></p><p style="margin:6px 0 0;font-size:13px;color:#065F46;">Potrai seguire eventuali aggiornamenti dalla piattaforma.</p></div>' + _BTN("Segui la pratica", "[link_pratica]") + _SIG,
        "placeholders": ["Nome", "nome_pratica", "link_pratica"],
        "user_types": ["private", "freelancer", "company"], "practice_types": [],
    },
    # ─── I. REMINDER / FOLLOW-UP ───
    "reminder_generic": {
        "id": "reminder_generic", "group": "reminder", "group_label": "Promemoria",
        "name": "Promemoria generico",
        "subject": "Herion — Promemoria per la pratica [nome_pratica]",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Gentile <strong>[Nome]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">ti ricordiamo che la pratica <strong>[nome_pratica]</strong> richiede la tua attenzione.</p><div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;padding:14px;margin:12px 0;"><p style="margin:0;font-size:13px;color:#9A3412;"><strong>Azione richiesta:</strong> [azione_richiesta]</p><p style="margin:6px 0 0;font-size:13px;color:#9A3412;"><strong>Scadenza:</strong> [data_scadenza]</p></div>' + _BTN("Vai alla pratica", "[link_pratica]") + _SIG,
        "placeholders": ["Nome", "nome_pratica", "azione_richiesta", "data_scadenza", "link_pratica"],
        "user_types": ["private", "freelancer", "company"], "practice_types": [],
    },
    # ─── J. ACCOUNT / SECURITY ───
    "account_password_reset": {
        "id": "account_password_reset", "group": "account", "group_label": "Account e Sicurezza",
        "name": "Ripristino password",
        "subject": "Herion — Reimposta la tua password",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Ciao <strong>[Nome]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">hai richiesto il ripristino della password del tuo account Herion. Clicca il pulsante qui sotto per procedere.</p>' + _BTN("Reimposta Password", "[link_reset_password]") + '<p style="color:#94A3B8;font-size:12px;line-height:1.5;">Il link scade tra 1 ora. Se non hai richiesto tu il ripristino, ignora questa email.</p>' + _SIG,
        "placeholders": ["Nome", "link_reset_password"],
        "user_types": ["private", "freelancer", "company"], "practice_types": [],
    },
    "account_security_notice": {
        "id": "account_security_notice", "group": "account", "group_label": "Account e Sicurezza",
        "name": "Avviso di sicurezza",
        "subject": "Herion — Avviso di sicurezza per il tuo account",
        "body_html": '<p style="color:#0F172A;font-size:14px;line-height:1.6;">Gentile <strong>[Nome]</strong>,</p><p style="color:#475569;font-size:14px;line-height:1.6;">ti segnaliamo un\'attivita sul tuo account che potrebbe richiedere la tua attenzione.</p><div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;padding:14px;margin:12px 0;"><p style="margin:0;font-size:13px;color:#9A3412;"><strong>[azione_richiesta]</strong></p></div><p style="color:#475569;font-size:14px;line-height:1.6;">Se non riconosci questa attivita, ti consigliamo di cambiare la password immediatamente.</p>' + _SIG,
        "placeholders": ["Nome", "azione_richiesta"],
        "user_types": ["private", "freelancer", "company"], "practice_types": [],
    },
}

TEMPLATE_GROUPS = {
    "private": "Privati",
    "freelancer": "Liberi Professionisti",
    "company": "Aziende",
    "blocked": "Pratiche Bloccate",
    "approval": "Flusso Approvazione",
    "delegation": "Flusso Delega",
    "delivery": "Consegna Finale",
    "reminder": "Promemoria",
    "account": "Account e Sicurezza",
}


async def resolve_template_placeholders(template_id: str, practice_id: str = None, extra: dict = None) -> dict:
    """Resolve placeholders in a template using practice data."""
    template = EMAIL_TEMPLATES.get(template_id)
    if not template:
        return {"error": "Template non trovato"}

    frontend_url = os.environ.get("REACT_APP_BACKEND_URL", "")
    values = {
        "Nome": "",
        "codice_pratica": "",
        "nome_pratica": "",
        "tipo_pratica": "",
        "stato_pratica": "",
        "prossimo_step": "",
        "azione_richiesta": "",
        "elemento_mancante": "",
        "elenco_documenti": "",
        "data_scadenza": "",
        "nome_azienda": "",
        "link_pratica": "",
        "link_reset_password": "",
    }

    if practice_id:
        practice = await db.practices.find_one({"id": practice_id}, {"_id": 0})
        if practice:
            values["codice_pratica"] = practice_id[:8]
            values["nome_pratica"] = practice.get("practice_type_label", "")
            values["tipo_pratica"] = practice.get("practice_type_label", "")
            values["nome_azienda"] = practice.get("company_name") or practice.get("client_name", "")
            values["Nome"] = practice.get("client_name", "")
            values["link_pratica"] = f"{frontend_url}/practices/{practice_id}"

            status_labels = {
                "draft": "Bozza", "in_progress": "In elaborazione", "waiting_approval": "In attesa di approvazione",
                "approved": "Approvata", "submitted": "Inviata", "completed": "Completata",
            }
            values["stato_pratica"] = status_labels.get(practice.get("status"), practice.get("status_label", ""))

            # Get readiness info for next step and blockers
            readiness = await calculate_readiness(practice)
            if readiness.get("blockers"):
                values["elemento_mancante"] = readiness["blockers"][0]
                values["azione_richiesta"] = f"Risolvere: {readiness['blockers'][0]}"
            values["prossimo_step"] = readiness.get("next_step", "")

            # Build document list from matrix
            matrix = DOCUMENT_MATRIX.get(practice.get("practice_type") or practice.get("template_source"))
            if matrix:
                matrix_result = await get_document_matrix_for_practice(practice_id)
                missing = matrix_result.get("completeness", {}).get("missing_required", [])
                if missing:
                    values["elenco_documenti"] = "".join(f'<p style="margin:4px 0;font-size:13px;">• {m}</p>' for m in missing)
                else:
                    values["elenco_documenti"] = '<p style="margin:4px 0;font-size:13px;color:#065F46;">Tutti i documenti richiesti sono stati caricati.</p>'
            elif readiness.get("blockers"):
                values["elenco_documenti"] = "".join(f'<p style="margin:4px 0;font-size:13px;">• {b}</p>' for b in readiness["blockers"][:5])

    # Override with extra values
    if extra:
        for k, v in extra.items():
            if v:
                values[k] = v

    # Resolve subject and body — only replace placeholders that have non-empty values
    subject = template["subject"]
    body_html = template["body_html"]
    for key, val in values.items():
        if val:  # Only replace if value is non-empty
            placeholder = f"[{key}]"
            subject = subject.replace(placeholder, str(val))
            body_html = body_html.replace(placeholder, str(val))

    return {
        "template_id": template_id,
        "subject": subject,
        "body_html": body_html,
        "resolved_values": {k: v for k, v in values.items() if v},
        "template_name": template["name"],
        "template_group": template["group"],
    }


@api_router.get("/emails/templates")
async def get_email_templates(user: dict = Depends(get_current_user), group: Optional[str] = None, user_type: Optional[str] = None):
    """Get available email templates, optionally filtered by group or user type."""
    result = []
    for tid, tpl in EMAIL_TEMPLATES.items():
        if group and tpl["group"] != group:
            continue
        if user_type and user_type not in tpl.get("user_types", []):
            continue
        result.append({
            "id": tpl["id"],
            "group": tpl["group"],
            "group_label": tpl["group_label"],
            "name": tpl["name"],
            "subject": tpl["subject"],
            "placeholders": tpl["placeholders"],
            "user_types": tpl["user_types"],
            "practice_types": tpl.get("practice_types", []),
        })
    return result


@api_router.get("/emails/template-groups")
async def get_email_template_groups(user: dict = Depends(get_current_user)):
    """Get template group definitions with counts."""
    groups = []
    for gid, glabel in TEMPLATE_GROUPS.items():
        count = sum(1 for t in EMAIL_TEMPLATES.values() if t["group"] == gid)
        groups.append({"id": gid, "label": glabel, "count": count})
    return groups


@api_router.get("/emails/templates/{template_id}")
async def get_email_template(template_id: str, user: dict = Depends(get_current_user)):
    """Get a single template with full details."""
    tpl = EMAIL_TEMPLATES.get(template_id)
    if not tpl:
        raise HTTPException(status_code=404, detail="Template non trovato")
    return tpl


class TemplateResolveRequest(BaseModel):
    practice_id: Optional[str] = None
    extra: Optional[dict] = None


@api_router.post("/emails/templates/{template_id}/resolve")
async def resolve_email_template(template_id: str, req: TemplateResolveRequest, user: dict = Depends(get_current_user)):
    """Resolve a template with practice data and return ready-to-use subject + body."""
    tpl = EMAIL_TEMPLATES.get(template_id)
    if not tpl:
        raise HTTPException(status_code=404, detail="Template non trovato")

    resolved = await resolve_template_placeholders(template_id, req.practice_id, req.extra)
    if "error" in resolved:
        raise HTTPException(status_code=400, detail=resolved["error"])

    # Identify which placeholders are still unresolved (contain [...])
    import re
    unresolved = []
    for ph in tpl["placeholders"]:
        bracket = f"[{ph}]"
        if bracket in resolved["subject"] or bracket in resolved["body_html"]:
            unresolved.append(ph)

    return {
        "template_id": template_id,
        "template_name": tpl["name"],
        "template_group": tpl["group"],
        "subject": resolved["subject"],
        "body_html": resolved["body_html"],
        "resolved_values": resolved.get("resolved_values", {}),
        "unresolved_placeholders": unresolved,
        "all_placeholders": tpl["placeholders"],
    }


class DraftFromTemplateRequest(BaseModel):
    template_id: str
    practice_id: str
    recipient_email: EmailStr
    recipient_name: Optional[str] = None
    extra_values: Optional[dict] = None
    attachment_doc_keys: Optional[List[str]] = []


@api_router.post("/emails/draft-from-template")
async def create_draft_from_template(req: DraftFromTemplateRequest, user: dict = Depends(get_current_user)):
    """Create an email draft from a template, auto-resolving placeholders from practice data."""
    template = EMAIL_TEMPLATES.get(req.template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template non trovato")

    practice = await db.practices.find_one({"id": req.practice_id}, {"_id": 0})
    if not practice:
        raise HTTPException(status_code=404, detail="Pratica non trovata")

    resolved = await resolve_template_placeholders(req.template_id, req.practice_id, req.extra_values)

    # Check attachment compliance
    compliance = await check_email_attachment_compliance(req.practice_id, req.attachment_doc_keys or [])

    now = datetime.now(timezone.utc).isoformat()
    draft_id = str(uuid.uuid4())
    status = "blocked" if not compliance["compliant"] else "draft"

    draft = {
        "id": draft_id,
        "practice_id": req.practice_id,
        "created_by": user["id"],
        "created_by_name": user.get("name", user.get("email")),
        "recipient_email": req.recipient_email,
        "recipient_name": req.recipient_name,
        "subject": resolved["subject"],
        "body_html": resolved["body_html"],
        "attachment_doc_keys": req.attachment_doc_keys or [],
        "email_type": "template",
        "template_id": req.template_id,
        "template_name": template["name"],
        "template_group": template["group"],
        "status": status,
        "status_label": EMAIL_STATUSES[status],
        "compliance": compliance,
        "resend_email_id": None,
        "sent_at": None,
        "reviewed_by": None,
        "reviewed_at": None,
        "approved_by": None,
        "approved_at": None,
        "send_error": None,
        "practice_label": practice.get("practice_type_label", ""),
        "client_name": practice.get("client_name", ""),
        "created_at": now,
        "updated_at": now,
    }

    await db.email_drafts.insert_one(draft)

    await add_timeline_event(req.practice_id, user["id"], "email_draft_created", {
        "draft_id": draft_id,
        "template_id": req.template_id,
        "template_name": template["name"],
        "recipient": req.recipient_email,
        "subject": resolved["subject"],
    })

    await log_audit_event(user["id"], user.get("role", "user"), "email_draft_from_template", "email", draft_id,
        reason=f"Bozza da template '{template['name']}' per {req.recipient_email}",
        severity="info", practice_id=req.practice_id,
        details={"template_id": req.template_id, "subject": resolved["subject"]})

    draft.pop("_id", None)
    return {"message": f"Bozza creata dal template '{template['name']}'", "draft": draft}


async def check_email_attachment_compliance(practice_id: str, attachment_doc_keys: list) -> dict:
    """Check whether attachments are compliant with document matrix, signature, and sensitivity rules."""
    issues = []
    blocked = False
    warnings = []

    matrix_result = await get_document_matrix_for_practice(practice_id)

    for doc_key in attachment_doc_keys:
        doc = await db.documents.find_one({"practice_id": practice_id, "doc_key": doc_key}, {"_id": 0})
        if not doc:
            doc = await db.documents.find_one({"practice_id": practice_id, "id": doc_key}, {"_id": 0})
        if not doc:
            issues.append({"doc_key": doc_key, "issue": "not_found", "label": f"Documento non trovato: {doc_key}", "blocking": True})
            blocked = True
            continue

        # Check sensitivity
        sensitivity = doc.get("sensitivity_level") or "standard"
        # Also check from matrix
        if matrix_result.get("has_matrix"):
            for req in matrix_result.get("required", []) + matrix_result.get("conditional", []):
                if req.get("doc_key") == doc_key:
                    sensitivity = req.get("sensitivity", sensitivity)
                    break

        sens_config = SENSITIVITY_LEVELS.get(sensitivity, SENSITIVITY_LEVELS["standard"])
        if not sens_config.get("sending_allowed"):
            issues.append({
                "doc_key": doc_key,
                "issue": "sensitivity_blocked",
                "label": f"Documento riservato non inviabile: {doc.get('original_name', doc_key)}",
                "sensitivity": sensitivity,
                "sensitivity_label": sens_config["label"],
                "blocking": True,
            })
            blocked = True
            continue

        # Check signature requirement
        if matrix_result.get("has_matrix"):
            for req in matrix_result.get("required", []) + matrix_result.get("conditional", []):
                if req.get("doc_key") == doc_key and req.get("signed_required"):
                    fn = (doc.get("filename") or doc.get("original_name") or "").lower()
                    is_signed = fn.endswith(".p7m") or doc.get("is_signed", False)
                    if not is_signed:
                        issues.append({
                            "doc_key": doc_key,
                            "issue": "signature_missing",
                            "label": f"Firma digitale mancante: {doc.get('original_name', doc_key)}",
                            "blocking": True,
                        })
                        blocked = True
                    break

        # Check file format
        fn = (doc.get("filename") or doc.get("original_name") or "").lower()
        if fn.endswith(".p7m"):
            warnings.append(f"Allegato P7M: {doc.get('original_name', doc_key)} — il destinatario deve poter aprire buste crittografiche.")

    return {
        "compliant": not blocked,
        "issues": issues,
        "warnings": warnings,
        "checked_count": len(attachment_doc_keys),
    }


class EmailDraftRequest(BaseModel):
    practice_id: str
    recipient_email: EmailStr
    recipient_name: Optional[str] = None
    subject: str
    body_html: str
    attachment_doc_keys: Optional[List[str]] = []
    email_type: str = "practice_communication"


@api_router.post("/emails/draft")
async def create_email_draft(req: EmailDraftRequest, user: dict = Depends(get_current_user)):
    """Create an email draft with compliance checks before it can be sent."""
    practice = await db.practices.find_one({"id": req.practice_id}, {"_id": 0})
    if not practice:
        raise HTTPException(status_code=404, detail="Pratica non trovata")

    # Check attachment compliance
    compliance = await check_email_attachment_compliance(req.practice_id, req.attachment_doc_keys or [])

    now = datetime.now(timezone.utc).isoformat()
    draft_id = str(uuid.uuid4())
    status = "blocked" if not compliance["compliant"] else "draft"

    draft = {
        "id": draft_id,
        "practice_id": req.practice_id,
        "created_by": user["id"],
        "created_by_name": user.get("name", user.get("email")),
        "recipient_email": req.recipient_email,
        "recipient_name": req.recipient_name,
        "subject": req.subject,
        "body_html": req.body_html,
        "attachment_doc_keys": req.attachment_doc_keys or [],
        "email_type": req.email_type,
        "status": status,
        "status_label": EMAIL_STATUSES[status],
        "compliance": compliance,
        "resend_email_id": None,
        "sent_at": None,
        "reviewed_by": None,
        "reviewed_at": None,
        "approved_by": None,
        "approved_at": None,
        "send_error": None,
        "practice_label": practice.get("practice_type_label", ""),
        "client_name": practice.get("client_name", ""),
        "created_at": now,
        "updated_at": now,
    }

    await db.email_drafts.insert_one(draft)

    await add_timeline_event(req.practice_id, user["id"], "email_draft_created", {
        "draft_id": draft_id,
        "recipient": req.recipient_email,
        "subject": req.subject,
        "status": status,
        "attachment_count": len(req.attachment_doc_keys or []),
    })

    await log_audit_event(user["id"], user.get("role", "user"), "email_draft_created", "email", draft_id,
        reason=f"Bozza email creata per {req.recipient_email}",
        severity="info", practice_id=req.practice_id,
        details={"subject": req.subject, "status": status, "attachments": len(req.attachment_doc_keys or [])})

    draft.pop("_id", None)
    return {"message": f"Bozza {'creata' if status == 'draft' else 'bloccata per non conformita'}", "draft": draft}


@api_router.get("/emails/drafts")
async def get_email_drafts(user: dict = Depends(get_current_user), practice_id: Optional[str] = None, status: Optional[str] = None):
    """Get email drafts. Admin/Creator see all, users see own."""
    role = user.get("role", "user")
    query = {} if role in ["admin", "creator"] else {"created_by": user["id"]}
    if practice_id:
        query["practice_id"] = practice_id
    if status:
        query["status"] = status
    drafts = await db.email_drafts.find(query, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    return drafts


@api_router.get("/emails/drafts/{draft_id}")
async def get_email_draft(draft_id: str, user: dict = Depends(get_current_user)):
    """Get a single email draft with full details."""
    draft = await db.email_drafts.find_one({"id": draft_id}, {"_id": 0})
    if not draft:
        raise HTTPException(status_code=404, detail="Bozza non trovata")
    return draft


@api_router.put("/emails/drafts/{draft_id}")
async def update_email_draft(draft_id: str, req: EmailDraftRequest, user: dict = Depends(get_current_user)):
    """Update an email draft (only in draft/blocked status)."""
    draft = await db.email_drafts.find_one({"id": draft_id}, {"_id": 0})
    if not draft:
        raise HTTPException(status_code=404, detail="Bozza non trovata")
    if draft["status"] not in ["draft", "blocked"]:
        raise HTTPException(status_code=400, detail="Solo le bozze possono essere modificate")

    compliance = await check_email_attachment_compliance(req.practice_id, req.attachment_doc_keys or [])
    new_status = "blocked" if not compliance["compliant"] else "draft"

    now = datetime.now(timezone.utc).isoformat()
    await db.email_drafts.update_one({"id": draft_id}, {"$set": {
        "recipient_email": req.recipient_email,
        "recipient_name": req.recipient_name,
        "subject": req.subject,
        "body_html": req.body_html,
        "attachment_doc_keys": req.attachment_doc_keys or [],
        "compliance": compliance,
        "status": new_status,
        "status_label": EMAIL_STATUSES[new_status],
        "updated_at": now,
    }})

    return {"message": "Bozza aggiornata", "status": new_status}


@api_router.post("/emails/drafts/{draft_id}/submit-review")
async def submit_email_for_review(draft_id: str, user: dict = Depends(get_current_user)):
    """Submit a draft for admin/creator review."""
    draft = await db.email_drafts.find_one({"id": draft_id}, {"_id": 0})
    if not draft:
        raise HTTPException(status_code=404, detail="Bozza non trovata")
    if draft["status"] != "draft":
        raise HTTPException(status_code=400, detail="Solo le bozze in stato 'draft' possono essere inviate in revisione")

    # Re-check compliance
    compliance = await check_email_attachment_compliance(draft["practice_id"], draft.get("attachment_doc_keys", []))
    if not compliance["compliant"]:
        await db.email_drafts.update_one({"id": draft_id}, {"$set": {
            "status": "blocked", "status_label": EMAIL_STATUSES["blocked"],
            "compliance": compliance, "updated_at": datetime.now(timezone.utc).isoformat(),
        }})
        return {"message": "Bozza bloccata: allegati non conformi", "compliance": compliance}

    now = datetime.now(timezone.utc).isoformat()
    await db.email_drafts.update_one({"id": draft_id}, {"$set": {
        "status": "review", "status_label": EMAIL_STATUSES["review"], "updated_at": now,
    }})

    await add_timeline_event(draft["practice_id"], user["id"], "email_submitted_review", {
        "draft_id": draft_id, "subject": draft["subject"],
    })

    await create_alert("email_review_requested", "Email in attesa di revisione",
        f"Una bozza email per la pratica {draft.get('client_name', '')} richiede revisione.",
        practice_id=draft["practice_id"], user_id=user["id"],
        next_action="Revisiona e approva la bozza email", visibility="admin")

    return {"message": "Bozza inviata in revisione"}


@api_router.post("/emails/drafts/{draft_id}/approve")
async def approve_email_draft(draft_id: str, user: dict = Depends(get_current_user)):
    """Approve an email draft (admin/creator only)."""
    role = user.get("role", "user")
    if role not in ["admin", "creator"]:
        raise HTTPException(status_code=403, detail="Solo admin e Creator possono approvare email")

    draft = await db.email_drafts.find_one({"id": draft_id}, {"_id": 0})
    if not draft:
        raise HTTPException(status_code=404, detail="Bozza non trovata")
    if draft["status"] not in ["review", "draft"]:
        raise HTTPException(status_code=400, detail="Solo le bozze in revisione o draft possono essere approvate")

    # Final compliance check
    compliance = await check_email_attachment_compliance(draft["practice_id"], draft.get("attachment_doc_keys", []))
    if not compliance["compliant"]:
        await db.email_drafts.update_one({"id": draft_id}, {"$set": {
            "status": "blocked", "status_label": EMAIL_STATUSES["blocked"],
            "compliance": compliance, "updated_at": datetime.now(timezone.utc).isoformat(),
        }})
        return {"message": "Approvazione rifiutata: allegati non conformi", "compliance": compliance}

    now = datetime.now(timezone.utc).isoformat()
    await db.email_drafts.update_one({"id": draft_id}, {"$set": {
        "status": "approved", "status_label": EMAIL_STATUSES["approved"],
        "approved_by": user["id"], "approved_at": now, "compliance": compliance, "updated_at": now,
    }})

    await add_timeline_event(draft["practice_id"], user["id"], "email_approved", {
        "draft_id": draft_id, "subject": draft["subject"], "approved_by_role": role,
    })

    await log_audit_event(user["id"], role, "email_approved", "email", draft_id,
        reason=f"Email approvata per {draft['recipient_email']}",
        severity="medium", practice_id=draft["practice_id"])

    return {"message": "Email approvata e pronta per l'invio"}


@api_router.post("/emails/drafts/{draft_id}/send")
async def send_email_draft(draft_id: str, user: dict = Depends(get_current_user)):
    """Send an approved email via Resend."""
    role = user.get("role", "user")
    if role not in ["admin", "creator"]:
        raise HTTPException(status_code=403, detail="Solo admin e Creator possono inviare email")

    if not RESEND_API_KEY:
        raise HTTPException(status_code=503, detail="Servizio email non configurato")

    draft = await db.email_drafts.find_one({"id": draft_id}, {"_id": 0})
    if not draft:
        raise HTTPException(status_code=404, detail="Bozza non trovata")
    if draft["status"] != "approved":
        raise HTTPException(status_code=400, detail=f"Solo le email approvate possono essere inviate (stato attuale: {draft['status_label']})")

    # Final compliance gate
    compliance = await check_email_attachment_compliance(draft["practice_id"], draft.get("attachment_doc_keys", []))
    if not compliance["compliant"]:
        await db.email_drafts.update_one({"id": draft_id}, {"$set": {
            "status": "blocked", "status_label": EMAIL_STATUSES["blocked"],
            "compliance": compliance, "updated_at": datetime.now(timezone.utc).isoformat(),
        }})
        return {"message": "Invio bloccato: allegati non conformi", "compliance": compliance}

    now = datetime.now(timezone.utc).isoformat()
    await db.email_drafts.update_one({"id": draft_id}, {"$set": {
        "status": "sending", "status_label": EMAIL_STATUSES["sending"], "updated_at": now,
    }})

    # Build the full HTML email
    wrapped_html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #0F172A; font-size: 22px; font-weight: 700; margin: 0;">Herion</h1>
            <p style="color: #64748B; font-size: 12px; margin-top: 2px;">Piattaforma operativa fiscale — Italia</p>
        </div>
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 24px;">
            {draft['body_html']}
        </div>
        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #E2E8F0; text-align: center;">
            <p style="color: #CBD5E1; font-size: 10px;">
                Questa email e stata inviata tramite Herion. Per domande, contatta il tuo referente.
            </p>
        </div>
    </div>
    """

    # Note on attachments: Resend supports attachments but requires file content.
    # For now we send the email body and note which docs are referenced.
    # Full attachment binary sending can be added when file storage supports it.
    attachment_note = ""
    if draft.get("attachment_doc_keys"):
        doc_labels = []
        for dk in draft["attachment_doc_keys"]:
            doc = await db.documents.find_one({"practice_id": draft["practice_id"], "$or": [{"doc_key": dk}, {"id": dk}]}, {"_id": 0, "original_name": 1})
            doc_labels.append(doc.get("original_name", dk) if doc else dk)
        attachment_note = "<p style='color: #64748B; font-size: 12px; margin-top: 16px; padding-top: 12px; border-top: 1px solid #E2E8F0;'><strong>Documenti allegati di riferimento:</strong> " + ", ".join(doc_labels) + "</p>"
        wrapped_html = wrapped_html.replace("</div>\n        <div style=\"margin-top: 20px;", attachment_note + "</div>\n        <div style=\"margin-top: 20px;")

    try:
        email_result = await asyncio.to_thread(resend.Emails.send, {
            "from": SENDER_EMAIL,
            "to": [draft["recipient_email"]],
            "subject": draft["subject"],
            "html": wrapped_html,
        })
        resend_id = email_result.get("id") if isinstance(email_result, dict) else str(email_result)

        await db.email_drafts.update_one({"id": draft_id}, {"$set": {
            "status": "sent", "status_label": EMAIL_STATUSES["sent"],
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "resend_email_id": resend_id,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }})

        await add_timeline_event(draft["practice_id"], user["id"], "email_sent", {
            "draft_id": draft_id, "recipient": draft["recipient_email"],
            "subject": draft["subject"], "resend_id": resend_id,
            "attachment_count": len(draft.get("attachment_doc_keys", [])),
        })

        await log_audit_event(user["id"], role, "email_sent", "email", draft_id,
            reason=f"Email inviata a {draft['recipient_email']}",
            severity="medium", practice_id=draft["practice_id"],
            details={"resend_id": resend_id, "subject": draft["subject"]})

        logger.info(f"Email sent: draft={draft_id}, resend_id={resend_id}")
        return {"message": "Email inviata con successo", "resend_id": resend_id, "status": "sent"}

    except Exception as e:
        error_msg = str(e)
        await db.email_drafts.update_one({"id": draft_id}, {"$set": {
            "status": "failed", "status_label": EMAIL_STATUSES["failed"],
            "send_error": error_msg, "updated_at": datetime.now(timezone.utc).isoformat(),
        }})

        await log_audit_event(user["id"], role, "email_send_failed", "email", draft_id,
            reason=f"Invio fallito: {error_msg[:100]}",
            severity="high", practice_id=draft["practice_id"])

        logger.error(f"Email send failed: draft={draft_id}, error={error_msg}")
        return {"message": f"Invio fallito: {error_msg}", "status": "failed"}


@api_router.get("/emails/summary")
async def get_email_summary(user: dict = Depends(get_current_user)):
    """Get email draft summary counts."""
    role = user.get("role", "user")
    base_query = {} if role in ["admin", "creator"] else {"created_by": user["id"]}
    total = await db.email_drafts.count_documents(base_query)
    draft = await db.email_drafts.count_documents({**base_query, "status": "draft"})
    review = await db.email_drafts.count_documents({**base_query, "status": "review"})
    approved = await db.email_drafts.count_documents({**base_query, "status": "approved"})
    sent = await db.email_drafts.count_documents({**base_query, "status": "sent"})
    failed = await db.email_drafts.count_documents({**base_query, "status": "failed"})
    blocked = await db.email_drafts.count_documents({**base_query, "status": "blocked"})
    return {"total": total, "draft": draft, "review": review, "approved": approved, "sent": sent, "failed": failed, "blocked": blocked}


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

    # Governance audit for delegation changes
    await log_audit_event(user["id"], user.get("role", "user"), event_type, "delegation", practice_id,
        new_state=delegation["status"], severity="medium" if action in ["verify", "reject"] else "info",
        practice_id=practice_id, details={"delegation_type": delegation.get("delegation_type"), "notes": update.notes})

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
    """Execute submission with governance pre-checks."""
    # Admin/creator can submit any practice
    is_admin = user.get("role") in ["admin", "creator"]
    query = {"id": practice_id} if is_admin else {"id": practice_id, "user_id": user["id"]}
    practice = await db.practices.find_one(query, {"_id": 0})
    if not practice:
        raise HTTPException(status_code=404, detail="Pratica non trovata")

    # Run governance call
    gov = await governance_call(practice_id, user["id"], user.get("role", "user"), "submit")
    if gov["final_decision"] == "blocked":
        await log_audit_event(user["id"], user.get("role", "user"), "submission_blocked_by_governance", "practice", practice_id,
            reason=gov["blocking_reason"], severity="high", practice_id=practice_id)
        guard = gov.get("guard") or {}
        return {
            "success": False,
            "message": gov["blocking_reason"] or "Invio bloccato dalla governance",
            "blockers": [w for w in gov["governance_warnings"]],
            "missing_items": gov["missing_items"],
            "readiness_state": gov["readiness"]["readiness_state"],
            "governance_decision": gov["final_decision"],
            "guard_verdict": guard.get("verdict"),
            "guard_score": guard.get("guard_score"),
            "safe_alternatives": guard.get("safe_alternatives", []),
        }
    if gov["final_decision"] == "escalation_required":
        await log_audit_event(user["id"], user.get("role", "user"), "submission_escalated_by_governance", "practice", practice_id,
            reason="Escalation richiesta dalla governance", severity="high", practice_id=practice_id)
        guard = gov.get("guard") or {}
        return {
            "success": False,
            "message": "Invio richiede escalation: " + (gov["governance_warnings"][0] if gov["governance_warnings"] else "revisione necessaria"),
            "blockers": gov["governance_warnings"],
            "missing_items": gov["missing_items"],
            "readiness_state": gov["readiness"]["readiness_state"],
            "governance_decision": gov["final_decision"],
            "guard_verdict": guard.get("verdict"),
            "guard_score": guard.get("guard_score"),
            "safe_alternatives": guard.get("safe_alternatives", []),
        }

    readiness = gov["readiness"]
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
# GOVERNANCE LAYER
# ========================

# --- Non-Negotiable Rules ---
NON_NEGOTIABLE_RULES = [
    {"id": "NNR-001", "rule": "never_submit_unsupported", "description": "Mai inviare pratiche non supportate", "severity": "critical"},
    {"id": "NNR-002", "rule": "never_submit_missing_documents", "description": "Mai inviare con documenti critici mancanti", "severity": "critical"},
    {"id": "NNR-003", "rule": "never_proceed_invalid_delegation", "description": "Mai procedere con delega invalida o mancante quando richiesta", "severity": "critical"},
    {"id": "NNR-004", "rule": "never_proceed_missing_approval", "description": "Mai procedere senza approvazione quando richiesta", "severity": "critical"},
    {"id": "NNR-005", "rule": "never_proceed_unclear_routing", "description": "Mai procedere con routing non chiaro", "severity": "high"},
    {"id": "NNR-006", "rule": "never_proceed_missing_destination", "description": "Mai procedere senza destinazione valida", "severity": "high"},
    {"id": "NNR-007", "rule": "never_present_uncertain_as_certain", "description": "Mai presentare informazioni incerte come certe", "severity": "high"},
    {"id": "NNR-008", "rule": "never_override_high_risk_silently", "description": "Mai ignorare blocchi ad alto rischio silenziosamente", "severity": "critical"},
    {"id": "NNR-009", "rule": "never_hidden_strategic_changes", "description": "Mai modifiche strategiche nascoste", "severity": "critical"},
    {"id": "NNR-010", "rule": "never_exceed_role_permissions", "description": "Mai superare i permessi del ruolo", "severity": "critical"},
]

# --- Permissions Matrix ---
PERMISSIONS_MATRIX = {
    "view_own_practices": {"user": True, "admin": True, "creator": True},
    "view_all_practices": {"user": False, "admin": True, "creator": True},
    "edit_own_practices": {"user": True, "admin": True, "creator": True},
    "edit_all_practices": {"user": False, "admin": True, "creator": True},
    "request_missing_items": {"user": True, "admin": True, "creator": True},
    "request_delegation": {"user": True, "admin": True, "creator": True},
    "verify_delegation": {"user": False, "admin": True, "creator": True},
    "reject_delegation": {"user": False, "admin": True, "creator": True},
    "request_approval": {"user": True, "admin": True, "creator": True},
    "approve_practice": {"user": True, "admin": True, "creator": True},
    "submit_practice": {"user": True, "admin": True, "creator": True},
    "retry_submission": {"user": True, "admin": True, "creator": True},
    "escalate_practice": {"user": False, "admin": True, "creator": True},
    "change_routing_settings": {"user": False, "admin": False, "creator": True},
    "change_governance_settings": {"user": False, "admin": False, "creator": True},
    "change_registry_entries": {"user": False, "admin": False, "creator": True},
    "access_hidden_logs": {"user": False, "admin": False, "creator": True},
    "access_creator_tools": {"user": False, "admin": False, "creator": True},
    "access_system_prompts": {"user": False, "admin": True, "creator": True},
    "delete_practice": {"user": True, "admin": True, "creator": True},
    "view_governance_dashboard": {"user": False, "admin": True, "creator": True},
    "view_full_audit": {"user": False, "admin": True, "creator": True},
    "view_fail_safe_details": {"user": False, "admin": True, "creator": True},
}

FAIL_SAFE_TRIGGERS = {
    "source_conflict": {"stop_level": "high", "description": "Conflitto tra fonti rilevato"},
    "routing_unclear": {"stop_level": "high", "description": "Routing non chiaro o non risolvibile"},
    "delegation_invalid": {"stop_level": "critical", "description": "Delega invalida o scaduta"},
    "approval_missing": {"stop_level": "critical", "description": "Approvazione mancante per azione critica"},
    "documents_critically_incomplete": {"stop_level": "critical", "description": "Documenti critici mancanti"},
    "agent_contradiction": {"stop_level": "high", "description": "Agenti restituiscono risultati contraddittori"},
    "repeated_submission_failure": {"stop_level": "high", "description": "Invio fallito ripetutamente"},
    "state_inconsistency": {"stop_level": "warning", "description": "Stato della pratica inconsistente"},
    "high_risk_unsupported": {"stop_level": "critical", "description": "Pratica ad alto rischio non supportata"},
    "security_anomaly": {"stop_level": "critical", "description": "Anomalia di sicurezza rilevata"},
}

AUDIT_SEVERITY = {"info": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}

async def log_audit_event(
    actor_id: str, actor_role: str, action: str, target_type: str,
    target_id: str = None, previous_state: str = None, new_state: str = None,
    reason: str = None, severity: str = "info", practice_id: str = None,
    details: dict = None
):
    """Enhanced audit log with full traceability."""
    event = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "actor_id": actor_id,
        "actor_role": actor_role,
        "action": action,
        "target_type": target_type,
        "target_id": target_id,
        "previous_state": previous_state,
        "new_state": new_state,
        "reason": reason,
        "severity": severity,
        "severity_level": AUDIT_SEVERITY.get(severity, 0),
        "practice_id": practice_id,
        "details": details or {},
    }
    await db.governance_audit.insert_one(event)
    return event

def check_permission(actor_role: str, action: str) -> dict:
    """Check if a role has permission for an action."""
    perm = PERMISSIONS_MATRIX.get(action)
    if not perm:
        return {"allowed": False, "actor": actor_role, "action": action, "target": action, "reason": "Permesso non definito"}
    role = actor_role if actor_role in perm else "user"
    allowed = perm.get(role, False)
    return {
        "allowed": allowed,
        "actor": actor_role,
        "action": action,
        "target": action,
        "reason": None if allowed else f"Ruolo '{role}' non autorizzato per '{action}'"
    }

async def check_non_negotiable_rules(practice: dict, action: str, readiness: dict = None) -> list:
    """Check all non-negotiable rules and return violations."""
    violations = []

    if not readiness:
        readiness = await calculate_readiness(practice)

    # NNR-001: Never submit unsupported
    if action == "submit" and readiness.get("support_level") == "not_supported":
        violations.append({"rule_id": "NNR-001", "severity": "critical", "reason": "Pratica non supportata dalla piattaforma"})

    # NNR-002: Never submit with missing critical documents
    if action == "submit" and readiness.get("blockers"):
        doc_blockers = [b for b in readiness["blockers"] if "Documento" in b or "documento" in b]
        if doc_blockers:
            violations.append({"rule_id": "NNR-002", "severity": "critical", "reason": f"Documenti mancanti: {', '.join(doc_blockers)}"})

    # NNR-003: Never proceed with invalid delegation
    if action in ["submit", "approve"] and readiness.get("delegation_required") and not readiness.get("delegation_valid"):
        violations.append({"rule_id": "NNR-003", "severity": "critical", "reason": f"Delega: {readiness.get('delegation_status', 'mancante')}"})

    # NNR-004: Never proceed without approval
    if action == "submit" and readiness.get("approval_required") and readiness.get("approval_status") not in ["approved", "not_required"]:
        violations.append({"rule_id": "NNR-004", "severity": "critical", "reason": "Approvazione richiesta ma non concessa"})

    # NNR-005: Never proceed with unclear routing
    if action == "submit" and not readiness.get("routing_clear"):
        violations.append({"rule_id": "NNR-005", "severity": "high", "reason": "Routing non chiaro o destinazione non trovata"})

    # NNR-006: Missing destination
    if action == "submit" and readiness.get("channel") == "unknown":
        violations.append({"rule_id": "NNR-006", "severity": "high", "reason": "Canale di invio non determinato"})

    # NNR-008: Never override high-risk silently
    if action == "submit" and readiness.get("risk_level") == "high" and practice.get("status") != "approved":
        violations.append({"rule_id": "NNR-008", "severity": "critical", "reason": "Pratica ad alto rischio richiede approvazione esplicita"})

    return violations

async def check_fail_safe(practice: dict, action: str, readiness: dict = None) -> dict:
    """Evaluate fail-safe conditions."""
    if not readiness:
        readiness = await calculate_readiness(practice)

    triggers = []
    stop_levels = []

    # Check delegation validity
    if readiness.get("delegation_required") and readiness.get("delegation_status") in ["expired", "rejected", "blocked"]:
        t = FAIL_SAFE_TRIGGERS["delegation_invalid"]
        triggers.append({"trigger": "delegation_invalid", **t})
        stop_levels.append(t["stop_level"])

    # Check approval for submission
    if action == "submit" and readiness.get("approval_required") and readiness.get("approval_status") not in ["approved", "not_required"]:
        t = FAIL_SAFE_TRIGGERS["approval_missing"]
        triggers.append({"trigger": "approval_missing", **t})
        stop_levels.append(t["stop_level"])

    # Check documents
    doc_blockers = [b for b in (readiness.get("blockers") or []) if "Documento" in b or "documento" in b]
    if doc_blockers and action in ["submit", "approve"]:
        t = FAIL_SAFE_TRIGGERS["documents_critically_incomplete"]
        triggers.append({"trigger": "documents_critically_incomplete", **t})
        stop_levels.append(t["stop_level"])

    # Check routing
    if action == "submit" and not readiness.get("routing_clear"):
        t = FAIL_SAFE_TRIGGERS["routing_unclear"]
        triggers.append({"trigger": "routing_unclear", **t})
        stop_levels.append(t["stop_level"])

    # Check support level
    if readiness.get("support_level") == "not_supported":
        t = FAIL_SAFE_TRIGGERS["high_risk_unsupported"]
        triggers.append({"trigger": "high_risk_unsupported", **t})
        stop_levels.append(t["stop_level"])

    # Check repeated submission failures
    if action == "submit":
        fail_count = await db.submission_records.count_documents({"practice_id": practice["id"], "status": "failed"})
        if fail_count >= 2:
            t = FAIL_SAFE_TRIGGERS["repeated_submission_failure"]
            triggers.append({"trigger": "repeated_submission_failure", **t, "failure_count": fail_count})
            stop_levels.append(t["stop_level"])

    # Determine highest stop level
    level_order = {"info": 0, "warning": 1, "high": 2, "critical": 3}
    max_level = max((level_order.get(lv, 0) for lv in stop_levels), default=-1)
    stop_level = {0: "info", 1: "warning", 2: "high", 3: "critical"}.get(max_level, "info")

    safe = len(triggers) == 0

    # Determine next safe action
    next_safe = "Nessuna azione richiesta"
    if not safe:
        if any(t["trigger"] == "documents_critically_incomplete" for t in triggers):
            next_safe = "Caricare i documenti mancanti"
        elif any(t["trigger"] == "delegation_invalid" for t in triggers):
            next_safe = "Aggiornare o richiedere una nuova delega"
        elif any(t["trigger"] == "approval_missing" for t in triggers):
            next_safe = "Completare il processo di approvazione"
        elif any(t["trigger"] == "routing_unclear" for t in triggers):
            next_safe = "Verificare il routing e la destinazione"
        else:
            next_safe = "Contattare l'amministratore per revisione"

    return {
        "safe_to_continue": safe,
        "stop_level": stop_level if not safe else "info",
        "triggers": triggers,
        "reason": triggers[0]["description"] if triggers else None,
        "affected_modules": list(set(t["trigger"] for t in triggers)),
        "next_safe_action": next_safe,
    }

async def governance_call(practice_id: str, actor_id: str, actor_role: str, action_requested: str, context: dict = None) -> dict:
    """Unified Governance Call Method — runs all governance checks including Herion Guard before important actions."""
    practice = await db.practices.find_one({"id": practice_id}, {"_id": 0})
    if not practice:
        return {"final_decision": "blocked", "blocking_reason": "Pratica non trovata", "missing_items": [], "governance_warnings": [], "next_safe_action": "Verificare l'ID della pratica", "audit_entries": [], "creator_notification": False, "admin_notification": False, "guard": None}

    readiness = await calculate_readiness(practice)

    # 1. Permission check
    action_perm_map = {"submit": "submit_practice", "approve": "approve_practice", "delegation": "request_delegation", "escalate": "escalate_practice", "retry": "retry_submission"}
    perm_action = action_perm_map.get(action_requested, action_requested)
    perm_result = check_permission(actor_role, perm_action)

    if not perm_result["allowed"]:
        audit_entry = await log_audit_event(actor_id, actor_role, f"governance_denied_{action_requested}", "practice", practice_id,
            reason=perm_result["reason"], severity="high", practice_id=practice_id,
            details={"governance_component": "permissions_matrix"})
        return {
            "final_decision": "blocked",
            "blocking_reason": perm_result["reason"],
            "missing_items": [],
            "governance_warnings": [f"Permesso negato: {perm_result['reason']}"],
            "next_safe_action": "Richiedere i permessi necessari",
            "audit_entries": [audit_entry["id"]],
            "creator_notification": actor_role == "admin",
            "admin_notification": False,
            "guard": None,
        }

    # 2. Herion Guard evaluation
    guard_result = await herion_guard_evaluate(practice_id, action_requested, actor_id, actor_role)

    # 3. Non-negotiable rules check
    nnr_violations = await check_non_negotiable_rules(practice, action_requested, readiness)

    # 4. Fail-safe check
    fail_safe = await check_fail_safe(practice, action_requested, readiness)

    # Combine results (including Guard verdict)
    has_critical_violation = any(v["severity"] == "critical" for v in nnr_violations)
    has_high_violation = any(v["severity"] == "high" for v in nnr_violations)
    fail_safe_blocked = not fail_safe["safe_to_continue"] and fail_safe["stop_level"] in ["high", "critical"]
    guard_hard_blocked = guard_result["verdict"] == "hard_blocked"

    if has_critical_violation or fail_safe_blocked or guard_hard_blocked:
        final_decision = "blocked"
    elif has_high_violation or (not fail_safe["safe_to_continue"] and fail_safe["stop_level"] == "warning") or guard_result["verdict"] == "guarded":
        final_decision = "escalation_required"
    else:
        final_decision = "allowed"

    # Build governance warnings
    warnings = [v["reason"] for v in nnr_violations]
    if not fail_safe["safe_to_continue"]:
        warnings.extend([t["description"] for t in fail_safe["triggers"]])

    # Determine notifications
    creator_notify = has_critical_violation or fail_safe["stop_level"] == "critical"
    admin_notify = has_high_violation or fail_safe["stop_level"] in ["high", "critical"]

    # Log audit
    audit_entry = await log_audit_event(
        actor_id, actor_role, f"governance_check_{action_requested}", "practice", practice_id,
        reason=f"Decision: {final_decision}" + (f" | {nnr_violations[0]['reason']}" if nnr_violations else ""),
        severity="critical" if has_critical_violation else "high" if has_high_violation else "info",
        practice_id=practice_id,
        details={
            "governance_component": "governance_call",
            "action_requested": action_requested,
            "final_decision": final_decision,
            "nnr_violations": len(nnr_violations),
            "fail_safe_triggered": not fail_safe["safe_to_continue"],
            "readiness_state": readiness.get("readiness_state"),
        }
    )

    # Create notification if needed
    if creator_notify:
        creator_doc = await db.users.find_one({"is_creator": True})
        if creator_doc:
            await create_notification(str(creator_doc["_id"]), "Governance: Blocco Critico",
                f"Pratica {practice_id[:8]}: {warnings[0] if warnings else 'Blocco governance'}", "warning")
    if admin_notify:
        admin_docs = await db.users.find({"role": {"$in": ["admin", "creator"]}}).to_list(10)
        for a in admin_docs:
            await create_notification(str(a["_id"]), "Governance: Attenzione Richiesta",
                f"Pratica {practice_id[:8]}: {warnings[0] if warnings else 'Revisione necessaria'}", "warning")

    next_action = fail_safe["next_safe_action"]
    if nnr_violations:
        if any(v["rule_id"] == "NNR-002" for v in nnr_violations):
            next_action = "Caricare i documenti richiesti"
        elif any(v["rule_id"] == "NNR-003" for v in nnr_violations):
            next_action = "Completare il processo di delega"
        elif any(v["rule_id"] == "NNR-004" for v in nnr_violations):
            next_action = "Richiedere e ottenere l'approvazione"

    return {
        "final_decision": final_decision,
        "blocking_reason": nnr_violations[0]["reason"] if nnr_violations else (fail_safe["reason"] if not fail_safe["safe_to_continue"] else None),
        "missing_items": readiness.get("missing_items", []),
        "governance_warnings": warnings,
        "nnr_violations": nnr_violations,
        "fail_safe": fail_safe,
        "readiness": readiness,
        "permissions": perm_result,
        "guard": guard_result,
        "next_safe_action": next_action,
        "audit_entries": [audit_entry["id"]],
        "creator_notification": creator_notify,
        "admin_notification": admin_notify,
    }

# --- Governance API Endpoints ---

@api_router.get("/governance/check/{practice_id}")
async def get_governance_check(practice_id: str, action: str = "submit", user: dict = Depends(get_current_user)):
    """Run full governance check for a practice and action."""
    result = await governance_call(practice_id, user["id"], user.get("role", "user"), action)
    return result

@api_router.get("/governance/audit")
async def get_governance_audit(user: dict = Depends(get_current_user), limit: int = 50, severity: Optional[str] = None, practice_id: Optional[str] = None):
    """Get governance audit trail."""
    perm = check_permission(user.get("role", "user"), "view_full_audit")
    query = {}
    if not perm["allowed"]:
        query["actor_id"] = user["id"]
    if severity:
        query["severity"] = severity
    if practice_id:
        query["practice_id"] = practice_id

    events = await db.governance_audit.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return {"events": events, "total": len(events)}

@api_router.get("/governance/audit/{practice_id}")
async def get_practice_governance_audit(practice_id: str, user: dict = Depends(get_current_user)):
    """Get governance audit trail for a specific practice."""
    is_admin = user.get("role") in ["admin", "creator"]
    if not is_admin:
        practice = await db.practices.find_one({"id": practice_id, "user_id": user["id"]})
        if not practice:
            raise HTTPException(status_code=404, detail="Pratica non trovata")
    events = await db.governance_audit.find({"practice_id": practice_id}, {"_id": 0}).sort("timestamp", -1).to_list(100)
    return {"events": events, "practice_id": practice_id}

@api_router.get("/governance/dashboard")
async def get_governance_dashboard(user: dict = Depends(get_current_user)):
    """Governance dashboard for Admin/Creator."""
    perm = check_permission(user.get("role", "user"), "view_governance_dashboard")
    if not perm["allowed"]:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")

    # Recent governance events
    recent_events = await db.governance_audit.find({}, {"_id": 0}).sort("timestamp", -1).limit(20).to_list(20)

    # Count by severity
    severity_counts = {}
    for sev in ["info", "low", "medium", "high", "critical"]:
        severity_counts[sev] = await db.governance_audit.count_documents({"severity": sev})

    # Count blocked decisions
    blocked_count = await db.governance_audit.count_documents({"details.final_decision": "blocked"})
    escalation_count = await db.governance_audit.count_documents({"details.final_decision": "escalation_required"})

    # Count denied permissions
    denied_count = await db.governance_audit.count_documents({"action": {"$regex": "governance_denied"}})

    # Active fail-safe practices
    blocked_practices = await db.practices.count_documents({"status": {"$in": ["blocked", "escalated"]}})

    # Permissions matrix for reference
    permissions_summary = PERMISSIONS_MATRIX

    return {
        "recent_events": recent_events,
        "severity_counts": severity_counts,
        "blocked_decisions": blocked_count,
        "escalation_decisions": escalation_count,
        "denied_permissions": denied_count,
        "blocked_practices": blocked_practices,
        "non_negotiable_rules": NON_NEGOTIABLE_RULES,
        "permissions_matrix": permissions_summary,
        "fail_safe_triggers": FAIL_SAFE_TRIGGERS,
    }

@api_router.get("/governance/permissions")
async def get_permissions_for_role(user: dict = Depends(get_current_user)):
    """Get all permissions for the current user's role."""
    role = user.get("role", "user")
    perms = {}
    for action, roles in PERMISSIONS_MATRIX.items():
        perms[action] = roles.get(role, False)
    return {"role": role, "permissions": perms}

# ========================
# ALERT CENTER
# ========================

ALERT_TYPES = {
    "missing_documents": {"severity": "warning", "module": "documents", "title_tpl": "Documenti mancanti"},
    "missing_delegation": {"severity": "warning", "module": "delegation", "title_tpl": "Delega mancante"},
    "missing_approval": {"severity": "warning", "module": "approval", "title_tpl": "Approvazione mancante"},
    "blocked_practice": {"severity": "high", "module": "practice", "title_tpl": "Pratica bloccata"},
    "overdue_practice": {"severity": "high", "module": "deadline", "title_tpl": "Pratica scaduta"},
    "failed_submission": {"severity": "high", "module": "submission", "title_tpl": "Invio fallito"},
    "repeated_failed_submission": {"severity": "critical", "module": "submission", "title_tpl": "Invii falliti ripetuti"},
    "routing_conflict": {"severity": "high", "module": "routing", "title_tpl": "Conflitto di routing"},
    "suspicious_login": {"severity": "critical", "module": "security", "title_tpl": "Accesso sospetto"},
    "repeated_failed_login": {"severity": "high", "module": "security", "title_tpl": "Tentativi accesso falliti"},
    "unusual_document_movement": {"severity": "high", "module": "security", "title_tpl": "Movimento documenti anomalo"},
    "permission_denied_repeated": {"severity": "high", "module": "security", "title_tpl": "Permessi negati ripetutamente"},
    "state_inconsistency": {"severity": "warning", "module": "governance", "title_tpl": "Inconsistenza di stato"},
    "missing_output": {"severity": "warning", "module": "submission", "title_tpl": "Output mancante"},
    "creator_critical": {"severity": "critical", "module": "governance", "title_tpl": "Allerta critica Creator"},
    "governance_block": {"severity": "high", "module": "governance", "title_tpl": "Blocco governance"},
    "document_custody_issue": {"severity": "high", "module": "vault", "title_tpl": "Problema custodia documento"},
}

async def create_alert(
    alert_type: str, title: str, explanation: str,
    practice_id: str = None, user_id: str = None, actor: str = None,
    severity: str = None, next_action: str = None, visibility: str = "admin"
):
    """Create an alert in the Alert Center."""
    cfg = ALERT_TYPES.get(alert_type, {})
    alert = {
        "id": str(uuid.uuid4()),
        "alert_type": alert_type,
        "severity": severity or cfg.get("severity", "info"),
        "title": title,
        "explanation": explanation,
        "practice_id": practice_id,
        "user_id": user_id,
        "actor": actor,
        "module": cfg.get("module", "system"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "open",
        "next_action": next_action or "Verificare e intervenire",
        "visibility": visibility,
    }
    await db.alerts.insert_one(alert)
    alert.pop("_id", None)
    return alert

@api_router.get("/alerts")
async def get_alerts(user: dict = Depends(get_current_user), status: Optional[str] = None, severity: Optional[str] = None, limit: int = 100):
    """Get alerts based on role visibility."""
    role = user.get("role", "user")
    query = {}
    if role == "user":
        query["$or"] = [{"user_id": user["id"]}, {"visibility": "all"}]
    elif role == "admin":
        query["visibility"] = {"$in": ["admin", "all", "creator"]}
    # creator sees all

    if status:
        query["status"] = status
    if severity:
        query["severity"] = severity

    alerts = await db.alerts.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)

    sections = {"new": [], "high_critical": [], "practice": [], "security": [], "governance": [], "resolved": []}
    counts = {"open": 0, "high": 0, "critical": 0, "total": len(alerts)}
    for a in alerts:
        if a["status"] == "resolved":
            sections["resolved"].append(a)
        elif a["severity"] in ["high", "critical"]:
            sections["high_critical"].append(a)
            counts["high" if a["severity"] == "high" else "critical"] += 1
            counts["open"] += 1
        elif a["module"] == "security":
            sections["security"].append(a)
            counts["open"] += 1
        elif a["module"] == "governance":
            sections["governance"].append(a)
            counts["open"] += 1
        elif a["module"] in ["practice", "documents", "submission", "delegation", "deadline"]:
            sections["practice"].append(a)
            counts["open"] += 1
        else:
            sections["new"].append(a)
            counts["open"] += 1

    return {"sections": sections, "counts": counts}

@api_router.put("/alerts/{alert_id}")
async def update_alert(alert_id: str, user: dict = Depends(get_current_user)):
    """Acknowledge or resolve an alert."""

    class AlertAction(BaseModel):
        action: str  # acknowledge, resolve, mute, escalate

    # Read body manually
    from starlette.requests import Request
    import json as json_mod
    body = await db.alerts.find_one({"id": alert_id})
    if not body:
        raise HTTPException(status_code=404, detail="Allerta non trovata")
    return {"message": "Usa PATCH per aggiornare lo stato"}

@api_router.patch("/alerts/{alert_id}")
async def patch_alert(alert_id: str, user: dict = Depends(get_current_user), action: str = "acknowledge"):
    """Update alert status."""
    alert = await db.alerts.find_one({"id": alert_id})
    if not alert:
        raise HTTPException(status_code=404, detail="Allerta non trovata")

    status_map = {"acknowledge": "acknowledged", "resolve": "resolved", "mute": "muted", "escalate": "open"}
    new_status = status_map.get(action, "acknowledged")
    await db.alerts.update_one({"id": alert_id}, {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": user.get("email")}})

    await log_audit_event(user["id"], user.get("role", "user"), f"alert_{action}", "alert", alert_id,
        previous_state=alert.get("status"), new_state=new_status, severity="info", practice_id=alert.get("practice_id"))

    return {"message": f"Allerta {new_status}", "alert_id": alert_id, "new_status": new_status}

@api_router.get("/alerts/summary")
async def get_alerts_summary(user: dict = Depends(get_current_user)):
    """Quick summary for badge display."""
    role = user.get("role", "user")
    query = {"status": {"$in": ["open"]}}
    if role == "user":
        query["$or"] = [{"user_id": user["id"]}, {"visibility": "all"}]
    elif role == "admin":
        query["visibility"] = {"$in": ["admin", "all", "creator"]}

    open_count = await db.alerts.count_documents(query)
    query["severity"] = {"$in": ["high", "critical"]}
    urgent_count = await db.alerts.count_documents(query)
    return {"open": open_count, "urgent": urgent_count}

# ========================
# SECURITY MONITORING
# ========================

SECURITY_EVENT_TYPES = {
    "failed_login": {"severity": "info", "threshold": 3, "alert_type": "repeated_failed_login"},
    "password_reset_attempt": {"severity": "info", "threshold": 3, "alert_type": "suspicious_login"},
    "permission_denied": {"severity": "info", "threshold": 5, "alert_type": "permission_denied_repeated"},
    "document_reassignment": {"severity": "warning", "threshold": 2, "alert_type": "unusual_document_movement"},
    "failed_submission": {"severity": "warning", "threshold": 2, "alert_type": "repeated_failed_submission"},
    "sensitive_area_access": {"severity": "info", "threshold": 5, "alert_type": "suspicious_login"},
}

async def log_security_event(event_type: str, actor: str, target: str = None, reason: str = None, details: dict = None):
    """Log a security event and check thresholds for alert generation."""
    cfg = SECURITY_EVENT_TYPES.get(event_type, {"severity": "info", "threshold": 10, "alert_type": "suspicious_login"})
    event = {
        "id": str(uuid.uuid4()),
        "event_type": event_type,
        "severity": cfg["severity"],
        "actor": actor,
        "target": target,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "reason": reason,
        "details": details or {},
        "linked_alert_id": None,
    }
    await db.security_events.insert_one(event)

    # Check threshold for auto-alert
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    recent = await db.security_events.count_documents({
        "event_type": event_type, "actor": actor,
        "timestamp": {"$gte": one_hour_ago}
    })

    if recent >= cfg["threshold"]:
        alert = await create_alert(
            cfg["alert_type"],
            f"{ALERT_TYPES.get(cfg['alert_type'], {}).get('title_tpl', 'Evento sicurezza')}: {actor}",
            f"{recent} eventi '{event_type}' nell'ultima ora per {actor}. {reason or ''}",
            user_id=actor, actor=actor, visibility="admin",
            next_action="Verificare l'attivita dell'utente"
        )
        event["linked_alert_id"] = alert["id"]
        await db.security_events.update_one({"id": event["id"]}, {"$set": {"linked_alert_id": alert["id"]}})

    event.pop("_id", None)
    return event

@api_router.get("/security/events")
async def get_security_events(user: dict = Depends(get_current_user), limit: int = 50, event_type: Optional[str] = None):
    """Get security events (admin/creator only)."""
    perm = check_permission(user.get("role", "user"), "view_fail_safe_details")
    if not perm["allowed"]:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    query = {}
    if event_type:
        query["event_type"] = event_type
    events = await db.security_events.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return {"events": events, "total": len(events)}

@api_router.get("/security/summary")
async def get_security_summary(user: dict = Depends(get_current_user)):
    """Security summary for admin/creator."""
    perm = check_permission(user.get("role", "user"), "view_fail_safe_details")
    if not perm["allowed"]:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")

    one_day_ago = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    total_24h = await db.security_events.count_documents({"timestamp": {"$gte": one_day_ago}})
    by_type = {}
    for et in SECURITY_EVENT_TYPES:
        by_type[et] = await db.security_events.count_documents({"event_type": et, "timestamp": {"$gte": one_day_ago}})
    high_severity = await db.security_events.count_documents({"severity": {"$in": ["high", "critical"]}, "timestamp": {"$gte": one_day_ago}})

    return {"total_24h": total_24h, "by_type": by_type, "high_severity_24h": high_severity}

# ========================
# DOCUMENT VAULT
# ========================

VAULT_STATUSES = {
    "stored": "Archiviato", "linked": "Collegato", "under_review": "In revisione",
    "verified": "Verificato", "rejected": "Rifiutato", "archived": "Archiviato",
    "locked": "Bloccato", "ready_for_send": "Pronto per invio", "sent": "Inviato",
    "protected_output": "Output protetto"
}

VAULT_CATEGORIES = {
    "identity": "Identita", "tax": "Fiscale", "company": "Aziendale",
    "accounting": "Contabilita", "payment": "Pagamento", "delegation": "Delega",
    "compliance": "Conformita", "support_docs": "Documenti supporto",
    "generated_pdf": "PDF generato", "receipt_protocol": "Ricevuta/protocollo",
    "final_dossier": "Dossier finale", "other": "Altro"
}

SENSITIVITY_LEVELS = {"low": "Basso", "medium": "Medio", "high": "Alto", "critical": "Critico"}

@api_router.get("/vault")
async def get_vault(user: dict = Depends(get_current_user), practice_id: Optional[str] = None, category: Optional[str] = None, vault_status: Optional[str] = None):
    """Get Document Vault contents with role-based visibility."""
    role = user.get("role", "user")
    query = {"is_deleted": False}
    if role == "user":
        query["user_id"] = user["id"]
    if practice_id:
        query["practice_id"] = practice_id
    if category:
        query["category"] = category
    if vault_status:
        query["vault_status"] = vault_status

    docs = await db.documents.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)

    # Enrich with vault metadata
    enriched = []
    for d in docs:
        enriched.append({
            "id": d.get("id"),
            "original_filename": d.get("original_filename"),
            "category": d.get("category", "other"),
            "category_label": VAULT_CATEGORIES.get(d.get("category", "other"), d.get("category", "Altro")),
            "practice_id": d.get("practice_id"),
            "user_id": d.get("user_id"),
            "content_type": d.get("content_type"),
            "size": d.get("size"),
            "vault_status": d.get("vault_status", "stored"),
            "vault_status_label": VAULT_STATUSES.get(d.get("vault_status", "stored"), "Archiviato"),
            "sensitivity_level": d.get("sensitivity_level", "medium"),
            "sensitivity_label": SENSITIVITY_LEVELS.get(d.get("sensitivity_level", "medium"), "Medio"),
            "verification_status": d.get("verification_status", "pending"),
            "uploaded_by": d.get("user_id"),
            "created_at": d.get("created_at"),
            "updated_at": d.get("updated_at"),
            "version": d.get("version", 1),
        })

    # Counts by status and category
    status_counts = {}
    cat_counts = {}
    for d in enriched:
        vs = d["vault_status"]
        status_counts[vs] = status_counts.get(vs, 0) + 1
        cat = d["category"]
        cat_counts[cat] = cat_counts.get(cat, 0) + 1

    return {"documents": enriched, "total": len(enriched), "status_counts": status_counts, "category_counts": cat_counts}

@api_router.patch("/vault/{document_id}")
async def update_vault_document(document_id: str, user: dict = Depends(get_current_user), vault_status: Optional[str] = None, category: Optional[str] = None, sensitivity_level: Optional[str] = None):
    """Update vault metadata for a document."""
    is_admin = user.get("role") in ["admin", "creator"]
    query = {"id": document_id, "is_deleted": False}
    if not is_admin:
        query["user_id"] = user["id"]

    doc = await db.documents.find_one(query)
    if not doc:
        raise HTTPException(status_code=404, detail="Documento non trovato")

    update_fields = {"updated_at": datetime.now(timezone.utc).isoformat()}
    prev_status = doc.get("vault_status", "stored")
    if vault_status and vault_status in VAULT_STATUSES:
        update_fields["vault_status"] = vault_status
    if category and category in VAULT_CATEGORIES:
        update_fields["category"] = category
    if sensitivity_level and sensitivity_level in SENSITIVITY_LEVELS:
        update_fields["sensitivity_level"] = sensitivity_level

    await db.documents.update_one({"id": document_id}, {"$set": update_fields})

    # Audit trail
    await log_audit_event(user["id"], user.get("role", "user"), "vault_document_updated", "document", document_id,
        previous_state=prev_status, new_state=vault_status or prev_status,
        severity="info", practice_id=doc.get("practice_id"),
        details={"category": category, "sensitivity": sensitivity_level})

    # Security check: category change on sensitive doc
    if category and category != doc.get("category") and doc.get("sensitivity_level") in ["high", "critical"]:
        await log_security_event("document_reassignment", user.get("email", user["id"]),
            target=document_id, reason=f"Categoria cambiata da {doc.get('category')} a {category}")
        await create_alert("document_custody_issue",
            "Riclassificazione documento sensibile",
            f"Documento {doc.get('original_filename')} riclassificato da {doc.get('category')} a {category}",
            practice_id=doc.get("practice_id"), user_id=user["id"], visibility="admin",
            next_action="Verificare la correttezza della riclassificazione")

    return {"message": "Documento aggiornato", "document_id": document_id}

@api_router.get("/vault/summary")
async def get_vault_summary(user: dict = Depends(get_current_user)):
    """Vault health summary."""
    role = user.get("role", "user")
    query = {"is_deleted": False}
    if role == "user":
        query["user_id"] = user["id"]

    total = await db.documents.count_documents(query)
    verified = await db.documents.count_documents({**query, "verification_status": "verified"})
    pending = await db.documents.count_documents({**query, "verification_status": {"$in": ["pending", None]}})
    rejected = await db.documents.count_documents({**query, "verification_status": "rejected"})
    high_sensitivity = await db.documents.count_documents({**query, "sensitivity_level": {"$in": ["high", "critical"]}})

    return {"total": total, "verified": verified, "pending_review": pending, "rejected": rejected, "high_sensitivity": high_sensitivity}

# ========================
# HERION GUARD ENGINE
# ========================

GUARD_DIMENSIONS = {
    "readiness": {"label": "Prontezza Pratica", "weight": 3},
    "support_level": {"label": "Livello di Supporto", "weight": 3},
    "routing_clarity": {"label": "Chiarezza Routing", "weight": 2},
    "delegation_validity": {"label": "Validita Delega", "weight": 3},
    "approval_status": {"label": "Stato Approvazione", "weight": 3},
    "risk_profile": {"label": "Profilo di Rischio", "weight": 2},
    "document_completeness": {"label": "Completezza Documenti", "weight": 3},
}

async def herion_guard_evaluate(practice_id: str, action: str = "submit", actor_id: str = None, actor_role: str = "user") -> dict:
    """Herion Guard — boundary-enforcement agent. Evaluates practice readiness across
    multiple dimensions. When blocked, always provides safe alternative recommendations."""
    practice = await db.practices.find_one({"id": practice_id}, {"_id": 0})
    if not practice:
        return {
            "verdict": "hard_blocked",
            "verdict_label": "Bloccato",
            "reason": "Pratica non trovata",
            "dimensions": [],
            "safe_alternatives": [],
            "guard_score": 0,
            "can_proceed": False,
        }

    readiness = await calculate_readiness(practice)

    dimensions = []
    safe_alternatives = []
    blockers_count = 0
    warnings_count = 0

    # 1. Readiness
    readiness_state = readiness.get("readiness_state", "unknown")
    if readiness_state in ["ready_to_submit", "completed", "submitted"]:
        dimensions.append({"key": "readiness", "label": "Prontezza Pratica", "status": "passed", "detail": "Pratica pronta"})
    elif readiness_state == "waiting_approval":
        dimensions.append({"key": "readiness", "label": "Prontezza Pratica", "status": "warning", "detail": "In attesa di approvazione"})
        warnings_count += 1
        if action == "submit":
            safe_alternatives.append({"action": "request_approval", "label": "Richiedere approvazione", "detail": "La pratica richiede approvazione prima dell'invio.", "priority": "high"})
    else:
        dimensions.append({"key": "readiness", "label": "Prontezza Pratica", "status": "blocked", "detail": f"Stato: {readiness_state}"})
        blockers_count += 1
        if readiness.get("blockers"):
            for b in readiness["blockers"][:3]:
                safe_alternatives.append({"action": "resolve_blocker", "label": f"Risolvere: {b}", "detail": b, "priority": "high"})

    # 2. Support Level
    support = readiness.get("support_level", "unknown")
    if support == "supported":
        dimensions.append({"key": "support_level", "label": "Livello di Supporto", "status": "passed", "detail": "Pienamente supportata"})
    elif support == "partially_supported":
        dimensions.append({"key": "support_level", "label": "Livello di Supporto", "status": "warning", "detail": "Parzialmente supportata — preparazione completa, invio tramite portale esterno"})
        warnings_count += 1
    elif support == "not_supported":
        dimensions.append({"key": "support_level", "label": "Livello di Supporto", "status": "blocked", "detail": "Non supportata dalla piattaforma"})
        blockers_count += 1
        safe_alternatives.append({"action": "escalate", "label": "Escalation a professionista", "detail": "Questa pratica richiede assistenza professionale esterna.", "priority": "critical"})
    else:
        dimensions.append({"key": "support_level", "label": "Livello di Supporto", "status": "warning", "detail": "Livello di supporto non determinato"})
        warnings_count += 1

    # 3. Routing Clarity
    if readiness.get("routing_clear"):
        channel = readiness.get("channel", "unknown")
        dimensions.append({"key": "routing_clarity", "label": "Chiarezza Routing", "status": "passed", "detail": f"Canale: {channel}"})
    else:
        dimensions.append({"key": "routing_clarity", "label": "Chiarezza Routing", "status": "blocked", "detail": "Routing non chiaro o destinazione non trovata"})
        blockers_count += 1
        safe_alternatives.append({"action": "verify_routing", "label": "Verificare routing", "detail": "Contattare l'amministratore per verificare il canale e la destinazione corretti.", "priority": "medium"})

    # 4. Delegation Validity
    if readiness.get("delegation_required"):
        if readiness.get("delegation_valid"):
            dimensions.append({"key": "delegation_validity", "label": "Validita Delega", "status": "passed", "detail": "Delega valida"})
        else:
            d_status = readiness.get("delegation_status", "mancante")
            dimensions.append({"key": "delegation_validity", "label": "Validita Delega", "status": "blocked", "detail": f"Delega: {d_status}"})
            blockers_count += 1
            if d_status in ["not_required", "requested"]:
                safe_alternatives.append({"action": "request_delegation", "label": "Richiedere delega", "detail": "Avviare il processo di delega dal pannello pratica.", "priority": "high"})
            elif d_status in ["expired", "rejected"]:
                safe_alternatives.append({"action": "renew_delegation", "label": "Rinnovare delega", "detail": "La delega precedente non e piu valida. Caricare un nuovo documento di delega.", "priority": "high"})
            else:
                safe_alternatives.append({"action": "upload_delegation", "label": "Caricare documento delega", "detail": "Caricare il documento di delega firmato.", "priority": "high"})
    else:
        dimensions.append({"key": "delegation_validity", "label": "Validita Delega", "status": "passed", "detail": "Non richiesta"})

    # 5. Approval Status
    if readiness.get("approval_required"):
        a_status = readiness.get("approval_status", "not_started")
        if a_status == "approved":
            dimensions.append({"key": "approval_status", "label": "Stato Approvazione", "status": "passed", "detail": "Approvata"})
        elif a_status == "pending":
            dimensions.append({"key": "approval_status", "label": "Stato Approvazione", "status": "warning", "detail": "In attesa"})
            warnings_count += 1
        else:
            dimensions.append({"key": "approval_status", "label": "Stato Approvazione", "status": "blocked", "detail": "Approvazione non ancora richiesta"})
            blockers_count += 1
            safe_alternatives.append({"action": "start_orchestration", "label": "Avviare analisi agenti", "detail": "Eseguire l'orchestrazione degli agenti per preparare la pratica all'approvazione.", "priority": "high"})
    else:
        dimensions.append({"key": "approval_status", "label": "Stato Approvazione", "status": "passed", "detail": "Non richiesta"})

    # 6. Risk Profile
    risk = readiness.get("risk_level", "unknown")
    if risk in ["basic", "low"]:
        dimensions.append({"key": "risk_profile", "label": "Profilo di Rischio", "status": "passed", "detail": "Rischio basso"})
    elif risk == "medium":
        dimensions.append({"key": "risk_profile", "label": "Profilo di Rischio", "status": "warning", "detail": "Rischio medio — verifica raccomandata"})
        warnings_count += 1
    elif risk == "high":
        dimensions.append({"key": "risk_profile", "label": "Profilo di Rischio", "status": "blocked", "detail": "Rischio alto — approvazione esplicita richiesta"})
        if practice.get("status") != "approved":
            blockers_count += 1
            safe_alternatives.append({"action": "request_review", "label": "Richiedere revisione", "detail": "Pratica ad alto rischio: richiedere revisione da parte di admin o Creator.", "priority": "critical"})
    else:
        dimensions.append({"key": "risk_profile", "label": "Profilo di Rischio", "status": "warning", "detail": "Rischio non determinato"})
        warnings_count += 1

    # 7. Document Completeness (enhanced with Document Matrix)
    practice_type = practice.get("practice_type") or practice.get("template_source")
    matrix = DOCUMENT_MATRIX.get(practice_type)
    if matrix:
        matrix_result = await get_document_matrix_for_practice(practice_id)
        completeness = matrix_result.get("completeness", {})
        if completeness.get("can_proceed") and completeness.get("all_required_uploaded"):
            dimensions.append({"key": "document_completeness", "label": "Completezza Documenti", "status": "passed", "detail": f"{completeness.get('uploaded_required', 0)}/{completeness.get('total_required', 0)} documenti richiesti caricati"})
        elif completeness.get("missing_signatures"):
            dimensions.append({"key": "document_completeness", "label": "Completezza Documenti", "status": "blocked", "detail": f"Firme mancanti: {', '.join(completeness['missing_signatures'][:2])}"})
            blockers_count += 1
            for sig in completeness["missing_signatures"][:2]:
                safe_alternatives.append({"action": "upload_signed", "label": f"Caricare versione firmata: {sig}", "detail": f"Il documento {sig} richiede firma digitale (P7M o PAdES).", "priority": "high"})
        else:
            missing = completeness.get("missing_required", [])
            dimensions.append({"key": "document_completeness", "label": "Completezza Documenti", "status": "blocked", "detail": f"{len(missing)} documenti mancanti"})
            blockers_count += 1
            for m in missing[:3]:
                safe_alternatives.append({"action": "upload_document", "label": f"Caricare: {m}", "detail": f"Documento richiesto: {m}", "priority": "high"})
    else:
        doc_blockers = [b for b in readiness.get("blockers", []) if "Documento" in b or "documento" in b]
        if not doc_blockers:
            dimensions.append({"key": "document_completeness", "label": "Completezza Documenti", "status": "passed", "detail": f"{readiness.get('document_count', 0)} documenti presenti"})
        else:
            dimensions.append({"key": "document_completeness", "label": "Completezza Documenti", "status": "blocked", "detail": f"{len(doc_blockers)} documenti mancanti"})
            blockers_count += 1
            for db_item in doc_blockers[:3]:
                safe_alternatives.append({"action": "upload_document", "label": f"Caricare: {db_item.replace('Documento mancante: ', '')}", "detail": db_item, "priority": "high"})

    # Determine verdict
    if blockers_count == 0 and warnings_count == 0:
        verdict = "cleared"
        verdict_label = "Autorizzato"
    elif blockers_count == 0 and warnings_count > 0:
        verdict = "guarded"
        verdict_label = "Sorvegliato"
    else:
        verdict = "hard_blocked"
        verdict_label = "Bloccato"

    # Calculate score (0-100)
    total_dims = len(dimensions)
    passed = sum(1 for d in dimensions if d["status"] == "passed")
    guard_score = round((passed / total_dims) * 100) if total_dims > 0 else 0

    # Deduplicate alternatives
    seen = set()
    unique_alts = []
    for alt in safe_alternatives:
        key = alt["action"] + alt.get("label", "")
        if key not in seen:
            seen.add(key)
            unique_alts.append(alt)

    # Sort by priority
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    unique_alts.sort(key=lambda x: priority_order.get(x.get("priority", "low"), 3))

    # Log timeline event
    event_type = f"guard_{verdict}"
    await add_timeline_event(practice_id, actor_id or "system", event_type, {
        "action_evaluated": action,
        "verdict": verdict,
        "guard_score": guard_score,
        "blockers_count": blockers_count,
        "warnings_count": warnings_count,
        "alternatives_count": len(unique_alts),
    })

    # Log audit
    await log_audit_event(
        actor_id or "system", actor_role, f"guard_evaluation_{verdict}", "practice", practice_id,
        reason=f"Guard verdict: {verdict_label} (score: {guard_score}%)",
        severity="info" if verdict == "cleared" else "high" if verdict == "hard_blocked" else "medium",
        practice_id=practice_id,
        details={"guard_score": guard_score, "blockers": blockers_count, "warnings": warnings_count, "action": action}
    )

    # Create alert for hard blocks
    if verdict == "hard_blocked":
        await create_alert(
            "governance_block",
            "Herion Guard: pratica bloccata",
            f"La pratica {practice_id[:8]} e stata bloccata da Herion Guard durante '{action}'. Punteggio: {guard_score}%. {blockers_count} blocchi identificati.",
            practice_id=practice_id, user_id=actor_id,
            next_action=unique_alts[0]["label"] if unique_alts else "Verificare i requisiti",
            visibility="admin"
        )

    return {
        "verdict": verdict,
        "verdict_label": verdict_label,
        "guard_score": guard_score,
        "can_proceed": verdict in ["cleared", "guarded"],
        "dimensions": dimensions,
        "safe_alternatives": unique_alts,
        "blockers_count": blockers_count,
        "warnings_count": warnings_count,
        "practice_id": practice_id,
        "action_evaluated": action,
        "readiness_state": readiness.get("readiness_state"),
        "risk_level": readiness.get("risk_level"),
    }

@api_router.get("/guard/evaluate/{practice_id}")
async def get_guard_evaluation(practice_id: str, action: str = "submit", user: dict = Depends(get_current_user)):
    """Run Herion Guard evaluation for a practice."""
    result = await herion_guard_evaluate(practice_id, action, user["id"], user.get("role", "user"))
    return result

@api_router.get("/guard/summary")
async def get_guard_summary(user: dict = Depends(get_current_user)):
    """Get summary of recent Guard evaluations across all practices."""
    role = user.get("role", "user")
    query = {} if role in ["admin", "creator"] else {"user_id": user["id"]}
    practices = await db.practices.find(query, {"_id": 0, "id": 1, "practice_type_label": 1, "client_name": 1, "status": 1}).to_list(200)

    evaluations = []
    for p in practices[:20]:
        if p.get("status") in ["draft", "completed", "rejected"]:
            continue
        ev = await herion_guard_evaluate(p["id"], "submit", user["id"], role)
        evaluations.append({
            "practice_id": p["id"],
            "practice_label": p.get("practice_type_label", ""),
            "client_name": p.get("client_name", ""),
            "status": p.get("status"),
            "verdict": ev["verdict"],
            "verdict_label": ev["verdict_label"],
            "guard_score": ev["guard_score"],
            "blockers_count": ev["blockers_count"],
            "alternatives_count": len(ev["safe_alternatives"]),
        })

    cleared = sum(1 for e in evaluations if e["verdict"] == "cleared")
    guarded = sum(1 for e in evaluations if e["verdict"] == "guarded")
    blocked = sum(1 for e in evaluations if e["verdict"] == "hard_blocked")

    return {
        "total_evaluated": len(evaluations),
        "cleared": cleared,
        "guarded": guarded,
        "blocked": blocked,
        "evaluations": evaluations,
    }

# ========================
# REAL-TIME FOLLOW-UP SYSTEM
# ========================

FOLLOW_UP_RULES = {
    "submitted_no_receipt": {
        "trigger_status": "submitted",
        "expected_event": "receipt_received",
        "deadline_hours": 48,
        "label": "Ricevuta mancante dopo invio",
        "description": "La pratica e stata inviata ma non e stata ricevuta la conferma/ricevuta.",
        "urgency_escalation": {"pending": 0, "overdue": 48, "critical": 96},
    },
    "approved_not_submitted": {
        "trigger_status": "approved",
        "expected_event": "submitted",
        "deadline_hours": 24,
        "label": "Invio in attesa dopo approvazione",
        "description": "La pratica e stata approvata ma non ancora inviata.",
        "urgency_escalation": {"pending": 0, "overdue": 24, "critical": 72},
    },
    "delegation_pending_verification": {
        "trigger_status": None,
        "trigger_delegation": "under_review",
        "expected_event": "delegation_verified",
        "deadline_hours": 72,
        "label": "Delega in attesa di verifica",
        "description": "Un documento di delega e stato caricato ma non ancora verificato.",
        "urgency_escalation": {"pending": 0, "overdue": 72, "critical": 144},
    },
    "orchestration_awaiting_approval": {
        "trigger_status": "waiting_approval",
        "expected_event": "approved",
        "deadline_hours": 48,
        "label": "Approvazione in attesa",
        "description": "L'orchestrazione e completata ma l'utente non ha ancora approvato.",
        "urgency_escalation": {"pending": 0, "overdue": 48, "critical": 120},
    },
    "stagnant_in_progress": {
        "trigger_status": "in_progress",
        "expected_event": "any_progression",
        "deadline_hours": 120,
        "label": "Pratica ferma in elaborazione",
        "description": "La pratica non ha avuto progressi recenti.",
        "urgency_escalation": {"pending": 0, "overdue": 120, "critical": 240},
    },
}

async def evaluate_follow_ups():
    """Scan practices and generate/update follow-up items based on current state."""
    now = datetime.now(timezone.utc)
    active_practices = await db.practices.find(
        {"status": {"$in": ["submitted", "approved", "waiting_approval", "in_progress", "processing"]}},
        {"_id": 0}
    ).to_list(500)

    created_count = 0
    updated_count = 0

    for practice in active_practices:
        p_id = practice["id"]
        status = practice.get("status")
        delegation_status = (practice.get("delegation_info") or {}).get("status")

        for rule_key, rule in FOLLOW_UP_RULES.items():
            trigger_match = False

            if rule.get("trigger_status") and rule["trigger_status"] == status:
                trigger_match = True
            elif rule.get("trigger_delegation") and rule["trigger_delegation"] == delegation_status:
                trigger_match = True

            if not trigger_match:
                continue

            existing = await db.follow_up_items.find_one(
                {"practice_id": p_id, "rule_key": rule_key, "status": {"$ne": "resolved"}},
                {"_id": 0}
            )

            if existing:
                created_at = datetime.fromisoformat(existing["created_at"])
                hours_elapsed = (now - created_at).total_seconds() / 3600
                escalation = rule["urgency_escalation"]

                if hours_elapsed >= escalation["critical"] and existing["urgency"] != "critical":
                    await db.follow_up_items.update_one(
                        {"id": existing["id"]},
                        {"$set": {"urgency": "critical", "updated_at": now.isoformat()}}
                    )
                    await create_alert("missing_output", f"Follow-up critico: {rule['label']}",
                        f"Pratica {p_id[:8]}: {rule['description']} Urgenza critica raggiunta.",
                        practice_id=p_id, severity="critical", next_action="Intervento immediato richiesto",
                        visibility="admin")
                    updated_count += 1
                elif hours_elapsed >= escalation["overdue"] and existing["urgency"] == "pending":
                    await db.follow_up_items.update_one(
                        {"id": existing["id"]},
                        {"$set": {"urgency": "overdue", "updated_at": now.isoformat()}}
                    )
                    updated_count += 1
            else:
                timestamp_field = None
                if status == "submitted":
                    timestamp_field = practice.get("submitted_at")
                elif status == "approved":
                    timestamp_field = practice.get("approved_at")
                elif status in ["waiting_approval", "in_progress", "processing"]:
                    timestamp_field = practice.get("updated_at")

                if not timestamp_field:
                    timestamp_field = now.isoformat()

                created_at_dt = datetime.fromisoformat(timestamp_field) if isinstance(timestamp_field, str) else timestamp_field
                deadline_at = created_at_dt + timedelta(hours=rule["deadline_hours"])
                hours_elapsed = (now - created_at_dt).total_seconds() / 3600
                escalation = rule["urgency_escalation"]

                if hours_elapsed >= escalation["critical"]:
                    urgency = "critical"
                elif hours_elapsed >= escalation["overdue"]:
                    urgency = "overdue"
                else:
                    urgency = "pending"

                follow_up = {
                    "id": str(uuid.uuid4()),
                    "practice_id": p_id,
                    "rule_key": rule_key,
                    "label": rule["label"],
                    "description": rule["description"],
                    "urgency": urgency,
                    "status": "open",
                    "expected_event": rule["expected_event"],
                    "deadline_at": deadline_at.isoformat(),
                    "created_at": now.isoformat(),
                    "updated_at": now.isoformat(),
                    "practice_status": status,
                    "practice_label": practice.get("practice_type_label", ""),
                    "client_name": practice.get("client_name", ""),
                    "resolved_at": None,
                    "resolved_by": None,
                    "resolution_note": None,
                }
                await db.follow_up_items.insert_one(follow_up)
                created_count += 1

    # Auto-resolve follow-ups for practices that progressed
    open_follow_ups = await db.follow_up_items.find(
        {"status": "open"}, {"_id": 0}
    ).to_list(500)

    for fu in open_follow_ups:
        practice = await db.practices.find_one({"id": fu["practice_id"]}, {"_id": 0})
        if not practice:
            await db.follow_up_items.update_one(
                {"id": fu["id"]},
                {"$set": {"status": "resolved", "urgency": "resolved", "resolved_at": now.isoformat(), "resolution_note": "Pratica non trovata"}}
            )
            continue

        should_resolve = False
        if fu["rule_key"] == "submitted_no_receipt" and practice.get("status") == "completed":
            should_resolve = True
        elif fu["rule_key"] == "approved_not_submitted" and practice.get("status") in ["submitted", "completed"]:
            should_resolve = True
        elif fu["rule_key"] == "delegation_pending_verification":
            d_status = (practice.get("delegation_info") or {}).get("status")
            if d_status in ["valid", "not_required"]:
                should_resolve = True
        elif fu["rule_key"] == "orchestration_awaiting_approval" and practice.get("status") in ["approved", "submitted", "completed"]:
            should_resolve = True
        elif fu["rule_key"] == "stagnant_in_progress" and practice.get("status") not in ["in_progress", "processing"]:
            should_resolve = True

        if should_resolve:
            await db.follow_up_items.update_one(
                {"id": fu["id"]},
                {"$set": {"status": "resolved", "urgency": "resolved", "resolved_at": now.isoformat(), "resolution_note": "Risolto automaticamente"}}
            )

    return {"created": created_count, "updated": updated_count}


@api_router.get("/follow-ups")
async def get_follow_ups(user: dict = Depends(get_current_user), status: Optional[str] = None, urgency: Optional[str] = None, limit: int = 100):
    """Get follow-up items. Admin/Creator see all, users see own."""
    # Trigger follow-up evaluation
    await evaluate_follow_ups()

    role = user.get("role", "user")
    query = {}
    if status:
        query["status"] = status
    else:
        query["status"] = {"$ne": "resolved"}
    if urgency:
        query["urgency"] = urgency

    if role == "user":
        user_practices = await db.practices.find({"user_id": user["id"]}, {"_id": 0, "id": 1}).to_list(200)
        p_ids = [p["id"] for p in user_practices]
        query["practice_id"] = {"$in": p_ids}

    items = await db.follow_up_items.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return items


@api_router.get("/follow-ups/summary")
async def get_follow_ups_summary(user: dict = Depends(get_current_user)):
    """Get summary of follow-up items."""
    await evaluate_follow_ups()

    role = user.get("role", "user")
    base_query = {}
    if role == "user":
        user_practices = await db.practices.find({"user_id": user["id"]}, {"_id": 0, "id": 1}).to_list(200)
        p_ids = [p["id"] for p in user_practices]
        base_query["practice_id"] = {"$in": p_ids}

    total_open = await db.follow_up_items.count_documents({**base_query, "status": "open"})
    pending = await db.follow_up_items.count_documents({**base_query, "status": "open", "urgency": "pending"})
    overdue = await db.follow_up_items.count_documents({**base_query, "status": "open", "urgency": "overdue"})
    critical = await db.follow_up_items.count_documents({**base_query, "status": "open", "urgency": "critical"})
    resolved = await db.follow_up_items.count_documents({**base_query, "status": "resolved"})

    return {
        "total_open": total_open,
        "pending": pending,
        "overdue": overdue,
        "critical": critical,
        "resolved": resolved,
    }


@api_router.patch("/follow-ups/{follow_up_id}")
async def resolve_follow_up(follow_up_id: str, user: dict = Depends(get_current_user)):
    """Resolve a follow-up item manually."""
    role = user.get("role", "user")
    if role not in ["admin", "creator"]:
        raise HTTPException(status_code=403, detail="Solo admin e Creator possono risolvere follow-up")

    class ResolveData(BaseModel):
        resolution_note: Optional[str] = None

    item = await db.follow_up_items.find_one({"id": follow_up_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Follow-up non trovato")

    now = datetime.now(timezone.utc).isoformat()
    await db.follow_up_items.update_one(
        {"id": follow_up_id},
        {"$set": {
            "status": "resolved",
            "urgency": "resolved",
            "resolved_at": now,
            "resolved_by": user["id"],
            "resolution_note": "Risolto manualmente da " + user.get("name", user.get("email", "admin")),
        }}
    )

    await add_timeline_event(item["practice_id"], user["id"], "follow_up_resolved", {
        "follow_up_id": follow_up_id,
        "rule_key": item.get("rule_key"),
    })

    return {"message": "Follow-up risolto", "id": follow_up_id}


# ========================
# DOCUMENT INTELLIGENCE LAYER
# ========================

# Full Document Matrix — per practice type
DOCUMENT_MATRIX = {
    "VAT_OPEN_PF": {
        "required": [
            {"doc_key": "identity_document", "label": "Documento di identita", "description": "Carta d'identita o passaporto in corso di validita", "formats": ["pdf", "jpg", "png"], "max_size_mb": 10, "blocking": True, "sensitivity": "personal", "signed_required": False},
            {"doc_key": "codice_fiscale", "label": "Codice Fiscale / Tessera Sanitaria", "description": "Codice fiscale o tessera sanitaria con CF leggibile", "formats": ["pdf", "jpg", "png"], "max_size_mb": 5, "blocking": True, "sensitivity": "personal", "signed_required": False},
            {"doc_key": "modello_aa9_12", "label": "Modello AA9/12 compilato", "description": "Modello di dichiarazione per inizio attivita, variazione o cessazione (persone fisiche)", "formats": ["pdf"], "max_size_mb": 5, "blocking": True, "sensitivity": "fiscal", "signed_required": True},
        ],
        "optional": [
            {"doc_key": "pec_certificate", "label": "Certificato PEC", "description": "Certificato di posta elettronica certificata", "formats": ["pdf"], "max_size_mb": 5, "sensitivity": "standard"},
        ],
        "conditional": [
            {"doc_key": "delegation_doc", "label": "Delega firmata", "description": "Richiesta se la pratica viene gestita per conto di terzi", "condition": "delegation_required", "formats": ["pdf", "p7m"], "max_size_mb": 10, "blocking": True, "sensitivity": "legal", "signed_required": True},
        ],
        "expected_outputs": [
            {"output_key": "receipt_ae", "label": "Ricevuta Agenzia delle Entrate", "description": "Ricevuta di avvenuta registrazione", "format": "pdf"},
            {"output_key": "vat_number_certificate", "label": "Attribuzione Partita IVA", "description": "Certificato con numero P.IVA attribuito", "format": "pdf"},
        ],
    },
    "VAT_VARIATION_PF": {
        "required": [
            {"doc_key": "identity_document", "label": "Documento di identita", "description": "Carta d'identita o passaporto in corso di validita", "formats": ["pdf", "jpg", "png"], "max_size_mb": 10, "blocking": True, "sensitivity": "personal", "signed_required": False},
            {"doc_key": "modello_aa9_12_variation", "label": "Modello AA9/12 (variazione)", "description": "Modello compilato per la variazione dati", "formats": ["pdf"], "max_size_mb": 5, "blocking": True, "sensitivity": "fiscal", "signed_required": True},
        ],
        "optional": [],
        "conditional": [],
        "expected_outputs": [
            {"output_key": "receipt_ae_variation", "label": "Ricevuta variazione", "description": "Ricevuta di avvenuta variazione dall'Agenzia delle Entrate", "format": "pdf"},
        ],
    },
    "VAT_CLOSURE_PF": {
        "required": [
            {"doc_key": "identity_document", "label": "Documento di identita", "description": "Carta d'identita o passaporto", "formats": ["pdf", "jpg", "png"], "max_size_mb": 10, "blocking": True, "sensitivity": "personal", "signed_required": False},
            {"doc_key": "modello_aa9_12_closure", "label": "Modello AA9/12 (cessazione)", "description": "Modello compilato per la cessazione attivita", "formats": ["pdf"], "max_size_mb": 5, "blocking": True, "sensitivity": "fiscal", "signed_required": True},
            {"doc_key": "dichiarazioni_fiscali", "label": "Ultime dichiarazioni fiscali", "description": "Dichiarazioni fiscali degli ultimi esercizi per verifica pendenze", "formats": ["pdf"], "max_size_mb": 20, "blocking": True, "sensitivity": "fiscal", "signed_required": False},
        ],
        "optional": [
            {"doc_key": "bilancio_finale", "label": "Bilancio finale", "description": "Bilancio finale dell'attivita", "formats": ["pdf", "xlsx"], "max_size_mb": 20, "sensitivity": "fiscal"},
        ],
        "conditional": [],
        "expected_outputs": [
            {"output_key": "receipt_ae_closure", "label": "Ricevuta cessazione", "description": "Ricevuta di avvenuta cessazione P.IVA", "format": "pdf"},
        ],
    },
    "F24_PREPARATION": {
        "required": [
            {"doc_key": "dati_contabili", "label": "Dati contabili / prospetto importi", "description": "Prospetto con codici tributo, importi e periodi di riferimento", "formats": ["pdf", "xlsx", "csv"], "max_size_mb": 10, "blocking": True, "sensitivity": "fiscal", "signed_required": False},
        ],
        "optional": [
            {"doc_key": "f24_precedente", "label": "F24 precedente", "description": "Modello F24 di un periodo precedente come riferimento", "formats": ["pdf"], "max_size_mb": 5, "sensitivity": "fiscal"},
        ],
        "conditional": [],
        "expected_outputs": [
            {"output_key": "f24_compilato", "label": "Modello F24 compilato", "description": "F24 pronto per la validazione e il pagamento", "format": "pdf"},
        ],
    },
    "F24_WEB": {
        "required": [
            {"doc_key": "dati_contabili", "label": "Dati contabili / prospetto importi", "description": "Dati per la compilazione F24 Web", "formats": ["pdf", "xlsx", "csv"], "max_size_mb": 10, "blocking": True, "sensitivity": "fiscal", "signed_required": False},
        ],
        "optional": [],
        "conditional": [],
        "expected_outputs": [
            {"output_key": "receipt_f24_web", "label": "Ricevuta invio F24 Web", "description": "Ricevuta di invio dal portale F24 Web", "format": "pdf"},
        ],
    },
    "VAT_DECLARATION": {
        "required": [
            {"doc_key": "registri_iva", "label": "Registri IVA (vendite e acquisti)", "description": "Registri IVA completi per il periodo dichiarativo", "formats": ["pdf", "xlsx"], "max_size_mb": 50, "blocking": True, "sensitivity": "fiscal", "signed_required": False},
            {"doc_key": "fatture_periodo", "label": "Fatture del periodo", "description": "Fatture emesse e ricevute del periodo", "formats": ["pdf", "xml", "zip"], "max_size_mb": 100, "blocking": True, "sensitivity": "fiscal", "signed_required": False},
            {"doc_key": "dati_contabili_iva", "label": "Riepilogo contabile IVA", "description": "Riepilogo contabile per la dichiarazione", "formats": ["pdf", "xlsx"], "max_size_mb": 20, "blocking": True, "sensitivity": "fiscal", "signed_required": False},
        ],
        "optional": [
            {"doc_key": "dichiarazione_precedente", "label": "Dichiarazione IVA precedente", "description": "Dichiarazione del periodo precedente come riferimento", "formats": ["pdf"], "max_size_mb": 10, "sensitivity": "fiscal"},
        ],
        "conditional": [],
        "expected_outputs": [
            {"output_key": "dichiarazione_iva_draft", "label": "Bozza dichiarazione IVA", "description": "Bozza della dichiarazione preparata per revisione", "format": "pdf"},
            {"output_key": "receipt_ae_iva", "label": "Ricevuta invio dichiarazione", "description": "Ricevuta di invio telematico", "format": "pdf"},
        ],
    },
    "EINVOICING": {
        "required": [
            {"doc_key": "fattura_xml", "label": "Fattura elettronica XML", "description": "File XML della fattura in formato FatturaPA", "formats": ["xml", "p7m"], "max_size_mb": 5, "blocking": True, "sensitivity": "fiscal", "signed_required": False},
        ],
        "optional": [
            {"doc_key": "allegati_fattura", "label": "Allegati fattura", "description": "Documenti allegati alla fattura elettronica", "formats": ["pdf", "jpg", "png"], "max_size_mb": 20, "sensitivity": "standard"},
        ],
        "conditional": [],
        "expected_outputs": [
            {"output_key": "receipt_sdi", "label": "Ricevuta SDI", "description": "Notifica di consegna dal Sistema di Interscambio", "format": "xml"},
        ],
    },
    "INPS_GESTIONE_SEP": {
        "required": [
            {"doc_key": "identity_document", "label": "Documento di identita", "description": "Carta d'identita o passaporto", "formats": ["pdf", "jpg", "png"], "max_size_mb": 10, "blocking": True, "sensitivity": "personal", "signed_required": False},
            {"doc_key": "codice_fiscale", "label": "Codice Fiscale", "description": "Codice fiscale leggibile", "formats": ["pdf", "jpg", "png"], "max_size_mb": 5, "blocking": True, "sensitivity": "personal", "signed_required": False},
            {"doc_key": "attestazione_piva", "label": "Attestazione P.IVA attiva", "description": "Prova dell'apertura della Partita IVA", "formats": ["pdf"], "max_size_mb": 5, "blocking": True, "sensitivity": "fiscal", "signed_required": False},
        ],
        "optional": [],
        "conditional": [],
        "expected_outputs": [
            {"output_key": "receipt_inps", "label": "Ricevuta iscrizione INPS", "description": "Conferma di iscrizione alla Gestione Separata", "format": "pdf"},
        ],
    },
    "INPS_CASSETTO": {
        "required": [],
        "optional": [],
        "conditional": [],
        "expected_outputs": [
            {"output_key": "estratto_previdenziale", "label": "Estratto previdenziale", "description": "Riepilogo situazione contributiva", "format": "pdf"},
        ],
    },
    "COMPANY_CLOSURE": {
        "required": [
            {"doc_key": "atto_costitutivo", "label": "Atto costitutivo / Statuto", "description": "Atto costitutivo e statuto della societa", "formats": ["pdf"], "max_size_mb": 20, "blocking": True, "sensitivity": "legal", "signed_required": False},
            {"doc_key": "bilancio_finale_liquidazione", "label": "Bilancio finale di liquidazione", "description": "Bilancio finale approvato dall'assemblea dei soci", "formats": ["pdf"], "max_size_mb": 20, "blocking": True, "sensitivity": "fiscal", "signed_required": True},
            {"doc_key": "verbale_approvazione", "label": "Verbale di approvazione bilancio finale", "description": "Verbale dell'assemblea che approva il bilancio finale", "formats": ["pdf"], "max_size_mb": 20, "blocking": True, "sensitivity": "legal", "signed_required": True},
            {"doc_key": "identity_liquidatore", "label": "Documento identita liquidatore", "description": "Carta d'identita del liquidatore in carica", "formats": ["pdf", "jpg", "png"], "max_size_mb": 10, "blocking": True, "sensitivity": "personal", "signed_required": False},
            {"doc_key": "codice_fiscale_societa", "label": "Codice Fiscale / P.IVA societa", "description": "Visura o certificato con CF/P.IVA della societa", "formats": ["pdf"], "max_size_mb": 5, "blocking": True, "sensitivity": "fiscal", "signed_required": False},
            {"doc_key": "certificato_pendenze", "label": "Certificato assenza pendenze tributarie", "description": "Certificato dall'Agenzia delle Entrate attestante l'assenza di debiti fiscali", "formats": ["pdf"], "max_size_mb": 10, "blocking": True, "sensitivity": "fiscal", "signed_required": False},
        ],
        "optional": [
            {"doc_key": "piano_riparto", "label": "Piano di riparto", "description": "Piano di distribuzione del residuo attivo ai soci", "formats": ["pdf"], "max_size_mb": 10, "sensitivity": "fiscal"},
            {"doc_key": "comunicazione_creditori", "label": "Comunicazione ai creditori", "description": "Prova di avvenuta comunicazione ai creditori", "formats": ["pdf"], "max_size_mb": 10, "sensitivity": "legal"},
            {"doc_key": "visura_camerale", "label": "Visura camerale aggiornata", "description": "Visura camerale con stato di liquidazione", "formats": ["pdf"], "max_size_mb": 5, "sensitivity": "standard"},
        ],
        "conditional": [
            {"doc_key": "delega_firmata", "label": "Delega firmata al professionista", "description": "Delega per la presentazione della pratica al Registro Imprese. Richiesta se la pratica viene gestita tramite intermediario.", "condition": "delegation_required", "formats": ["pdf", "p7m"], "max_size_mb": 10, "blocking": True, "sensitivity": "legal", "signed_required": True},
            {"doc_key": "procura_speciale", "label": "Procura speciale", "description": "Procura speciale notarile se richiesta dalla Camera di Commercio", "condition": "high_risk", "formats": ["pdf", "p7m"], "max_size_mb": 10, "blocking": False, "sensitivity": "confidential", "signed_required": True},
        ],
        "expected_outputs": [
            {"output_key": "ricevuta_registroimprese", "label": "Ricevuta Registro delle Imprese", "description": "Ricevuta di avvenuta presentazione della domanda di cancellazione", "format": "pdf"},
            {"output_key": "protocollo_cciaa", "label": "Numero di protocollo CCIAA", "description": "Numero di protocollo assegnato dalla Camera di Commercio", "format": "text"},
            {"output_key": "attestazione_cancellazione", "label": "Attestazione di cancellazione", "description": "Conferma definitiva di cancellazione dal Registro delle Imprese", "format": "pdf"},
            {"output_key": "dossier_finale", "label": "Dossier finale completo", "description": "Fascicolo completo con tutta la documentazione archiviata", "format": "pdf"},
        ],
    },
}

# Sensitivity levels and visibility rules (full config for Document Intelligence Layer)
SENSITIVITY_LEVELS_CONFIG = {
    "standard": {"label": "Standard", "visibility": ["user", "admin", "creator"], "sending_allowed": True, "requires_encryption": False},
    "personal": {"label": "Dati Personali", "visibility": ["user", "admin", "creator"], "sending_allowed": True, "requires_encryption": False},
    "fiscal": {"label": "Dati Fiscali", "visibility": ["user", "admin", "creator"], "sending_allowed": True, "requires_encryption": False},
    "legal": {"label": "Documento Legale", "visibility": ["admin", "creator"], "sending_allowed": False, "requires_encryption": False},
    "confidential": {"label": "Riservato", "visibility": ["creator"], "sending_allowed": False, "requires_encryption": True},
}

# Allowed file extensions for signature-aware handling
SIGNATURE_FORMATS = {
    "p7m": {"label": "Firma Digitale P7M (CAdES)", "is_signed": True, "description": "Busta crittografica con firma digitale CAdES"},
    "pdf": {"label": "PDF", "is_signed": False, "can_be_signed": True, "description": "Puo contenere firma digitale PAdES"},
}


async def get_document_matrix_for_practice(practice_id: str) -> dict:
    """Get the full document matrix for a practice based on its type."""
    practice = await db.practices.find_one({"id": practice_id}, {"_id": 0})
    if not practice:
        return {"error": "Pratica non trovata"}

    practice_type = practice.get("practice_type") or practice.get("template_source")
    matrix = DOCUMENT_MATRIX.get(practice_type, {})

    if not matrix:
        return {
            "practice_id": practice_id,
            "practice_type": practice_type,
            "has_matrix": False,
            "message": "Nessuna matrice documentale definita per questo tipo di pratica",
            "required": [], "optional": [], "conditional": [], "expected_outputs": [],
        }

    # Check which conditional docs apply
    active_conditional = []
    for cond_doc in matrix.get("conditional", []):
        condition = cond_doc.get("condition", "")
        applies = False
        if condition == "delegation_required" and practice.get("delegation_required"):
            applies = True
        elif condition == "high_risk" and practice.get("risk_level") == "high":
            applies = True
        elif condition == "approval_required" and practice.get("approval_required"):
            applies = True
        if applies:
            active_conditional.append({**cond_doc, "condition_met": True})
        else:
            active_conditional.append({**cond_doc, "condition_met": False})

    # Check uploaded documents against matrix
    uploaded_docs = await db.documents.find({"practice_id": practice_id}, {"_id": 0}).to_list(100)
    uploaded_keys = {d.get("doc_key") or d.get("filename", "").split(".")[0].lower() for d in uploaded_docs}

    # Check completion status per document
    required_status = []
    for doc in matrix.get("required", []):
        is_present = doc["doc_key"] in uploaded_keys
        # Check signature requirement
        matching_doc = next((d for d in uploaded_docs if (d.get("doc_key") or "") == doc["doc_key"]), None)
        signature_ok = True
        if doc.get("signed_required") and matching_doc:
            fn = (matching_doc.get("filename") or "").lower()
            signature_ok = fn.endswith(".p7m") or matching_doc.get("is_signed", False)
        required_status.append({
            **doc,
            "uploaded": is_present,
            "signature_valid": signature_ok if is_present else None,
            "complete": is_present and (signature_ok if doc.get("signed_required") else True),
        })

    optional_status = []
    for doc in matrix.get("optional", []):
        is_present = doc["doc_key"] in uploaded_keys
        optional_status.append({**doc, "uploaded": is_present})

    conditional_status = []
    for doc in active_conditional:
        is_present = doc["doc_key"] in uploaded_keys
        matching_doc = next((d for d in uploaded_docs if (d.get("doc_key") or "") == doc["doc_key"]), None)
        signature_ok = True
        if doc.get("signed_required") and matching_doc:
            fn = (matching_doc.get("filename") or "").lower()
            signature_ok = fn.endswith(".p7m") or matching_doc.get("is_signed", False)
        conditional_status.append({
            **doc,
            "uploaded": is_present,
            "signature_valid": signature_ok if is_present else None,
            "complete": is_present and (signature_ok if doc.get("signed_required") else True) if doc["condition_met"] else True,
        })

    # Output tracking
    output_status = []
    for out in matrix.get("expected_outputs", []):
        received = await db.documents.find_one(
            {"practice_id": practice_id, "doc_key": out["output_key"]}, {"_id": 0}
        )
        output_status.append({**out, "received": received is not None, "received_at": received.get("uploaded_at") if received else None})

    # Calculate completeness
    total_blocking = [d for d in required_status if d.get("blocking")]
    total_blocking += [d for d in conditional_status if d.get("blocking") and d.get("condition_met")]
    blocking_complete = all(d.get("complete") for d in total_blocking) if total_blocking else True
    required_complete = all(d.get("complete") for d in required_status)
    missing_required = [d["label"] for d in required_status if not d.get("uploaded")]
    missing_signatures = [d["label"] for d in required_status if d.get("uploaded") and d.get("signed_required") and not d.get("signature_valid")]
    missing_conditional = [d["label"] for d in conditional_status if d.get("condition_met") and d.get("blocking") and not d.get("complete")]
    outputs_received = sum(1 for o in output_status if o.get("received"))

    return {
        "practice_id": practice_id,
        "practice_type": practice_type,
        "has_matrix": True,
        "required": required_status,
        "optional": optional_status,
        "conditional": conditional_status,
        "expected_outputs": output_status,
        "completeness": {
            "all_required_uploaded": required_complete,
            "all_blocking_complete": blocking_complete,
            "missing_required": missing_required,
            "missing_signatures": missing_signatures,
            "missing_conditional": missing_conditional,
            "total_required": len(required_status),
            "uploaded_required": sum(1 for d in required_status if d.get("uploaded")),
            "total_outputs": len(output_status),
            "outputs_received": outputs_received,
            "can_proceed": blocking_complete and not missing_conditional,
        },
    }


@api_router.get("/documents/matrix/{practice_id}")
async def get_practice_document_matrix(practice_id: str, user: dict = Depends(get_current_user)):
    """Get the document matrix for a specific practice with completion status."""
    result = await get_document_matrix_for_practice(practice_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    # Filter by role visibility
    role = user.get("role", "user")
    for doc_list_key in ["required", "optional", "conditional"]:
        for doc in result.get(doc_list_key, []):
            sensitivity = doc.get("sensitivity", "standard")
            vis_config = SENSITIVITY_LEVELS_CONFIG.get(sensitivity, SENSITIVITY_LEVELS_CONFIG["standard"])
            doc["visible_to_current_user"] = role in vis_config["visibility"]
            doc["sensitivity_label"] = vis_config["label"]

    return result


@api_router.get("/documents/matrix-types")
async def get_all_document_matrix_types(user: dict = Depends(get_current_user)):
    """Get all practice types that have a document matrix defined."""
    types = []
    for practice_type, matrix in DOCUMENT_MATRIX.items():
        catalog_entry = await db.practice_catalog.find_one({"practice_id": practice_type}, {"_id": 0, "name": 1, "support_level": 1})
        types.append({
            "practice_type": practice_type,
            "name": catalog_entry.get("name", practice_type) if catalog_entry else practice_type,
            "support_level": catalog_entry.get("support_level") if catalog_entry else "unknown",
            "required_count": len(matrix.get("required", [])),
            "optional_count": len(matrix.get("optional", [])),
            "conditional_count": len(matrix.get("conditional", [])),
            "output_count": len(matrix.get("expected_outputs", [])),
            "has_signed_docs": any(d.get("signed_required") for d in matrix.get("required", []) + matrix.get("conditional", [])),
            "has_confidential_docs": any(d.get("sensitivity") == "confidential" for d in matrix.get("required", []) + matrix.get("conditional", [])),
        })
    return types


@api_router.get("/documents/sensitivity-levels")
async def get_sensitivity_levels(user: dict = Depends(get_current_user)):
    """Get the sensitivity level definitions and visibility rules."""
    return SENSITIVITY_LEVELS_CONFIG


# ========================
# PRACTICE TEMPLATES
# ========================

@api_router.get("/catalog/templates")
async def get_practice_templates(user: dict = Depends(get_current_user)):
    """Get practice templates from catalog that can generate instances."""
    templates = await db.practice_catalog.find({}, {"_id": 0}).to_list(100)
    return templates


class TemplateInstanceRequest(BaseModel):
    template_id: str
    client_name: str
    client_type: str = "company"
    country: str = "IT"
    fiscal_code: Optional[str] = None
    vat_number: Optional[str] = None
    company_name: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None


@api_router.post("/practices/from-template")
async def create_practice_from_template(req: TemplateInstanceRequest, user: dict = Depends(get_current_user)):
    """Create a practice instance from a catalog template."""
    template = await db.practice_catalog.find_one({"practice_id": req.template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template non trovato nel catalogo")

    now = datetime.now(timezone.utc).isoformat()
    practice_id = str(uuid.uuid4())

    practice = {
        "id": practice_id,
        "user_id": user["id"],
        "practice_type": req.template_id,
        "practice_type_label": template.get("name", req.template_id),
        "client_name": req.client_name,
        "client_type": req.client_type,
        "client_type_label": {"private": "Privato", "freelancer": "Libero Professionista", "company": "Azienda"}.get(req.client_type, req.client_type),
        "country": req.country,
        "fiscal_code": req.fiscal_code,
        "vat_number": req.vat_number,
        "company_name": req.company_name,
        "description": req.description or template.get("description", ""),
        "notes": req.notes,
        "status": "draft",
        "status_label": STATUS_LABELS["draft"],
        "risk_level": template.get("risk_level", "basic"),
        "support_level": template.get("support_level", "supported"),
        "delegation_required": template.get("delegation_required", False),
        "approval_required": template.get("approval_required", False),
        "delegation_info": {"status": "not_required"} if not template.get("delegation_required") else {"status": "requested", "requested_at": now},
        "template_source": req.template_id,
        "template_workflow_steps": template.get("workflow_steps", []),
        "template_readiness_criteria": template.get("readiness_criteria", []),
        "blocking_conditions": template.get("blocking_conditions", []),
        "escalation_conditions": template.get("escalation_conditions", []),
        "assigned_agents": template.get("agents", []),
        "additional_data": {},
        "agent_logs": [],
        "orchestration_result": None,
        "created_at": now,
        "updated_at": now,
    }

    await db.practices.insert_one(practice)

    await add_timeline_event(practice_id, user["id"], "practice_created", {
        "template_source": req.template_id,
        "template_name": template.get("name"),
        "client_name": req.client_name,
        "instantiation_method": "template",
    })

    await log_activity(user["id"], "practice", "practice_created_from_template", {
        "practice_id": practice_id,
        "template_id": req.template_id,
        "client_name": req.client_name,
    })

    practice.pop("_id", None)
    return {
        "message": f"Pratica creata dal template '{template.get('name')}'",
        "practice": practice,
    }

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
    urgent_count = await db.practices.count_documents({"user_id": user["id"], "priority": "urgent"})
    high_count = await db.practices.count_documents({"user_id": user["id"], "priority": "high"})

    recent_practices = await db.practices.find(
        {"user_id": user["id"]},
        {"_id": 0, "id": 1, "practice_type_label": 1, "client_name": 1, "status": 1, "status_label": 1,
         "risk_level": 1, "priority": 1, "current_step": 1, "created_at": 1, "updated_at": 1, "deadline": 1}
    ).sort("created_at", -1).limit(10).to_list(10)

    # Recalculate priority for all returned practices
    priority_order = {"urgent": 0, "high": 1, "normal": 2, "low": 3}
    for p in recent_practices:
        p["priority"] = evaluate_practice_priority(p)
        p["priority_label"] = PRIORITY_LEVELS.get(p["priority"], {}).get("label", p["priority"])
    recent_practices.sort(key=lambda x: (priority_order.get(x["priority"], 2), x.get("created_at", "")))

    # Critical practices: waiting_approval + blocked + urgent
    critical = await db.practices.find(
        {"user_id": user["id"], "$or": [
            {"status": "waiting_approval"},
            {"status": {"$in": ["blocked", "escalated"]}},
            {"priority": {"$in": ["urgent", "high"]}},
        ]},
        {"_id": 0, "id": 1, "practice_type_label": 1, "client_name": 1, "status": 1, "status_label": 1,
         "risk_level": 1, "priority": 1, "current_step": 1, "created_at": 1, "updated_at": 1}
    ).sort("created_at", -1).limit(10).to_list(10)

    for c in critical:
        c["priority"] = evaluate_practice_priority(c)
        c["priority_label"] = PRIORITY_LEVELS.get(c["priority"], {}).get("label", c["priority"])
    critical.sort(key=lambda x: (priority_order.get(x["priority"], 2), x.get("created_at", "")))

    # Recent activity logs
    activity_logs = await db.activity_logs.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("timestamp", -1).limit(8).to_list(8)

    return {
        "total_practices": total_practices,
        "pending": pending,
        "processing": processing,
        "waiting_approval": waiting_approval,
        "completed": completed,
        "blocked": blocked,
        "urgent": urgent_count,
        "high_priority": high_count,
        "unread_notifications": unread_notifications,
        "recent_practices": recent_practices,
        "critical_practices": critical,
        "activity_logs": activity_logs,
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

        system_msg = f"""Sei l'assistente Herion. Il tuo compito e aiutare l'utente a capire cosa sta succedendo con la sua pratica e cosa deve fare.

REGOLE DI COMUNICAZIONE:
- Rispondi in modo semplice, chiaro e umano
- NON usare markdown pesante (no ##, no **, no elenchi puntati complessi)
- NON usare linguaggio tecnico o burocratico
- Scrivi come se parlassi con una persona di fiducia
- Usa frasi brevi e dirette
- Alla fine di ogni risposta, indica SEMPRE il prossimo passo con "Prossimo passo:" seguito dall'azione
- Se mancano documenti o dati, spiega quali e perche servono
- Sii rassicurante ma onesto

FORMATO RISPOSTA:
1. Inizia con una frase che riassume la situazione in modo semplice
2. Se ci sono problemi, spiegali uno per uno con frasi chiare (usa punti semplici con il simbolo •)
3. Chiudi sempre con "Prossimo passo:" e l'azione concreta da fare

ESEMPIO:
"La tua pratica al momento e ferma perche mancano alcuni documenti.

• Il bilancio finale non e stato ancora caricato
• La delega non e presente

Prossimo passo: carica i documenti richiesti dalla sezione Documenti della pratica."

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
    await db.practices.create_index([("user_id", 1), ("priority", 1)])
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

    # Refresh priorities on startup for all active practices
    updated_count = await refresh_all_priorities()
    if updated_count > 0:
        logger.info(f"Startup: refreshed priority for {updated_count} practices")

    Path("/app/memory").mkdir(exist_ok=True)
    creator_pw = os.environ.get("CREATOR_PASSWORD")
    if not creator_pw:
        logger.error("CREATOR_PASSWORD not set in environment. Creator bootstrap requires a secure password via env var.")
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"""# Test Credentials for Herion

## Creator Account (Protected Bootstrap)
- Email: {CREATOR_EMAIL}
- Password: (PROTECTED — stored exclusively in backend/.env as CREATOR_PASSWORD)
- Role: creator
- Creator UUID: {CREATOR_UUID}
- Login: Standard /login page. Password from env var only. Supports secure reset via /forgot-password.

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

    # Create governance audit indexes
    await db.governance_audit.create_index("timestamp")
    await db.governance_audit.create_index("practice_id")
    await db.governance_audit.create_index("severity")
    await db.governance_audit.create_index("actor_id")

    # Alert and security indexes
    await db.alerts.create_index("timestamp")
    await db.alerts.create_index("status")
    await db.alerts.create_index("severity")
    await db.alerts.create_index("user_id")
    await db.security_events.create_index("timestamp")
    await db.security_events.create_index("event_type")
    await db.security_events.create_index("actor")
    await db.follow_up_items.create_index("practice_id")
    await db.follow_up_items.create_index("status")
    await db.follow_up_items.create_index("urgency")
    await db.follow_up_items.create_index("rule_key")
    await db.email_drafts.create_index("practice_id")
    await db.email_drafts.create_index("status")
    await db.email_drafts.create_index("created_by")
    await db.authority_registry.create_index("registry_id", unique=True)
    catalog_count = await db.practice_catalog.count_documents({})
    if catalog_count == 0:
        catalog_entries = [
            {"practice_id": "INFO_FISCAL_GENERIC", "name": "Richiesta informazioni fiscali generiche", "description": "Richiesta di chiarimenti su adempimenti fiscali di base.", "user_type": ["private", "freelancer", "company"], "country_scope": "IT", "operational_status": "active_italy_scope", "scope_note": "Supporto informativo attivo per utenti in Italia.", "risk_level": "basic", "support_level": "supported", "expected_channel": "email", "destination_type": "informational", "required_documents": [], "delegation_required": False, "approval_required": False, "agents": ["intake", "research", "advisor"], "blocking_conditions": [], "escalation_conditions": ["ambiguita normativa"], "next_step": "Invio informazioni", "user_explanation": "Richiesta di informazioni fiscali di base. Herion raccoglie la domanda e fornisce indicazioni chiare. Operativo per il contesto fiscale italiano."},
            {"practice_id": "DOC_MISSING_REQUEST", "name": "Richiesta documenti mancanti", "description": "Notifica all'utente sui documenti necessari per procedere.", "user_type": ["private", "freelancer", "company"], "country_scope": "IT", "operational_status": "active_internal", "scope_note": "Servizio interno di piattaforma, operativo in Italia.", "risk_level": "basic", "support_level": "supported", "expected_channel": "email", "destination_type": "user_communication", "required_documents": [], "delegation_required": False, "approval_required": False, "agents": ["documents", "flow", "advisor"], "blocking_conditions": [], "escalation_conditions": [], "next_step": "Attesa caricamento documenti", "user_explanation": "Ti indichiamo quali documenti servono per completare la tua pratica nel contesto italiano."},
            {"practice_id": "DOC_PRELIMINARY_SEND", "name": "Invio documenti preliminari", "description": "Invio di documentazione preliminare a un destinatario.", "user_type": ["private", "freelancer", "company"], "country_scope": "IT", "operational_status": "active_italy_scope", "scope_note": "Invio documenti preparatori per pratiche italiane.", "risk_level": "basic", "support_level": "supported", "expected_channel": "email", "destination_type": "external_recipient", "required_documents": ["identity"], "delegation_required": False, "approval_required": True, "agents": ["documents", "routing", "advisor"], "blocking_conditions": ["documenti mancanti"], "escalation_conditions": [], "next_step": "Conferma ricezione", "user_explanation": "Preparazione e invio della documentazione preliminare. Operativo per pratiche fiscali italiane."},
            {"practice_id": "PRACTICE_FOLLOWUP", "name": "Promemoria e follow-up pratica", "description": "Promemoria sullo stato di avanzamento di una pratica.", "user_type": ["private", "freelancer", "company"], "country_scope": "IT", "operational_status": "active_internal", "scope_note": "Servizio interno di monitoraggio e promemoria.", "risk_level": "basic", "support_level": "supported", "expected_channel": "email", "destination_type": "user_communication", "required_documents": [], "delegation_required": False, "approval_required": False, "agents": ["monitor", "deadline", "advisor"], "blocking_conditions": [], "escalation_conditions": [], "next_step": "Verifica stato pratica", "user_explanation": "Ricevi aggiornamenti e promemoria sullo stato della tua pratica."},
            {"practice_id": "BLOCKED_RECOVERY", "name": "Recupero pratica bloccata", "description": "Recupero di una pratica in stato bloccato.", "user_type": ["private", "freelancer", "company"], "country_scope": "IT", "operational_status": "active_internal", "scope_note": "Recupero pratica bloccata, operativo in Italia.", "risk_level": "basic", "support_level": "supported", "expected_channel": "preparation_only", "destination_type": "internal", "required_documents": [], "delegation_required": False, "approval_required": False, "agents": ["flow", "monitor", "documents"], "blocking_conditions": [], "escalation_conditions": ["blocco persistente"], "next_step": "Identificazione causa blocco", "user_explanation": "Identifichiamo cosa blocca la pratica e ti guidiamo nella risoluzione."},
            {"practice_id": "DOSSIER_DELIVERY", "name": "Consegna dossier finale", "description": "Consegna del fascicolo completo della pratica.", "user_type": ["private", "freelancer", "company"], "country_scope": "IT", "operational_status": "active_italy_scope", "scope_note": "Consegna fascicolo per pratiche italiane.", "risk_level": "basic", "support_level": "supported", "expected_channel": "email", "destination_type": "user_delivery", "required_documents": ["practice_documents"], "delegation_required": False, "approval_required": True, "agents": ["documents", "advisor"], "blocking_conditions": ["documenti incompleti"], "escalation_conditions": [], "next_step": "Download o invio dossier", "user_explanation": "Il fascicolo completo della pratica viene preparato e consegnato. Attivo per il contesto operativo italiano."},
            {"practice_id": "STATUS_UPDATE", "name": "Aggiornamento stato pratica", "description": "Comunicazione di aggiornamento sullo stato della pratica.", "user_type": ["private", "freelancer", "company"], "country_scope": "IT", "operational_status": "active_internal", "scope_note": "Aggiornamento interno di piattaforma.", "risk_level": "basic", "support_level": "supported", "expected_channel": "email", "destination_type": "user_communication", "required_documents": [], "delegation_required": False, "approval_required": False, "agents": ["monitor", "advisor"], "blocking_conditions": [], "escalation_conditions": [], "next_step": "Prossima azione", "user_explanation": "Ricevi un riepilogo aggiornato sullo stato della tua pratica."},
            {"practice_id": "DOC_COMPLETENESS", "name": "Verifica completezza documenti", "description": "Controllo che tutti i documenti necessari siano presenti.", "user_type": ["private", "freelancer", "company"], "country_scope": "IT", "operational_status": "active_internal", "scope_note": "Verifica interna della completezza documentale.", "risk_level": "basic", "support_level": "supported", "expected_channel": "preparation_only", "destination_type": "internal", "required_documents": [], "delegation_required": False, "approval_required": False, "agents": ["documents", "flow"], "blocking_conditions": [], "escalation_conditions": [], "next_step": "Risultato verifica", "user_explanation": "Verifichiamo che tutti i documenti necessari per la tua pratica italiana siano stati caricati."},
            {"practice_id": "USER_APPROVAL_REQ", "name": "Richiesta approvazione utente", "description": "Richiesta di approvazione esplicita prima di procedere.", "user_type": ["private", "freelancer", "company"], "country_scope": "IT", "operational_status": "active_internal", "scope_note": "Flusso di approvazione interno alla piattaforma.", "risk_level": "basic", "support_level": "supported", "expected_channel": "email", "destination_type": "user_communication", "required_documents": [], "delegation_required": False, "approval_required": True, "agents": ["flow", "monitor"], "blocking_conditions": [], "escalation_conditions": [], "next_step": "Attesa approvazione", "user_explanation": "Prima di procedere, ti chiediamo di verificare e approvare il riepilogo della pratica."},
            {"practice_id": "PDF_REPORT_DELIVERY", "name": "Consegna PDF/report finale", "description": "Generazione e consegna del report PDF finale.", "user_type": ["private", "freelancer", "company"], "country_scope": "IT", "operational_status": "active_internal", "scope_note": "Generazione report per pratiche italiane.", "risk_level": "basic", "support_level": "supported", "expected_channel": "email", "destination_type": "user_delivery", "required_documents": [], "delegation_required": False, "approval_required": False, "agents": ["documents", "advisor"], "blocking_conditions": [], "escalation_conditions": [], "next_step": "Download report", "user_explanation": "Il report finale della pratica viene generato e messo a disposizione."},
            {"practice_id": "VAT_OPEN_PF", "name": "Apertura Partita IVA persone fisiche", "description": "Preparazione della pratica di apertura partita IVA per individui e freelance in Italia.", "user_type": ["freelancer"], "country_scope": "IT", "operational_status": "active_italy_scope", "scope_note": "Pratica fiscale italiana attiva. Riferimento: Agenzia delle Entrate, modello AA9/12.", "risk_level": "medium", "support_level": "supported", "expected_channel": "official_portal", "destination_type": "tax_authority", "required_documents": ["identity", "tax_declarations"], "delegation_required": False, "approval_required": True, "agents": ["intake", "research", "routing", "documents", "flow"], "blocking_conditions": ["documenti identita mancanti", "codice fiscale mancante"], "escalation_conditions": ["struttura societaria complessa"], "next_step": "Preparazione modello AA9/12", "user_explanation": "Ti guidiamo nella preparazione della pratica di apertura Partita IVA presso l'Agenzia delle Entrate italiana. Servizio attualmente operativo solo per l'Italia."},
            {"practice_id": "VAT_VARIATION_PF", "name": "Variazione Partita IVA persone fisiche", "description": "Modifica dei dati della partita IVA per persone fisiche in Italia.", "user_type": ["freelancer"], "country_scope": "IT", "operational_status": "active_italy_scope", "scope_note": "Pratica fiscale italiana attiva. Variazione dati P.IVA.", "risk_level": "medium", "support_level": "supported", "expected_channel": "official_portal", "destination_type": "tax_authority", "required_documents": ["identity"], "delegation_required": False, "approval_required": True, "agents": ["research", "routing", "documents", "flow"], "blocking_conditions": ["partita IVA non attiva"], "escalation_conditions": ["variazione complessa"], "next_step": "Preparazione variazione", "user_explanation": "Preparazione della variazione dei dati della tua Partita IVA italiana. Operativo per il contesto fiscale italiano."},
            {"practice_id": "VAT_CLOSURE_PF", "name": "Chiusura Partita IVA persone fisiche", "description": "Preparazione della chiusura della partita IVA in Italia.", "user_type": ["freelancer"], "country_scope": "IT", "operational_status": "active_italy_scope", "scope_note": "Pratica fiscale italiana attiva. Chiusura P.IVA.", "risk_level": "medium", "support_level": "supported", "expected_channel": "official_portal", "destination_type": "tax_authority", "required_documents": ["identity", "tax_declarations"], "delegation_required": False, "approval_required": True, "agents": ["research", "routing", "documents", "flow", "delegate"], "blocking_conditions": ["debiti pendenti non verificati"], "escalation_conditions": ["pendenze fiscali complesse"], "next_step": "Verifica pendenze e preparazione chiusura", "user_explanation": "Ti guidiamo nella chiusura della Partita IVA italiana, verificando pendenze e requisiti. Operativo solo per l'Italia."},
            {"practice_id": "F24_PREPARATION", "name": "Preparazione e validazione F24", "description": "Supporto nella compilazione e verifica del modello F24 italiano.", "user_type": ["private", "freelancer", "company"], "country_scope": "IT", "operational_status": "active_italy_scope", "scope_note": "Modello F24 italiano — strumento di pagamento fiscale nazionale.", "risk_level": "medium", "support_level": "supported", "expected_channel": "preparation_only", "destination_type": "tax_payment", "required_documents": ["accounting"], "delegation_required": False, "approval_required": True, "agents": ["ledger", "documents", "compliance", "advisor"], "blocking_conditions": ["dati contabili insufficienti"], "escalation_conditions": ["importi significativi non verificati"], "next_step": "Compilazione F24", "user_explanation": "Prepariamo e verifichiamo il modello F24 per i tuoi pagamenti fiscali italiani."},
            {"practice_id": "F24_WEB", "name": "Supporto F24 Web", "description": "Supporto per la compilazione F24 tramite portale web dell'Agenzia delle Entrate.", "user_type": ["private", "freelancer", "company"], "country_scope": "IT", "operational_status": "active_italy_scope", "scope_note": "Portale F24 Web dell'Agenzia delle Entrate italiana.", "risk_level": "medium", "support_level": "supported", "expected_channel": "official_portal", "destination_type": "tax_payment", "required_documents": ["accounting"], "delegation_required": False, "approval_required": True, "agents": ["routing", "research", "ledger", "flow"], "blocking_conditions": ["accesso portale non verificato"], "escalation_conditions": [], "next_step": "Accesso e compilazione F24 Web", "user_explanation": "Ti guidiamo nell'uso del portale F24 Web dell'Agenzia delle Entrate. Disponibile solo per l'Italia."},
            {"practice_id": "VAT_DECLARATION", "name": "Supporto dichiarazione IVA", "description": "Preparazione della dichiarazione IVA periodica italiana.", "user_type": ["freelancer", "company"], "country_scope": "IT", "operational_status": "active_italy_scope", "scope_note": "Dichiarazione IVA italiana. Portale Agenzia delle Entrate.", "risk_level": "medium", "support_level": "supported", "expected_channel": "official_portal", "destination_type": "tax_authority", "required_documents": ["vat_documents", "invoices", "accounting"], "delegation_required": False, "approval_required": True, "agents": ["research", "documents", "compliance", "flow"], "blocking_conditions": ["registri IVA incompleti"], "escalation_conditions": ["operazioni intracomunitarie complesse"], "next_step": "Preparazione dichiarazione", "user_explanation": "Prepariamo la tua dichiarazione IVA verificando registri e documenti secondo le regole fiscali italiane."},
            {"practice_id": "EINVOICING", "name": "Supporto fatturazione elettronica", "description": "Supporto per l'emissione e gestione delle fatture elettroniche tramite SDI.", "user_type": ["freelancer", "company"], "country_scope": "IT", "operational_status": "active_italy_scope", "scope_note": "Fatturazione elettronica italiana tramite SDI.", "risk_level": "medium", "support_level": "supported", "expected_channel": "official_portal", "destination_type": "tax_authority", "required_documents": ["invoices"], "delegation_required": False, "approval_required": False, "agents": ["research", "routing", "documents", "advisor"], "blocking_conditions": [], "escalation_conditions": ["fatturazione internazionale complessa"], "next_step": "Configurazione fatturazione elettronica", "user_explanation": "Ti supportiamo nella gestione della fatturazione elettronica tramite il Sistema di Interscambio (SDI) italiano."},
            {"practice_id": "INPS_GESTIONE_SEP", "name": "Iscrizione Gestione Separata INPS", "description": "Supporto per l'iscrizione alla Gestione Separata INPS.", "user_type": ["freelancer"], "country_scope": "IT", "operational_status": "active_italy_scope", "scope_note": "INPS — ente previdenziale italiano.", "risk_level": "medium", "support_level": "supported", "expected_channel": "official_portal", "destination_type": "social_security", "required_documents": ["identity", "tax_declarations"], "delegation_required": False, "approval_required": True, "agents": ["research", "routing", "documents", "flow"], "blocking_conditions": ["partita IVA non attiva"], "escalation_conditions": [], "next_step": "Preparazione iscrizione INPS", "user_explanation": "Ti guidiamo nell'iscrizione alla Gestione Separata INPS per liberi professionisti italiani."},
            {"practice_id": "INPS_CASSETTO", "name": "Supporto cassetto previdenziale", "description": "Supporto per la consultazione del cassetto previdenziale INPS.", "user_type": ["freelancer"], "country_scope": "IT", "operational_status": "active_italy_scope", "scope_note": "INPS — cassetto previdenziale italiano.", "risk_level": "medium", "support_level": "supported", "expected_channel": "official_portal", "destination_type": "social_security", "required_documents": [], "delegation_required": False, "approval_required": False, "agents": ["research", "routing", "advisor", "monitor"], "blocking_conditions": [], "escalation_conditions": [], "next_step": "Accesso cassetto previdenziale", "user_explanation": "Ti aiutiamo a consultare e comprendere il tuo cassetto previdenziale INPS."},
            {"practice_id": "COMPANY_CLOSURE", "name": "Chiusura societaria post-liquidazione", "description": "Gestione completa del flusso di chiusura societaria dopo liquidazione in Italia.", "user_type": ["company"], "country_scope": "IT", "operational_status": "active_italy_scope", "scope_note": "Pratica italiana attiva. Camera di Commercio e Registro delle Imprese italiano.", "risk_level": "medium", "support_level": "partially_supported", "expected_channel": "official_portal", "destination_type": "chamber_registry", "required_documents": ["company_documents", "accounting", "identity", "tax", "compliance"], "optional_documents": ["delegation", "payment", "support_docs"], "conditional_documents": ["delegation"], "delegation_required": True, "approval_required": True, "agents": ["intake", "research", "deadline", "flow", "routing", "delegate", "documents", "compliance", "ledger"], "blocking_conditions": ["liquidazione non completata", "documenti societari mancanti", "bilancio finale non approvato", "debiti tributari non risolti"], "escalation_conditions": ["contenziosi pendenti", "debiti non risolti", "irregolarita nella liquidazione"], "workflow_steps": ["Verifica requisiti chiusura", "Raccolta documenti societari", "Verifica bilancio finale di liquidazione", "Controllo conformita fiscale", "Preparazione delega", "Verifica delega", "Preparazione dossier chiusura", "Approvazione utente", "Invio al Registro delle Imprese"], "readiness_criteria": ["Bilancio finale approvato", "Tutti i debiti tributari risolti", "Documenti societari completi", "Delega valida", "Nessun contenzioso pendente"], "next_step": "Verifica requisiti chiusura", "user_explanation": "Herion prepara e gestisce il percorso di chiusura post-liquidazione per societa italiane. Verifichiamo requisiti, raccogliamo documenti, controlliamo la conformita fiscale e prepariamo il dossier per il Registro delle Imprese italiano.", "admin_notes": "Pratica semi-supportata: richiede preparazione completa ma invio tramite portale ufficiale. Verificare sempre lo stato della liquidazione e l'assenza di contenziosi.", "is_template": True},
        ]
        for entry in catalog_entries:
            entry["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.practice_catalog.insert_many(catalog_entries)
        logger.info(f"Practice catalog seeded with {len(catalog_entries)} entries")

    # Seed Authority Registry
    registry_count = await db.authority_registry.count_documents({})
    if registry_count == 0:
        registry_entries = [
            {"registry_id": "AE_VAT_OPEN_PF", "name": "Agenzia delle Entrate - Apertura P.IVA Persone Fisiche", "destination_type": "tax_authority", "country": "IT", "registry_status": "active_italy_scope", "status_note": "Autorita fiscale italiana attiva.", "related_practices": ["VAT_OPEN_PF"], "portal_url": "https://www.agenziaentrate.gov.it/portale/schede/istanze/aa9_11-apertura-variazione-chiusura-pf/modello-e-istr-pi-pf", "required_channel": "official_portal", "allowed_channels": ["official_portal", "preparation_only"], "auto_submission": False, "preparation_only": True, "escalation_default": False, "notes": "Modello AA9/12 per apertura, variazione o chiusura P.IVA persone fisiche"},
            {"registry_id": "AE_VAT_VARIATION_PF", "name": "Agenzia delle Entrate - Variazione P.IVA Persone Fisiche", "destination_type": "tax_authority", "country": "IT", "registry_status": "active_italy_scope", "status_note": "Autorita fiscale italiana attiva.", "related_practices": ["VAT_VARIATION_PF"], "portal_url": "https://www.agenziaentrate.gov.it/portale/schede/istanze/aa9_11-apertura-variazione-chiusura-pf/modello-e-istr-pi-pf", "required_channel": "official_portal", "allowed_channels": ["official_portal", "PEC", "preparation_only"], "auto_submission": False, "preparation_only": True, "escalation_default": False, "notes": "Variazione dati tramite modello AA9/12"},
            {"registry_id": "AE_VAT_CLOSURE_PF", "name": "Agenzia delle Entrate - Chiusura P.IVA Persone Fisiche", "destination_type": "tax_authority", "country": "IT", "registry_status": "active_italy_scope", "status_note": "Autorita fiscale italiana attiva.", "related_practices": ["VAT_CLOSURE_PF"], "portal_url": "https://www.agenziaentrate.gov.it/portale/schede/istanze/aa9_11-apertura-variazione-chiusura-pf/modello-e-istr-pi-pf", "required_channel": "official_portal", "allowed_channels": ["official_portal", "PEC", "preparation_only"], "auto_submission": False, "preparation_only": True, "escalation_default": False, "notes": "Chiusura P.IVA tramite modello AA9/12"},
            {"registry_id": "AE_F24_STANDARD", "name": "Agenzia delle Entrate - F24 Ordinario", "destination_type": "tax_payment", "country": "IT", "registry_status": "active_italy_scope", "status_note": "Strumento di pagamento fiscale italiano.", "related_practices": ["F24_PREPARATION"], "portal_url": "https://www.agenziaentrate.gov.it/portale/modello-f24", "required_channel": "preparation_only", "allowed_channels": ["preparation_only"], "auto_submission": False, "preparation_only": True, "escalation_default": False, "notes": "Modello F24 ordinario per pagamenti fiscali e contributivi"},
            {"registry_id": "AE_F24_WEB", "name": "Agenzia delle Entrate - F24 Web", "destination_type": "tax_payment", "country": "IT", "registry_status": "active_italy_scope", "status_note": "Portale F24 Web italiano.", "related_practices": ["F24_WEB"], "portal_url": "https://www.agenziaentrate.gov.it/portale/web/guest/f24-web", "required_channel": "official_portal", "allowed_channels": ["official_portal", "preparation_only"], "auto_submission": False, "preparation_only": True, "escalation_default": False, "notes": "Compilazione e invio F24 tramite servizio web"},
            {"registry_id": "AE_VAT_DECLARATION", "name": "Agenzia delle Entrate - Dichiarazioni IVA", "destination_type": "tax_authority", "country": "IT", "registry_status": "active_italy_scope", "status_note": "Dichiarazioni IVA italiane.", "related_practices": ["VAT_DECLARATION"], "portal_url": "https://www.agenziaentrate.gov.it/portale/web/guest/iva", "required_channel": "official_portal", "allowed_channels": ["official_portal", "preparation_only"], "auto_submission": False, "preparation_only": True, "escalation_default": False, "notes": "Dichiarazioni IVA periodiche e annuali"},
            {"registry_id": "AE_EINVOICING", "name": "Agenzia delle Entrate - Fatture e Corrispettivi", "destination_type": "tax_authority", "country": "IT", "registry_status": "active_italy_scope", "status_note": "Fatturazione elettronica italiana SDI.", "related_practices": ["EINVOICING"], "portal_url": "https://www.agenziaentrate.gov.it/portale/web/guest/fatture-e-corrispettivi", "required_channel": "official_portal", "allowed_channels": ["official_portal", "preparation_only"], "auto_submission": False, "preparation_only": True, "escalation_default": False, "notes": "Portale fatturazione elettronica"},
            {"registry_id": "INPS_GESTIONE_SEP", "name": "INPS - Iscrizione Gestione Separata", "destination_type": "social_security", "country": "IT", "registry_status": "active_italy_scope", "status_note": "INPS — previdenza italiana.", "related_practices": ["INPS_GESTIONE_SEP"], "portal_url": "https://www.inps.it/it/it/dettaglio-scheda.schede-servizio-strumento.schede-servizi.iscrizione-gestione-separata--liberi-professionisti-50104.iscrizione-gestione-separata--liberi-professionisti.html", "required_channel": "official_portal", "allowed_channels": ["official_portal", "preparation_only"], "auto_submission": False, "preparation_only": True, "escalation_default": False, "notes": "Iscrizione Gestione Separata per liberi professionisti"},
            {"registry_id": "INPS_CASSETTO", "name": "INPS - Cassetto Previdenziale", "destination_type": "social_security", "country": "IT", "registry_status": "active_italy_scope", "status_note": "INPS — previdenza italiana.", "related_practices": ["INPS_CASSETTO"], "portal_url": "https://www.inps.it/it/it/dettaglio-scheda.schede-servizio-strumento.schede-servizi.cassetto-previdenziale-per-liberi-professionisti-50466.cassetto-previdenziale-per-liberi-professionisti.html", "required_channel": "official_portal", "allowed_channels": ["official_portal", "preparation_only"], "auto_submission": False, "preparation_only": True, "escalation_default": False, "notes": "Consultazione cassetto previdenziale"},
            {"registry_id": "SUAP_GENERIC", "name": "SUAP / Impresa in un Giorno", "destination_type": "public_portal", "country": "IT", "registry_status": "needs_validation", "status_note": "Richiede validazione specifica per tipo di pratica SUAP.", "related_practices": [], "portal_url": "https://www.impresainungiorno.gov.it/", "required_channel": "official_portal", "allowed_channels": ["official_portal", "preparation_only"], "auto_submission": False, "preparation_only": True, "escalation_default": True, "notes": "Pratiche SUAP - richiedono verifica specifica per tipologia"},
            {"registry_id": "USER_EMAIL_DELIVERY", "name": "Consegna email utente", "destination_type": "internal", "country": "IT", "registry_status": "active_internal", "status_note": "Canale interno della piattaforma.", "related_practices": ["DOSSIER_DELIVERY", "STATUS_UPDATE", "PRACTICE_FOLLOWUP"], "portal_url": None, "required_channel": "email", "allowed_channels": ["email"], "auto_submission": True, "preparation_only": False, "escalation_default": False, "notes": "Comunicazioni a basso rischio verso l'utente"},
            {"registry_id": "EXTERNAL_INFO_REQ", "name": "Destinatario informazioni esterne", "destination_type": "external_recipient", "country": "IT", "registry_status": "active_internal", "status_note": "Richieste informative interne.", "related_practices": ["INFO_FISCAL_GENERIC"], "portal_url": None, "required_channel": "email", "allowed_channels": ["email"], "auto_submission": False, "preparation_only": True, "escalation_default": False, "notes": "Richieste informative verso destinatari esterni validati"},
            {"registry_id": "ESCALATION_HUMAN", "name": "Escalation revisione professionale", "destination_type": "professional_review", "country": "IT", "registry_status": "active_internal", "status_note": "Escalation interna a revisione professionale.", "related_practices": [], "portal_url": None, "required_channel": "escalation", "allowed_channels": ["escalation", "preparation_only"], "auto_submission": False, "preparation_only": True, "escalation_default": True, "notes": "Casi che richiedono revisione professionale umana"},
            {"registry_id": "PREPARATION_ONLY", "name": "Solo preparazione interna", "destination_type": "internal", "country": "IT", "registry_status": "active_internal", "status_note": "Preparazione interna senza invio.", "related_practices": ["DOC_COMPLETENESS", "BLOCKED_RECOVERY"], "portal_url": None, "required_channel": "preparation_only", "allowed_channels": ["preparation_only"], "auto_submission": False, "preparation_only": True, "escalation_default": False, "notes": "Raccolta dati e documenti senza invio"},
            {"registry_id": "CCIAA_COMPANY_CLOSURE", "name": "Camera di Commercio - Chiusura Societaria", "destination_type": "chamber_registry", "country": "IT", "registry_status": "active_italy_scope", "status_note": "Camera di Commercio italiana — Registro delle Imprese.", "related_practices": ["COMPANY_CLOSURE"], "portal_url": "https://www.registroimprese.it/", "required_channel": "official_portal", "allowed_channels": ["official_portal", "PEC", "preparation_only"], "auto_submission": False, "preparation_only": True, "escalation_default": False, "notes": "Cancellazione dal Registro delle Imprese presso la Camera di Commercio. Richiede dossier completo e delega valida."},
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

    # Seed Nexus S.r.l. practice from COMPANY_CLOSURE template (demo instance)
    nexus_exists = await db.practices.find_one({"template_source": "COMPANY_CLOSURE", "client_name": "Nexus S.r.l."})
    if not nexus_exists:
        closure_template = await db.practice_catalog.find_one({"practice_id": "COMPANY_CLOSURE"}, {"_id": 0})
        if closure_template:
            creator_doc = await db.users.find_one({"is_creator": True})
            creator_id = str(creator_doc["_id"]) if creator_doc else "system"
            nexus_now = datetime.now(timezone.utc).isoformat()
            nexus_id = str(uuid.uuid4())
            nexus_practice = {
                "id": nexus_id,
                "user_id": creator_id,
                "practice_type": "COMPANY_CLOSURE",
                "practice_type_label": closure_template.get("name", "Chiusura societaria post-liquidazione"),
                "client_name": "Nexus S.r.l.",
                "client_type": "company",
                "client_type_label": "Azienda",
                "country": "IT",
                "fiscal_code": "NXSSRL80A01H501Z",
                "vat_number": "IT12345678901",
                "company_name": "Nexus S.r.l.",
                "description": "Chiusura societaria post-liquidazione per Nexus S.r.l. — societa in liquidazione volontaria completata. Procedura di cancellazione dal Registro delle Imprese.",
                "notes": "Pratica dimostrativa creata automaticamente dal template COMPANY_CLOSURE.",
                "status": "draft",
                "status_label": STATUS_LABELS["draft"],
                "risk_level": closure_template.get("risk_level", "medium"),
                "support_level": closure_template.get("support_level", "partially_supported"),
                "delegation_required": True,
                "approval_required": True,
                "delegation_info": {"status": "requested", "requested_at": nexus_now},
                "template_source": "COMPANY_CLOSURE",
                "template_workflow_steps": closure_template.get("workflow_steps", []),
                "template_readiness_criteria": closure_template.get("readiness_criteria", []),
                "blocking_conditions": closure_template.get("blocking_conditions", []),
                "escalation_conditions": closure_template.get("escalation_conditions", []),
                "assigned_agents": closure_template.get("agents", []),
                "additional_data": {"liquidation_completed": True, "final_balance_approved": False},
                "agent_logs": [],
                "orchestration_result": None,
                "created_at": nexus_now,
                "updated_at": nexus_now,
            }
            await db.practices.insert_one(nexus_practice)
            await db.practice_timeline.insert_one({
                "id": str(uuid.uuid4()),
                "practice_id": nexus_id,
                "user_id": creator_id,
                "event_type": "practice_created",
                "event_label": "Pratica creata",
                "details": {
                    "template_source": "COMPANY_CLOSURE",
                    "template_name": closure_template.get("name"),
                    "client_name": "Nexus S.r.l.",
                    "instantiation_method": "seed",
                },
                "timestamp": nexus_now,
            })
            logger.info(f"Nexus S.r.l. practice seeded from COMPANY_CLOSURE template: {nexus_id}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
