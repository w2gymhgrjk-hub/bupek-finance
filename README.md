# BUPEK Finance Limited — Microfinance Management System

Full-stack microfinance platform built for BUPEK Finance Limited, Tanzania.

## Tech Stack
- **Frontend**: Next.js 15 (React, TypeScript, Tailwind CSS) — port 3000
- **Backend**: Node.js, Express.js, TypeScript — port 5000
- **Database**: PostgreSQL — port 4000
- **ORM**: Prisma v5.22

---

## Quick Start (Local Development)

### Prerequisites
- Node.js v18+
- PostgreSQL running on port 4000
- Git

### 1. Clone and install
```bash
git clone <repo-url>
cd bupek-finance
```

### 2. Backend setup
```bash
cd backend
cp .env.example .env        # then edit .env with your database password
npm install
npx prisma migrate deploy   # create all 19 database tables
npx prisma db seed          # load seed data + CEO account
npm run dev                 # starts on port 5000
```

### 3. Frontend setup (new terminal)
```bash
cd frontend
npm install
cp .env.local.example .env.local   # or create with: echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1" > .env.local
npm run dev                         # starts on port 3000
```

### 4. Open the system
Navigate to **http://localhost:3000** and log in:
| Field    | Value                          |
|----------|-------------------------------|
| Email    | ceo@bupekfinance.co.tz        |
| Password | Admin@1234                    |

---

## Environment Variables

### Backend (`backend/.env`)
| Variable                | Required | Description                           |
|-------------------------|----------|---------------------------------------|
| `DATABASE_URL`          | ✔        | PostgreSQL connection string          |
| `JWT_SECRET`            | ✔        | Random long string (keep secret!)     |
| `JWT_REFRESH_SECRET`    | ✔        | Different random string               |
| `AT_USERNAME`           | SMS only | Africa's Talking account username     |
| `AT_API_KEY`            | SMS only | Africa's Talking API key              |
| `AT_SENDER_ID`          | SMS only | Sender ID (e.g. BUPEK)               |
| `SMTP_HOST`             | Email    | SMTP server (e.g. smtp.gmail.com)     |
| `SMTP_PORT`             | Email    | Usually 587                           |
| `SMTP_USER`             | Email    | SMTP username / email address         |
| `SMTP_PASS`             | Email    | SMTP password or app password         |

### Frontend (`frontend/.env.local`)
| Variable              | Value                                  |
|-----------------------|----------------------------------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000/api/v1` (local) |

---

## Database Management
```bash
cd backend
npm run db:migrate       # apply migrations
npm run db:seed          # reload seed data (⚠ resets test data)
npm run db:studio        # open Prisma Studio GUI at port 5555
npm run db:reset         # drop + recreate + seed (⚠ destroys all data)
```

---

## Backup & Restore
```bash
# Run a manual backup
bash scripts/backup.sh

# Set up automatic daily backup at 2am
bash scripts/setup_backup_cron.sh

# Restore from backup file
bash scripts/restore.sh /var/backups/bupek/bupek_backup_YYYYMMDD_HHMMSS.sql.gz
```

---

## User Roles
| Role                 | Key Permissions                              |
|----------------------|----------------------------------------------|
| CEO_ADMIN            | Full access — all branches, all modules      |
| OPERATIONS_MANAGER   | Approve/disburse loans, all reports          |
| BRANCH_MANAGER       | Branch-scoped loans, clients, staff          |
| LOAN_OFFICER         | Create clients, submit/recommend loans       |
| COLLECTION_OFFICER   | Collections, repayments, SMS                 |
| ACCOUNTANT           | Read-only: all financial reports             |

---

## Project Structure
```
bupek-finance/
├── backend/
│   ├── src/
│   │   ├── modules/         # auth, users, branches, clients, loans,
│   │   │                    # repayments, collections, reports, sms, audit
│   │   ├── middleware/      # auth, rbac, audit, upload, rateLimit
│   │   ├── jobs/            # overdueDetection.job.ts, smsReminder.job.ts
│   │   ├── utils/           # mailer, logger, numberGenerator, scheduleCalculator
│   │   └── config/          # env.ts
│   └── prisma/
│       ├── schema.prisma    # 19-table DB schema
│       └── seed.ts          # seed data
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── (auth)/      # login, forgot-password, reset-password
│       │   └── (dashboard)/ # all 12 feature pages
│       ├── components/      # layout, shared, forms
│       └── lib/             # api.ts, permissions.ts, utils.ts
└── scripts/
    ├── backup.sh            # pg_dump backup with rotation
    ├── restore.sh           # restore from backup file
    └── setup_backup_cron.sh # install daily cron job
```

---

## Support
Contact the developer for technical assistance. BUPEK owns all source code — no recurring license fees apply.
