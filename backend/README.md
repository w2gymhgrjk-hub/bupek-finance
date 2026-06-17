# BUPEK Finance Limited — Microfinance Management System

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- npm

### Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your database URL and secrets
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

### Frontend Setup
```bash
cd frontend
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
npm install
npm run dev
```

### Docker (Production)
```bash
cp docker-compose.yml .
# Set environment variables
docker-compose up -d
docker-compose exec api npx prisma migrate deploy
docker-compose exec api ts-node prisma/seed.ts
```

## Default Login Credentials (after seeding)
| Role | Email | Password |
|------|-------|----------|
| CEO/Admin | ceo@bupekfinance.co.tz | Admin@1234 |
| Operations Manager | ops@bupekfinance.co.tz | Ops@1234 |
| Branch Manager | bm.hq@bupekfinance.co.tz | Bm@12345 |
| Loan Officer | lo1@bupekfinance.co.tz | Lo@12345 |
| Collection Officer | co1@bupekfinance.co.tz | Co@12345 |
| Accountant | acc@bupekfinance.co.tz | Acc@12345 |

## API Base URL
`http://localhost:4000/api/v1`

## Module Files
Open the HTML files in the outputs folder to view and download all code:
- bupek-backend-foundation.html (package.json, schema, core files)
- bupek-backend-modules1.html (Auth, Users, Branches)
- bupek-backend-modules2.html (Clients, LoanProducts, Loans)
- bupek-backend-modules3.html (Repayments, Collections, Reports, SMS, Jobs, Seed)
- bupek-frontend-*.html (All Next.js pages and components)