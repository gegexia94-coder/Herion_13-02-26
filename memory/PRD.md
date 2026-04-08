# Herion - Controlled Execution Platform for Tax/Fiscal Management
## Product Requirements Document

### Original Problem Statement
Build a transparent, AI-driven tax management web application called "Herion". It is a confidential operational platform where users manage sensitive personal and business procedures inside a protected environment through a controlled execution flow.

### Core Product Vision
Herion is NOT a generic chatbot or tax assistant. It is a **controlled execution platform** where 9 specialist AI agents:
- Understand the case
- Prepare the procedure
- Collect required data and documents
- Evaluate risk
- Request user approval
- Execute only after explicit confirmation
- Track the practice after submission

### Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key
- **Branding**: Deep Teal #0F4C5C + Emerald #5DD9C1, Manrope font
- **Language**: UI in Italian, codebase in English

### 9-Agent Controlled Execution Pipeline
1. **Herion Intake** (Step 1) - Case understanding and classification
2. **Herion Ledger** (Step 2) - Financial and accounting data
3. **Herion Compliance** (Step 3) - Regulatory compliance check
4. **Herion Documents** (Step 4) - Document preparation and verification
5. **Herion Delegate** (Step 5) - Delegation and authorization check
6. **Herion Deadline** (Step 6) - Deadline and timing monitoring
7. **Herion Flow** (Step 7) - Workflow progression management
8. **Herion Monitor** (Step 8) - Status tracking and reminders
9. **Herion Advisor** (Step 9) - Final user-facing explanation
- **Herion Admin** (Coordinator) - Orchestrates all 9 agents, evaluates risk, prepares approval summary

### Status Model
- draft -> in_progress -> waiting_approval -> approved -> submitted -> completed
- Also: blocked, escalated, rejected
- Backward compatible with old "pending" status

### Key Features Implemented
- [x] JWT Authentication with admin/user roles
- [x] Practice CRUD with EU country support
- [x] 9-Agent Controlled Execution Platform
- [x] Explicit User Approval Gate (waiting_approval state)
- [x] Approval Snapshot persistence
- [x] Practice Timeline/Audit Trail
- [x] Risk Assessment (low/medium/high)
- [x] Delegation Status evaluation
- [x] Role-based visibility (admin sees system prompts, users don't)
- [x] Document upload with categories
- [x] PDF export
- [x] Practice Q&A Chat
- [x] Smart Reminders Banner
- [x] Extended registration (EU country selector, client types)
- [x] Mock password reset flow
- [x] Notification system

### Non-Negotiable Principles
1. `waiting_approval` is a true blocking state - no submission without explicit user approval
2. Every approval creates a persisted snapshot with all context
3. All actions are traceable via timeline
4. High-risk practices are escalated, not auto-processed
5. Internal agent logic is hidden from regular users

### Upcoming Tasks (P1)
- Real email provider integration (replace mock email logging)

### Future/Backlog (P2)
- Country-specific tax rules implementation
- 2FA-ready architecture
- Advanced analytics dashboard
- Multi-language support
- Email notifications for practice status changes
