# ⚡ FlowForge v2 — Workflow Automation Platform

A production-grade workflow automation system with visual builder, rule engine, execution logs, and authentication.

---
## 🎬 Demo Video

👉 Watch Demo  https://drive.google.com/file/d/1mM11ma2RnaeVJLY7B_RUvfUjKvb9Z-i5/view?usp=sharing


## 🚀 Quick Start

### 1. Install dependencies
```bash
npm run install:all
# or manually:
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure Supabase
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your Supabase credentials
```

Run `backend/schema.sql` in your Supabase SQL editor to create all tables.

### 3. Run everything
```bash
npm run full
```
- **API:** http://localhost:5000
- **UI:**  http://localhost:3000

---

## 🔐 Demo Login
| Email | Password | Role |
|-------|----------|------|
| admin@flowforge.dev | admin123 | Admin |
| user@flowforge.dev | admin123 | User |

(These are seeded in `schema.sql`)

---

## 🏗 Architecture

```
flowforge/
├── backend/
│   ├── server.js              # Express entry
│   ├── authService.js         # JWT auth + bcrypt
│   ├── workflowService.js     # Workflow/Step/Rule CRUD
│   ├── executionService.js    # Execution engine + logs
│   ├── ruleEngine.js          # json-rules-engine evaluator
│   ├── supabase.js            # DB client
│   ├── middleware/auth.js     # JWT middleware + roles
│   ├── workflows/route.js     # Workflow + step routes
│   ├── routes/auth/           # Auth routes
│   ├── routes/steps/          # Step + rule routes
│   ├── routes/rules/          # Rule CRUD
│   ├── executions/route.js    # Execution routes
│   ├── stats/route.js         # Stats
│   └── schema.sql             # Database schema
│
└── frontend/
    ├── app/
    │   ├── auth/page.js        # Login / Register
    │   ├── dashboard/page.js   # Dashboard with stats
    │   ├── workflows/page.js   # Workflow list
    │   ├── workflows/[id]/     # Workflow detail
    │   ├── builder/[id]/       # Visual workflow builder
    │   ├── executions/page.js  # All executions
    │   └── executions/[id]/    # Live execution console
    ├── components/layout/      # AppShell sidebar
    ├── lib/api.js              # API client (all endpoints)
    └── store/authStore.js      # Zustand auth state
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Register user |
| POST | /auth/login | Login → JWT |
| POST | /auth/logout | Logout |
| GET | /auth/me | Current user |
| GET | /workflows | List workflows |
| POST | /workflows | Create workflow |
| GET | /workflows/:id | Get workflow + steps |
| PUT | /workflows/:id | Update workflow |
| DELETE | /workflows/:id | Delete (admin) |
| GET | /workflows/:id/steps | List steps |
| POST | /workflows/:id/steps | Add step |
| PUT | /steps/:id | Update step |
| DELETE | /steps/:id | Delete step |
| GET | /steps/:id/rules | List rules |
| POST | /steps/:id/rules | Add rule |
| PUT | /rules/:id | Update rule |
| DELETE | /rules/:id | Delete rule |
| POST | /workflows/:id/execute | Start execution |
| GET | /executions | List executions |
| GET | /executions/:id | Get execution + logs |
| POST | /executions/:id/approve | Approve waiting |
| POST | /executions/:id/cancel | Cancel |
| POST | /executions/:id/retry | Retry failed |
| GET | /stats | Platform stats |

---

## 🧠 Rule Engine

Rules use either:
- `DEFAULT` — always matches (fallback)
- Simple expressions: `amount > 100`, `status == approved`
- JSON Rules Engine format: `{"all":[{"fact":"amount","operator":"greaterThan","value":100}]}`

---

## ⚙️ Step Types
- **task** — General automated work
- **approval** — Pauses for human approval
- **notification** — Sends a notification
- **condition** — Routing/branching node
