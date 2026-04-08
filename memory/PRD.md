# Herion - European Premium Tax Management Platform
## Product Requirements Document

### Original Problem Statement
Build a transparent, AI-driven tax management web application called "Herion" for the European market. The platform provides:
- User dashboard for tax practice management (VAT registration, closure, declarations)
- 5 transparent AI agents (Analysis, Validation, Compliance, Document, Communication) powered by GPT-5.2
- Full activity audit log with zero hidden logic
- Document upload with categorized storage
- Registration with user types (Private, Freelancer, Company)
- Professional UI with "Herion" branding (Deep Teal #0F4C5C, Emerald #5DD9C1)
- PDF export for completed practices
- UI strictly in Italian, codebase in English
- Europe-ready structure with EU country selector and adaptable fiscal logic

### Tech Stack
- Frontend: React 18, Tailwind CSS, Shadcn/UI, Lucide Icons, Manrope font
- Backend: FastAPI, Python
- Database: MongoDB (Motor async driver)
- AI: GPT-5.2 via Emergent LLM Key (emergentintegrations)
- PDF: ReportLab
- Auth: JWT (httpOnly cookies) + bcrypt
- Storage: Emergent Object Storage

### Architecture
```
/app/
├── backend/
│   ├── server.py              # All API endpoints, AI agents, PDF generation
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── index.css           # Global styles, Manrope font, Herion variables
│   │   ├── App.js              # Routes
│   │   ├── contexts/AuthContext.js
│   │   ├── components/
│   │   │   ├── Layout.jsx      # Floating premium navbar
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── ui/             # Shadcn components
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── ForgotPasswordPage.jsx
│   │   │   ├── ResetPasswordPage.jsx
│   │   │   ├── ProfilePage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── PracticesListPage.jsx
│   │   │   ├── CreatePracticePage.jsx
│   │   │   ├── PracticeDetailPage.jsx
│   │   │   ├── AgentsPage.jsx
│   │   │   └── ActivityLogPage.jsx
│   │   └── services/api.js
```

### What's Been Implemented (v2.0 - Apr 8 2026)

#### P0 - Completed
- [x] JWT Auth with httpOnly cookies, bcrypt hashing
- [x] Expanded registration: first_name, last_name, email, phone, DOB, country, city, address, client_type, vat_number, fiscal_code, company_name, password, privacy/terms consent
- [x] Forgot password flow (MOCKED email - logs reset link to console)
- [x] Reset password with token-based validation
- [x] User profile page (view/edit personal info, change password)
- [x] EU country selector (27 countries with fiscal_id_label, vat_prefix)
- [x] Document categories (10 types: identity, tax, VAT, invoices, company, accounting, compliance, payroll, activity, other)
- [x] Public-facing product messaging (dashboard benefits cards, AI banner, footer)
- [x] Premium Herion branding (Manrope font, teal/emerald palette, floating navbar)

#### P1 - Completed
- [x] 5 AI agents: Analysis, Validation, Compliance, Document, Communication
- [x] Agent orchestration endpoint (sequential 5-step pipeline)
- [x] Agent workflow UI with pipeline visualization
- [x] PDF download button on completed practices
- [x] Practice detail with categorized document upload
- [x] Full activity logging with transparency

#### Features Summary
- Auth: register, login, logout, forgot-password, reset-password, profile, change-password
- Practices: CRUD, status management, document upload with categories
- AI: 5 agents, individual execution, full orchestration pipeline
- PDF: Herion-branded PDF export for completed practices
- Reference: 27 EU countries, 10 document categories

### Backlog (P2 - Future)
- [ ] Real email provider integration (Resend/SendGrid) for password reset
- [ ] Full country-specific tax rule implementations
- [ ] 2FA-ready architecture
- [ ] Email notifications for practice status changes
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
