# ScoreEngine

**ScoreEngine** is an opinionated starter kit for building an AI‑powered outreach tool for agency sales teams. It turns a prospect’s site URL and a chosen service angle into a personalized cold email in seconds. The project is built on the modern [Next.js](https://nextjs.org/) App Router, uses [Prisma](https://prisma.io/) for data access, [Clerk](https://clerk.com/) for authentication, [OpenAI](https://openai.com/) for text generation, [Lemon Squeezy](https://www.lemonsqueezy.com/) for billing, [Upstash](https://upstash.com/) for rate limiting, and [Tailwind](https://tailwindcss.com/) with a custom “Liquid Glass” theme for the UI.

## Features

* **Authentication** – Email magic links via Clerk. Protected areas (`/dashboard`, `/billing`, `/admin`) require a signed‑in session.
* **Database** – Postgres via Prisma. Models for users, audits, events, subscriptions, invoices and webhooks are defined in the Prisma schema.
* **Email generation** – A `/api/generate` endpoint validates input, scrapes basic signals from a target site, sends a structured prompt to OpenAI, validates the JSON output against a Zod schema and stores the result. Credits are decremented per generation.
* **Site scanning** – A lightweight site scraper collects basic information (title, first `<h1>`, CTA presence, pricing page, etc.) to inform the AI.
* **Rate limiting** – Per‑user and per‑IP limits via Upstash Redis (1 generation per 10 seconds, burst of 3).
* **Billing** – Hosted checkout links for subscriptions and top‑ups via Lemon Squeezy. Webhook handlers record invoices, subscriptions and credit allocations.
* **Liquid Glass UI** – A modern interface with soft backdrop blur, gradients and subtle animations. Built using Tailwind, shadcn/ui and Radix primitives.

## Getting started

### Prerequisites

* Node.js 18 or newer
* PostgreSQL database (e.g. Neon) with pooled and direct URLs
* Accounts on Clerk, OpenAI, Upstash and Lemon Squeezy

### Installation

```bash
git clone https://example.com/score-engine.git
cd score-engine
cp env.template .env
# fill out the `.env` file with your secrets and connection strings

# install dependencies
npm install

# generate Prisma client
npx prisma generate

# run database migrations (creates tables defined in `prisma/schema.prisma`)
npx prisma migrate deploy

# start the development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Deploying to Vercel

ScoreEngine is designed for Vercel. After connecting your repository, set the required environment variables in the Vercel dashboard. The build script runs database migrations during the build step and starts the Next.js application.

### Environment variables

All sensitive configuration is provided via environment variables (never hard‑coded). Copy `env.template` to `.env` and supply values for:

| Variable | Description |
|---------|-------------|
| `NEXT_PUBLIC_APP_URL` | Public base URL of your app (used in emails and redirects). |
| `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | API keys from Clerk. |
| `DATABASE_URL` | Pooled Postgres connection string (used at runtime). |
| `DIRECT_URL` | Direct Postgres connection string (used by Prisma migrations). |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Upstash REST API credentials for rate limiting. |
| `OPENAI_API_KEY` | API key for OpenAI (gpt‑5‑mini or similar). |
| `LEMON_SQUEEZY_API_KEY`, `LEMON_SQUEEZY_STORE_ID` | API credentials for Lemon Squeezy. |
| `LEMON_SQUEEZY_WEBHOOK_SECRET` | Secret used to verify Lemon Squeezy webhooks. |
| `LEMON_SQUEEZY_PRICE_ID_*` | Price IDs for subscriptions and top‑up products. |
| `OWNER_EMAIL` | Email address of the first admin user. |

### Project structure

```
score-engine/
├─ prisma/                 # Prisma schema and migrations
├─ app/                    # Next.js App Router pages and API routes
│  ├─ layout.tsx           # Root layout with Clerk provider and global styles
│  ├─ globals.css          # Tailwind and custom styles
│  ├─ page.tsx             # Landing page; redirects based on auth state
│  ├─ login/               # Public sign‑in page
│  ├─ dashboard/           # Protected user dashboard
│  ├─ billing/             # Protected billing page
│  ├─ settings/            # Profile management
│  ├─ admin/               # Admin console (role‑based)
│  └─ api/                 # Type‑safe server actions
│     ├─ me/route.ts       # Returns current user info and credits
│     ├─ generate/route.ts # Generates an email, stores audit and decrements credits
│     ├─ audits/route.ts   # Paginated audit history
│     ├─ credits/checkout/route.ts      # Top‑up checkout link
│     ├─ subscription/checkout/route.ts # Subscription checkout link
│     ├─ lsz/webhook/route.ts           # Lemon Squeezy webhooks
│     └─ track/route.ts    # Telemetry endpoint (optional)
├─ components/             # UI primitives composed using shadcn/ui & Radix
├─ lib/                    # Reusable server‑side utilities (Prisma client, rate limiter, OpenAI wrapper, site scraper, Lemon Squeezy helper)
├─ middleware.ts           # Auth and rate‑limit middleware for protected routes
├─ tailwind.config.js      # Tailwind theme configuration with custom colours
├─ tsconfig.json           # TypeScript compiler options
├─ next.config.mjs         # Next.js configuration
├─ env.template            # Environment variable names (copy to .env)
└─ README.md               # You are here
```

### Development notes

* **Zod schemas:** The AI response is validated against a strict Zod schema to guarantee JSON shape and enforce length and language rules. If the JSON is invalid the request is retried once.
* **Credits:** New users start with 10 credits and a 7‑day free trial. Each successful generation consumes one credit. When the trial ends and no subscription/top‑ups are active, generations will fail.
* **Rate limiting:** The `/api/generate` route uses Upstash Redis. You can adjust the limit in `lib/rateLimiter.ts`.
* **Lemon Squeezy:** Webhooks are verified using the raw request body and `LEMON_SQUEEZY_WEBHOOK_SECRET`. The webhook endpoint handles subscription and payment events, allocates credits and logs invoices.
* **Admin:** The user whose email matches `OWNER_EMAIL` is granted admin rights. The `/admin` page lists users, their credit balances and allows incrementing credits.

### Testing

A basic happy‑path end‑to‑end test is included under `__tests__/`. You can run it with your preferred test runner. The test covers user sign‑in, email generation and credit deduction.

---

ScoreEngine is a starting point and should be adapted to your exact use‑case. Contributions and improvements are welcome!