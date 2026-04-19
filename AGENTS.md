# AGENTS.md

## Project Overview
Node.js/TypeScript authentication system using Express, Prisma (PostgreSQL/Neon), JWT, 2FA, and Google OAuth. Feature-based architecture.

## Commands

```bash
npm run dev              # Development server (ts-node-dev with hot reload)
npm run build            # TypeScript compilation to dist/
npm run start            # Run compiled server from dist/
npm run lint             # ESLint on src/

# Prisma (run after schema changes)
npm run prisma:generate  # Generate Prisma client
npm run prisma:push      # Push schema to database
npm run prisma:migrate   # Run migrations
```

## Setup

1. Copy `.env.example` to `.env` and fill in all required variables (including Google OAuth credentials)
2. Start PostgreSQL via `docker compose up -d` (or use Neon cloud)
3. Run `npm run prisma:generate && npm run prisma:push`

## Path Aliases

The project uses `@/` to alias `src/`. All imports must use these paths:
- `@/config/*` → `src/config/*`
- `@/features/*` → `src/features/*`
- `@/lib/*` → `src/lib/*`
- `@/shared/*` → `src/shared/*`

## Architecture

```
src/
├── config/          # env.ts (Zod), db.ts (Prisma singleton)
├── features/
│   ├── admin/        # routes, controller, service, repository, schema, types
│   ├── auth/         # routes, controller, service, repository, schema, types
│   ├── user/         # routes, controller, service, repository, schema, types
│   └── payment/      # routes, controller, service, repository, schema, types
├── lib/              # jwt.ts, password.ts, mail.ts, otp.ts, midtrans.ts/stripe.ts
└── shared/
    ├── middleware/   # auth-middleware, error-handler, validate-request, etc.
    ├── types/        # Express augmentation, API response types
    └── utils/        # token.ts, date.ts
```

## Key Patterns & Security

- **Route & Controller Separation**: 
  - `*.routes.ts`: Defines endpoints and applies middlewares.
  - `*.controller.ts`: Class-based handlers for request/response logic.
- **Hybrid Token Strategy**:
  - `accessToken`: Sent in JSON body, stored in memory by client, used in `Authorization` header.
  - `refreshToken`: Stored in DB and sent via **HTTP-Only Cookie** (Secure from XSS).
- **Registration Flow (Secure)**: 
  - Registration does NOT provide tokens.
  - Email verification is mandatory via stateless JWT link.
- **Token Rotation**: Refresh Token is deleted and replaced with a new one upon every refresh request.
- **Global & Specific Revocation**:
  - `tokenVersion` in User table acts as a global session kill switch.
  - Specific sessions can be revoked by deleting the `refreshToken` record in DB.
- **Google OAuth Integration**:
  - **Auto-Registration**: New Google users are automatically registered with `provider: GOOGLE` and `isEmailVerified: true`.
  - **Provider Isolation**: Users authenticated via OAuth cannot use password-based login and vice versa.
  - **State Parameter Protection**: JWT-encoded state parameters prevent CSRF attacks during OAuth flow.
  - **Secure Redirects**: OAuth flow uses secure redirects with proper state verification.
- **Secure Password Reset**:
  - **Hashing**: Reset tokens are hashed with **SHA-256** before being stored in the database. Only the raw token is sent via email.
  - **Short Expiry**: Tokens expire in **15 minutes**.
  - **Obfuscation**: Forgot password requests return a success message even if the email is not found to prevent user enumeration.
- **Role-Based Access Control (RBAC)**:
  - **requireRole Middleware**: Protects admin routes with role checks (403 Forbidden for insufficient permissions).
  - **Admin Features**: Exclusive endpoints for user management (list, role update, delete) accessible only to ADMIN role.
  - **User Isolation**: Personal endpoints limited to own profile; no global user management for regular users.
- **Prisma Singleton**: Use `prisma` from `@/config/db` only.
- **Payment Webhook Security**:
  - **Signature Verification**: Mandatory validation of webhook payloads using provider-specific signatures (e.g., Midtrans server-key hash or Stripe-Signature header).
  - **Idempotency Check**: Ensure each transaction is processed exactly once by checking the internal `orderId` status before updating.
  - **Public Endpoint**: Webhook routes are excluded from standard `authMiddleware` but must implement strict origin/signature validation.
- **Payment Gateway Integration**:
  - **Dual Gateway Support**: Midtrans (for IDR/Local) and Stripe (for Global/Cards).
  - **Idempotency**: All updates to `Order` status are idempotent based on the `externalId` or `paymentIntentId`.
  - **Webhook Endpoints**: `/api/v1/payment/webhook` (Midtrans) and `/api/v1/payment/webhook-stripe` (Stripe).

## TypeScript Guidelines

### Strict Type Safety
- Use specific Request generics in controllers: `Request<Params, ResBody, ReqBody, Cookies>`
- Ensure `req.user` refers to the `AuthenticatedUser` interface from `express.d.ts`.
- Avoid `any` - use proper Prisma types or inferred Zod types.

### Schema Validation
Centralized Zod schemas in `*.schema.ts` for all request data (body, query, params).
```typescript
export const exampleSchema = z.object({
  body: z.object({ ... }),
  params: z.object({ ... })
});
export type ExampleInput = z.infer<typeof exampleSchema>['body'];
```

## API Route

```
/api/v1/auth/*           - Authentication endpoints (login, register, refresh, 2FA, etc.)
/api/v1/auth/google       - Initiate Google OAuth flow (redirect)
/api/v1/auth/google/callback - Handle Google OAuth callback
/api/v1/auth/me          - Get current user (Based on accessToken cookie/header)
/api/v1/user/me          - Personal user profile management
/api/v1/admin/*          - Admin management endpoints (requires ADMIN role)
/api/v1/payment/checkout  - Initialize payment (requires AUTH)
/api/v1/payment/webhook   - Midtrans Gateway callback (PUBLIC)
/api/v1/payment/webhook-stripe - Stripe Gateway callback (PUBLIC)
/health                  - Health check
```