# InsureSwift 🛡️

> AI-powered insurance claims management platform with real-time fraud detection, automated workflows, and intelligent risk analysis.

🌐 **Live Demo**: [Here](https://insureswif3273.builtwithrocket.new)

---

## ✨ Features

### 🤖 AI-Powered Claim Analysis
- Automated fraud detection using Google Gemini AI
- Real-time risk scoring (High / Medium / Low) stored per claim
- Fraud reasoning engine with detailed explainability
- Claim similarity detection to identify duplicate or related claims

### 📊 Admin Dashboard
- KPI bento grid with live metrics (total claims, approval rates, fraud flags)
- Claims volume chart over time
- Fraud distribution chart by risk level (High / Medium / Low)
- Status distribution chart (Pending / Approved / Rejected / Escalated)
- Recent claims feed and escalations table
- Email metrics dashboard with interaction logs

### 🕵️ Fraud Network Graph
- Interactive visual graph mapping claim relationships
- Nodes colored by risk level for instant pattern recognition
- Powered by real stored `risk_level` and `fraud_score` from the database

### 📋 Claims Management
- Full claims table with filtering, sorting, and search
- Claim detail drawer with AI analysis results, fraud score gauge, and status history
- One-click approve / reject / escalate actions
- Claim similarity engine to surface related claims

### 🚨 Escalation Queue
- Dedicated queue for high-risk or flagged claims
- Detailed escalation view with AI reasoning and audit trail
- Admin decision workflow with email notifications

### 📁 Policy Manager
- Create and manage insurance policies
- Policy rules table with configurable thresholds
- Assign policies to claimants

### 📝 File a Claim
- Guided multi-step claim submission form for claimants
- Automatic AI analysis triggered on submission
- Real-time processing status updates

### 📬 Email Automation (Resend)
- Automated claim submission confirmation emails to claimants
- Admin notification emails on new claim submission
- Approval / rejection decision emails with custom messaging
- Resend reply webhook for two-way email interactions
- Admin email whitelist management

### 🔐 Authentication & Authorization
- Supabase Auth with email/password sign-up and login
- Email verification flow for new accounts
- Role-based access: Admin vs. Claimant views
- Protected routes via Next.js middleware
- Demo admin credentials for quick evaluation

### 📜 Audit Log
- Full audit trail of all admin actions
- Timestamped records of claim decisions, escalations, and policy changes

### 🧑‍💼 Claimant Dashboard
- Personal claim status tracker
- Claim history with AI risk scores and decision outcomes
- Real-time status updates

### 💬 AI Assistant
- In-app AI chat assistant powered by Gemini
- Context-aware responses for claims and policy queries

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v3 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| AI | Google Gemini (`@google/generative-ai`) |
| Email | Resend |
| Charts | Recharts |
| Icons | Heroicons + Lucide React |
| Notifications | Sonner |

---

## 📁 Project Structure

```
insureswift/
├── public/
│   └── assets/images/          # Static images and logo
├── src/
│   ├── app/
│   │   ├── admin-dashboard/    # Admin KPI, charts, feeds
│   │   ├── claims-management/  # Claims table, drawer, similarity
│   │   ├── claimant-dashboard/ # Claimant personal view
│   │   ├── escalation-queue/   # Escalation workflow
│   │   ├── fraud-network/      # Fraud graph visualization
│   │   ├── fraud-reasoning-engine/ # AI fraud explainability
│   │   ├── file-claim/         # Claim submission form
│   │   ├── claim-status/       # Claim status tracker
│   │   ├── policy-manager/     # Policy CRUD
│   │   ├── audit-log/          # Audit trail
│   │   ├── login/              # Auth pages
│   │   ├── signup/
│   │   └── api/                # Next.js API routes
│   │       ├── analyze-claim/  # AI claim analysis
│   │       ├── fraud-network/  # Fraud graph data
│   │       ├── fraud-reasoning/
│   │       ├── claim-similarity/
│   │       ├── send-claim-email/
│   │       ├── seed-demo/
│   │       ├── admin/          # Admin actions & email
│   │       ├── ai/             # Chat completion
│   │       └── webhooks/       # Resend reply webhook
│   ├── components/             # Shared UI components
│   ├── contexts/               # Auth & Claim context providers
│   ├── lib/                    # Utilities, types, AI client
│   └── styles/                 # Global CSS & Tailwind
├── supabase/
│   ├── migrations/             # Database schema migrations
│   └── functions/              # Supabase Edge Functions (email)
├── next.config.mjs
├── tailwind.config.js
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project
- Resend account (for email)
- Google Gemini API key

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file with:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
RESEND_API_KEY=your-resend-api-key
NEXT_PUBLIC_SITE_URL=https://insureswif3273.builtwithrocket.new
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:4028](http://localhost:4028) in your browser.

### Build for Production

```bash
npm run build
npm run serve
```

---

## 📦 Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server on port 4028 |
| `npm run build` | Build for production |
| `npm run serve` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run format` | Format code with Prettier |
| `npm run type-check` | TypeScript type checking |

---

## 🔑 Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin (LIC) | yash.chandnani07@gmail.com | abc@1234 |

> Use the **"Try Demo"** button on the login page to auto-fill admin credentials.

---

## 🙏 Acknowledgments

- Built with [Rocket.new](https://rocket.new)
- Powered by [Next.js](https://nextjs.org) and [React](https://react.dev)
- Database & Auth by [Supabase](https://supabase.com)
- AI by [Google Gemini](https://ai.google.dev)
- Email by [Resend](https://resend.com)
- Styled with [Tailwind CSS](https://tailwindcss.com)

---

Built with ❤️ on [Rocket.new](https://rocket.new)
