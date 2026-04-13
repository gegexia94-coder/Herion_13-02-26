"""Pydantic models for Herion API."""
from pydantic import BaseModel, EmailStr
from typing import Optional


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


class DelegationRequest(BaseModel):
    level: str = "assist"
    scope: list = ["prepare_documents", "validate_completeness"]
    entity_scope: Optional[list] = None
    action_scope: Optional[list] = None
    expires_in_days: Optional[int] = 30


class RevokeDelegationRequest(BaseModel):
    reason: Optional[str] = None


class ProofUploadRequest(BaseModel):
    proof_type: str
    reference_code: Optional[str] = None
    notes: Optional[str] = None


class OfficialStepCompleteRequest(BaseModel):
    step_outcome: str = "success"
    proof_type: Optional[str] = None
    reference_code: Optional[str] = None
    notes: Optional[str] = None


class TrackingUpdateRequest(BaseModel):
    identifier_type: str
    identifier_value: str
    notes: Optional[str] = None


class TrackingVerifyRequest(BaseModel):
    verification_outcome: str = "confirmed"
    entity_state: Optional[str] = None
    notes: Optional[str] = None
    next_expected_step: Optional[str] = None


class ConsulenzaTriageRequest(BaseModel):
    description: str


class ConsulenzaRefineRequest(BaseModel):
    session_id: str
    follow_up: str
