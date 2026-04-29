# Auth System - Backend

A comprehensive Node.js/TypeScript authentication backend featuring Express, Prisma (PostgreSQL/Neon), JWT, 2FA (TOTP), Google OAuth, and premium subscription features with Midtrans & Stripe integration.

## Features

- 🔐 **Advanced Auth**: Secure registration & login with mandatory email verification.
- 🔑 **Hybrid Token Strategy**: Access tokens (JSON) + Refresh tokens (HTTP-Only Cookie) with rotation.
- 🛡️ **Two-Factor Authentication**: TOTP-based 2FA (Google Authenticator, etc.).
- 🌐 **Google OAuth**: Seamless social login with automatic registration and avatar fetching.
- 💎 **Premium Subscription**: Tiered access with Midtrans (Local/IDR) and Stripe (Global) integration.
- 👤 **RBAC & Admin**: Comprehensive role-based access control and admin dashboard for user management.
- 🚀 **Performance & Security**: Tiered rate limiting (Global, Auth, Payment) and ACID-compliant transactions.
- 📝 **Structured Logging**: JSON-formatted logs with request tracing (requestId) for observability.

## Tech Stack

- **Runtime**: [Bun](https://bun.sh/) (Fast all-in-one JavaScript runtime)
- **Framework**: Express.js with TypeScript
- **ORM**: Prisma (PostgreSQL/Neon)
- **Auth**: JWT, otplib (2FA), OAuth2
- **Payments**: Midtrans & Stripe
- **Validation**: Zod (Schema-based validation)
- **Logging**: Structured JSON logging with custom utility

## Prerequisites

- [Bun](https://bun.sh/) installed locally
- PostgreSQL database (Local Docker or [Neon.tech](https://neon.tech))
- Google OAuth Credentials (for social login)
- Midtrans/Stripe API Keys (for payments)

## Getting Started

1. **Clone & Install**:
   ```bash
   git clone <repository-url>
   cd auth-system
   bun install
   ```

2. **Environment Setup**:
   ```bash
   cp .env.example .env
   # Configure your variables in .env
   ```

3. **Database Initialization**:
   ```bash
   bun run prisma:generate
   bun run prisma:push
   ```

4. **Development Mode**:
   ```bash
   bun run dev
   ```

## Available Commands

| Command | Description |
| :--- | :--- |
| `bun run dev` | Start development server with hot reload |
| `bun run build` | Compile TypeScript to `dist/` |
| `bun run start` | Run production bundle from `dist/` |
| `bun run lint` | Run ESLint check |
| `bun run prisma:push` | Sync Prisma schema with database |
| `bun run prisma:generate` | Generate Prisma client types |

## Project Structure

The project follows a **Feature-based Subdomain Architecture**:

```text
src/
├── config/          # env.ts (Zod), db.ts (Prisma singleton)
├── features/
│   ├── auth/        # Registration, Login, OAuth, 2FA, Sessions
│   ├── user/        # Personal profile management
│   ├── admin/       # User management & dashboard stats (Admin Only)
│   ├── payment/     # Checkout, Subscriptions, Webhooks (Midtrans/Stripe)
│   └── content/     # Exclusive/Premium content delivery
├── lib/             # Third-party wrappers (JWT, Mail, OTP, Stripe, etc.)
├── shared/          # Middlewares, types, and logging utilities
└── server.ts        # Entry point
```

## API Overview

### Authentication (`/api/v1/auth`)
- `POST /register` - Register new account
- `POST /login` - Local authentication
- `POST /refresh` - Rotate access/refresh tokens
- `POST /logout` - Revoke current session
- `GET /google` - Initiate Google OAuth
- `POST /forgot-password` / `POST /reset-password` - Account recovery
- `POST /enable-2fa` / `POST /confirm-2fa` - TOTP Setup

### Payments & Premium (`/api/v1/payment`)
- `POST /checkout` - Create payment session (Premium upgrade)
- `POST /cancel` - Cancel subscription (grace period applies)
- `POST /webhook` - Midtrans callback (Secured)
- `POST /webhook-stripe` - Stripe callback (Secured)

### Administration (`/api/v1/admin`)
- `GET /users` - Paginated user list with search
- `PATCH /users/:id/role` - Update user role (RBAC)
- `GET /stats` - Dashboard metrics

## Security Standards

- **Zero-Trust Input**: Strict Zod validation for all incoming requests.
- **ACID Transactions**: Prisma interactive transactions for all critical operations.
- **Anti-Abuse**: Tiered rate limiting protecting Auth and Payment endpoints.
- **Idempotency**: Webhook handlers ensure payments are processed exactly once.
- **Global Revocation**: `tokenVersion` mechanism allows instant logout from all devices.

## License

MIT License. See `LICENSE` for more information.