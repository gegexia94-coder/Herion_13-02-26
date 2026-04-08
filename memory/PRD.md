# Herion - Precision. Control. Confidence. PRD

## Original Problem Statement
Build a premium web application for tax practice management with AI agents, full transparency, and professional UX.

## Brand Identity
- **Name**: Herion
- **Tagline**: Precision. Control. Confidence.
- **Colors**: Deep teal (#0F4C5C), Emerald accent (#5DD9C1)
- **Style**: Premium, minimal, trustworthy, high-end financial technology

## User Personas
1. **Private Individuals**: Personal tax declarations without VAT
2. **Freelancers (Libero Professionisti)**: Autonomous workers with VAT
3. **Companies (Aziende)**: Business entities with VAT
4. **Tax Professionals**: Managing multiple client practices

## Core Features Implemented

### Authentication & Registration
- JWT-based authentication
- Enhanced registration form with:
  - First name, Last name
  - Email (validated), Phone (validated)
  - Client type (Privato/Professionista/Azienda)
  - VAT number (conditional - only for Professionista/Azienda)
  - Fiscal code (validated)
  - Password with confirmation
  - Privacy policy consent
  - Terms of service consent

### Premium UI/UX
- Floating rounded navbar with scroll show/hide animation
- Premium rounded components throughout
- Soft shadows and smooth animations
- Herion geometric "H" logo
- Consistent brand colors

### Confirmation System
All sensitive actions require confirmation:
- Logout
- Delete practice
- Submit new practice
- Change practice status
- Execute AI agent
- Upload documents

### Alert/Notification System
- Success, Error, Warning, Info alerts
- Rounded corners, smooth fade animations
- Toast notifications via Sonner

### Tax Practice Management
- CRUD operations for practices
- Client type support
- Status tracking (pending, processing, completed, rejected)
- Document upload with object storage

### Herion AI
4 transparent AI agents:
1. Analysis Agent - Situation analysis
2. Validation Agent - Data verification
3. Document Agent - Data extraction
4. Communication Agent - Status explanation

## Tech Stack
- Frontend: React + Tailwind CSS + shadcn/ui
- Backend: FastAPI
- Database: MongoDB
- AI: OpenAI GPT-5.2 via Emergent Integrations
- Storage: Emergent Object Storage

## API Endpoints
All endpoints prefixed with /api and return Herion branding

## Next Tasks
1. Add PDF export for completed practices
2. Implement email notifications
3. Add automated AI agent workflow chains
4. Multi-language support
