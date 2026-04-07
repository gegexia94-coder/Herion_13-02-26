# AIC - Artificial Commercialista PRD

## Original Problem Statement
Build a web application called "AIC – Artificial Commercialista" that autonomously manages tax practices using controlled AI agents with full transparency.

## User Personas
1. **Tax Professionals (Commercialisti)**: Manage multiple client tax practices
2. **Small Business Owners**: Need help with VAT, tax declarations
3. **Administrators**: System oversight and management

## Core Requirements
- User authentication (JWT-based)
- Tax practice management (CRUD)
- 4 AI Agents: Analysis, Validation, Document, Communication
- Document upload and storage
- Full activity logging (transparency)
- Notifications system
- Italian UI interface

## Tech Stack
- Frontend: React + Tailwind CSS + shadcn/ui
- Backend: FastAPI
- Database: MongoDB
- AI: OpenAI GPT-5.2 via Emergent Integrations
- Storage: Emergent Object Storage
- Auth: JWT with httpOnly cookies

## What's Been Implemented (April 7, 2026)

### Backend
- JWT authentication (login, register, logout, me)
- Practice CRUD endpoints
- Document upload with object storage
- 4 AI Agents with GPT-5.2 integration
- Activity logging system
- Notifications system
- Dashboard stats endpoint
- Agents info endpoint (transparency)

### Frontend
- Login/Register pages (Italian UI)
- Dashboard with stats cards
- Practices list with filtering
- Create practice (3-step wizard)
- Practice detail with AI agent execution
- Agents page (shows system prompts)
- Activity log timeline
- Responsive layout with navigation

## API Endpoints
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- GET /api/practices
- POST /api/practices
- GET /api/practices/{id}
- PUT /api/practices/{id}
- DELETE /api/practices/{id}
- POST /api/documents/upload/{practice_id}
- GET /api/documents/{document_id}
- POST /api/agents/execute
- GET /api/agents/info
- GET /api/activity-logs
- GET /api/notifications
- GET /api/dashboard/stats

## Prioritized Backlog

### P0 (Complete)
- [x] User authentication
- [x] Practice CRUD
- [x] AI Agent execution
- [x] Document upload
- [x] Activity logging

### P1 (Future)
- [ ] PDF generation for practices
- [ ] Email notifications
- [ ] Multi-language support
- [ ] Advanced search

### P2 (Future)
- [ ] Calendar integration
- [ ] Batch document processing
- [ ] Analytics dashboard
- [ ] Team collaboration

## Next Tasks
1. Add PDF export for completed practices
2. Implement email notifications for status changes
3. Add bulk practice import
4. Enhanced AI agent chaining
