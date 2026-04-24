# Backend Auth System (AGENTS.md)

## Project Overview
A comprehensive Node.js/TypeScript authentication backend.
- **Technology**: Express, Prisma (PostgreSQL/Neon), JWT, 2FA (TOTP), Google OAuth, and premium subscription features.

## Commands

### Backend (auth-system/)

```bash
bun run dev              # Development server (ts-node-dev with hot reload)
bun run build            # TypeScript compilation to dist/
bun run start            # Run compiled server from dist/
bun run lint             # ESLint on src/

# Prisma (CRITICAL: Run after schema changes)
bun run prisma:push      # Push schema to database (Dev/Neon)
bun run prisma:generate  # Generate Prisma client
bun run prisma:migrate   # Run migrations (Prod)
```

**Workflow for Schema Changes:**
1. Modify `prisma/schema.prisma`
2. Run `bun run prisma:push` (to sync DB)
3. Run `bun run prisma:generate` (to update types)
4. Update TS interfaces in `features/*/types/*.types.ts`
5. Update DTO/Service mapping (e.g., `toUserResponse`)

## Setup

1. Copy `.env.example` to `.env` and fill in all required variables (including Google OAuth credentials)
2. Start PostgreSQL via `docker compose up -d` (or use Neon cloud)
3. Run `bun run prisma:generate && bun run prisma:push`

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
│   ├── admin/
│   │   ├── controllers/admin.controller.ts
│   │   ├── repositories/admin.repository.ts
│   │   ├── routes/admin.routes.ts
│   │   ├── schemas/admin.schema.ts
│   │   ├── services/user-admin.service.ts
│   │   └── index.ts
│   ├── auth/
│   │   ├── controllers/auth.controller.ts
│   │   ├── repositories/auth.repository.ts
│   │   ├── routes/auth.routes.ts
│   │   ├── schemas/auth.schema.ts
│   │   ├── services/
│   │   │   ├── core-auth.service.ts   # register, login (returns full user with lastLogin/avatar), refresh, logout, getCurrentUser
│   │   │   ├── account.service.ts     # email verification, password reset/change
│   │   │   ├── two-factor.service.ts  # 2FA enable/confirm/disable
│   │   │   ├── oauth.service.ts       # Google OAuth flow & callback (returns full user with lastLogin/avatar)
│   │   │   └── index.ts
│   │   ├── types/auth.types.ts
│   │   └── index.ts
│   ├── content/
│   │   ├── controllers/content.controller.ts
│   │   ├── repositories/content.repository.ts
│   │   ├── routes/content.routes.ts
│   │   ├── schemas/content.schema.ts
│   │   ├── services/content.service.ts
│   │   ├── types/content.types.ts
│   │   └── index.ts
│   ├── payment/
│   │   ├── controllers/payment.controller.ts
│   │   ├── repositories/payment.repository.ts
│   │   ├── routes/payment.routes.ts
│   │   ├── schemas/payment.schema.ts
│   │   ├── services/
│   │   │   ├── checkout.service.ts          # payment session creation (Midtrans/Stripe)
│   │   │   ├── midtrans-webhook.service.ts  # Midtrans signature verify & order update
│   │   │   ├── stripe-webhook.service.ts    # Stripe signature verify & order update
│   │   │   ├── subscription.service.ts      # premium upgrade logic
│   │   │   └── index.ts
│   │   ├── types/payment.types.ts
│   │   └── index.ts
│   └── user/
│       ├── controllers/user.controller.ts
│       ├── repositories/user.repository.ts
│       ├── routes/user.routes.ts
│       ├── schemas/user.schema.ts
│       ├── services/user.service.ts
│       ├── types/user.types.ts
│       └── index.ts
├── lib/              # jwt.ts, password.ts, mail.ts, otp.ts, midtrans.ts/stripe.ts
└── shared/
    ├── middleware/   # auth-middleware, error-handler, validate-request, etc.
    ├── types/        # Express augmentation, API response types
    └── utils/        # token.ts, date.ts

## User Model Fields
Standard fields for the `User` model (keep in sync with `schema.prisma`):
- `id`: UUID (String)
- `email`: String (Unique, Lowercase)
- `passwordHash`: String (Nullable for OAuth)
- `firstName`: String (Nullable)
- `lastName`: String (Nullable)
- `avatarUrl`: String (Nullable, auto-fetched from Google)
- `role`: `USER` | `ADMIN` (Default: `USER`)
- `provider`: `LOCAL` | `GOOGLE` (Default: `LOCAL`)
- `isEmailVerified`: Boolean (Default: `false`)
- `twoFactorEnabled`: Boolean (Default: `false`)
- `tokenVersion`: Int (Global session kill switch)
- `isPremium`: Boolean (Premium status)
- `premiumUntil`: DateTime (Expiration)
- `lastLoginAt`: DateTime
- `createdAt`, `updatedAt`
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
  - **Auto-Registration**: New Google users are automatically registered with `provider: GOOGLE`, `isEmailVerified: true`, and **automatic profile picture (avatarUrl) fetching**.
  - **Provider Isolation**: Users authenticated via OAuth cannot use password-based login and vice versa.
  - **State Parameter Protection**: JWT-encoded state parameters prevent CSRF attacks during OAuth flow.
  - **Secure Redirects**: OAuth flow uses secure redirects with proper state verification.
- **Secure Password Reset**:
  - **Hashing**: Reset tokens are hashed with **SHA-256** before being stored in the database. Only the raw token is sent via email.
  - **Short Expiry**: Tokens expire in **15 minutes**.
  - **Obfuscation**: Forgot password requests return a success message even if the email is not found to prevent user enumeration.
- **Role-Based Access Control (RBAC)**:
  - **requireRole Middleware**: Protects admin routes with role checks (403 Forbidden for insufficient permissions).
  - **Admin Features**: Exclusive endpoints for user management (list, role update, delete) accessible only to ADMIN role. List endpoint supports search and pagination.
  - **User Isolation**: Personal endpoints limited to own profile; no global user management for regular users.
- **Premium Access Control**:
  - **requirePremium Middleware**: Protects premium routes with subscription checks (403 Forbidden for non-premium users).
  - **Premium Upgrade Flow**: Users can purchase premium status through payment gateways (Midtrans/Stripe).
  - **Automatic Activation**: Premium status is granted automatically upon successful payment via webhook processing.
  - **Token Refresh**: Premium upgrades trigger token version increment, forcing users to re-authenticate and receive updated tokens.
  - **OAuth Compatibility**: Premium upgrades work for all user types (LOCAL and GOOGLE providers).
- **Structured Logging**: All logs MUST use the `logger` utility from `@/shared/utils/logger`.
- **JSON Format**: Logs are emitted in JSON format for observability and log aggregation compatibility.
- **Request Tracing**: `requestId` is included in all logs (via `requestIdMiddleware`) to correlate logs across the entire request lifecycle.
- **Observability**: Latency (`duration`) and status codes are automatically logged for every HTTP request via `loggerMiddleware`.
- **Prisma Singleton**: Use `prisma` from `@/config/db` only.
- **Payment Webhook Security**:
  - **Signature Verification**: Mandatory validation of webhook payloads using provider-specific signatures (e.g., Midtrans server-key hash or Stripe-Signature header).
  - **Idempotency Check**: Ensure each transaction is processed exactly once by checking the internal `orderId` status before updating.
  - **Public Endpoint**: Webhook routes are excluded from standard `authMiddleware` but must implement strict origin/signature validation.
- **Payment Gateway Integration**:
  - **Dual Gateway Support**: Midtrans (for IDR/Local) and Stripe (for Global/Cards).
  - **Order Types**: Support for GENERAL and PREMIUM_UPGRADE orders with automatic user status updates.
  - **Idempotency**: All updates to `Order` status are idempotent based on the `externalId` or `paymentIntentId`.
  - **Webhook Endpoints**: `/api/v1/payment/webhook` (Midtrans) and `/api/v1/payment/webhook-stripe` (Stripe).
- **Database Transactions**: All critical operations use Prisma Interactive Transactions (`prisma.$transaction`) for ACID compliance:
  - **Payment Webhooks**: Atomic order status updates and premium upgrades
  - **Authentication Flows**: Password resets, changes, and token rotations wrapped in transactions
  - **Administrative Operations**: User deletions and bulk role updates with transaction guarantees
  - **Repository Pattern**: All repository methods accept optional `tx: Prisma.TransactionClient` parameter
  - **Error Handling**: Transaction failures logged with `requestId` for audit trails
- **Rate Limiting & Anti-Brute Force**:
  - **Tiered Strategy**: Three-layer rate limiting for comprehensive API protection against DDoS, brute force, and abuse.
  - **Global Limiter**: 100 requests per 15 minutes per IP address for all `/api/v1/*` endpoints.
  - **Auth Limiter**: 5 requests per 15 minutes per IP address for sensitive authentication endpoints (`/register`, `/login`, `/forgot-password`, `/reset-password`, `/resend-verification`).
  - **Payment Limiter**: 10 requests per 15 minutes per IP address for payment checkout endpoint (`/checkout`).
  - **Error Response**: Rate limit violations return HTTP 429 with `ApiResponse` format containing `error.code: "TOO_MANY_REQUESTS"`.
  - **Storage**: In-memory store suitable for current scale; Redis can be added for horizontal scaling if needed.
  - **Webhook Exclusion**: Payment webhooks (`/webhook*`) are exempt from rate limiting due to existing signature verification.

## Code Standards & Conventions

### Architectural Patterns
- **Subdomain Folder Structure**: Each feature is organized into dedicated subfolders: `controllers/`, `services/`, `repositories/`, `schemas/`, `types/`, and `routes/`. Each subfolder contains only files relevant to that layer.
- **Service Splitting**: Large service files are split by responsibility domain. Each sub-service handles one concern (e.g., `core-auth.service.ts` for session flow, `account.service.ts` for password/email, `two-factor.service.ts` for 2FA, `oauth.service.ts` for OAuth).
- **Services Barrel Export**: Each `services/` folder contains an `index.ts` that re-exports all sub-services, allowing consumers to import from a single path.
- **Singleton Pattern**: Services and repositories use singleton instances exported at the end of their files (e.g., `export const coreAuthService = new CoreAuthService()`).
- **Direct Imports**: Services import repository instances directly via full alias path (e.g., `@/features/auth/repositories/auth.repository`) instead of using dependency injection.
- **Named Exports**: Routers use named exports (e.g., `export const authRouter`) instead of default exports.

### Controller Standards
- Use class methods with explicit `Promise<void>` return types instead of arrow functions.
- Import service instances directly without constructors.
- Use specific Request generics: `Request<Params, ResBody, ReqBody, Cookies>`.
- Use standardized response helpers: `res.apiSuccess(data, message?)` for success responses and `res.apiError(message, code?)` for errors.
- Do not return Response objects - call response helpers without return statements.
- Reference `req.user` as `AuthenticatedUser` interface from `express.d.ts`.

### Service Layer
- **Business Logic Centralization**: Services handle all business rules and validation.
- **Direct Repository Usage**: Reference repository singletons directly.
- **Transaction Management**: Use `prisma.$transaction` for all multi-step database writes.
- **External Calls**: Operations involving external APIs (e.g., Stripe, Mail) should be carefully placed to avoid long-running database transactions.
- **Transaction Context Propagation**: Ensure the transaction client (`tx`) is passed to all internal service calls and repository methods within the same transaction scope.
- **Singleton Export**: Export a singleton instance.

### Repository Layer
- **Database Operations Only**: No business logic should reside here.
- **Transaction Support**: All methods MUST accept an optional `tx: Prisma.TransactionClient` parameter and use it to maintain atomicity when part of a larger transaction.
- **Singleton Export**: Export a singleton instance for direct use in services.
- **Consistent CRUD**: Follow established naming conventions.

### Route Standards
- Import controller instances directly.
- Wrap all handlers with `asyncHandler` for error handling.
- Use `validateRequest` middleware with Zod schemas.
- Apply appropriate middleware (auth, role, premium) before handlers.
- Use named exports for router instances.

### Import Conventions
- **Path Aliases**: Always use `@/` aliases for internal imports:
  - `@/config/*` → `src/config/*`
  - `@/features/*` → `src/features/*`
  - `@/lib/*` → `src/lib/*`
  - `@/shared/*` → `src/shared/*`
- **Import Order**: Group imports by external libraries first, then internal modules.
- **No Relative Paths**: Never use `../` or `./` for internal imports.
- **No Manual Logging**: `console.log` and `console.error` are forbidden. Always use the `logger` utility from `@/shared/utils/logger` to ensure logs are structured (JSON) and contain trace IDs.

### TypeScript Guidelines

#### Strict Type Safety
- Use specific Request generics in controllers: `Request<Params, ResBody, ReqBody, Cookies>`
- Ensure `req.user` refers to the `AuthenticatedUser` interface from `express.d.ts`.
- Avoid `any` - use proper Prisma types or inferred Zod types.
- Define interfaces in separate `*.types.ts` files.
- Use union types for multiple possible values instead of `any`.

#### Schema Validation
Centralized Zod schemas in `*.schema.ts` for all request data (body, query, params).
```typescript
export const exampleSchema = z.object({
  body: z.object({ ... }),
  params: z.object({ ... })
});
export type ExampleInput = z.infer<typeof exampleSchema>['body'];
```

#### File Structure Standards
- **Feature Subfolders**: Each feature contains dedicated subdirectories. Never place feature files at the root of a feature folder:
  - `controllers/` → `*.controller.ts` - Request/response handling
  - `services/` → `*.service.ts` - Business logic (one file per responsibility)
  - `repositories/` → `*.repository.ts` - Database operations
  - `schemas/` → `*.schema.ts` - Zod validation schemas
  - `types/` → `*.types.ts` - TypeScript interfaces
  - `routes/` → `*.routes.ts` - Route definitions and middleware
  - `index.ts` at feature root - Public API barrel export
- **Import Paths**: When importing from within the same feature, always use full alias paths (e.g., `@/features/auth/repositories/auth.repository`), never relative paths.
- **Cross-Feature Imports**: When a feature needs another feature's repository or service, import it via its full alias path (e.g., `@/features/user/repositories/user.repository`).
- **Services `index.ts`**: The `services/index.ts` must re-export all sub-services in the folder so controllers can selectively import specific services.
- **Index Files**: Feature `index.ts` exports all public APIs: types, repository singleton, service singletons, and router.
- **No Comments**: Avoid unnecessary comments - code should be self-documenting.

### Error Handling
- **Global Handler**: All errors are centralized in `src/shared/middleware/error-handler.ts`.
- **Async Wrapper**: All route handlers MUST be wrapped with `asyncHandler` to ensure errors are caught and passed to the global handler.
- **Service Layer Errors**: Services MUST NEVER throw generic `Error`. They must use specialized subclasses from `@/shared/middleware/error-handler`:
    - `BadRequestError`: For invalid input or invalid client state (Code: `BAD_REQUEST`).
    - `UnauthorizedError`: For authentication failures (Code: `UNAUTHORIZED`).
    - `ForbiddenError`: For insufficient permissions (Code: `FORBIDDEN`).
    - `NotFoundError`: When a resource/record does not exist (Code: `NOT_FOUND`).
    - `ConflictError`: For duplicate data or state conflicts (Code: `CONFLICT`).
    - `AppError`: For other operational errors requiring custom status codes and unique string codes.
- **Prisma Integration**: Common Prisma errors (e.g., `P2002` - Duplicate, `P2025` - Not Found) are automatically mapped to structured responses by the global handler.
- **No Manual Try-Catch**: Avoid `try-catch` blocks in controllers; let the `asyncHandler` and global error middleware handle it.


### Security Best Practices
- Never log sensitive data (passwords, tokens, keys).
- Use environment variables for all secrets.
- Implement proper input validation with Zod schemas.
- Follow the established authentication and authorization patterns.

## API Routes

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
/api/v1/content/exclusive - Premium-only content (requires PREMIUM status)
/health                  - Health check
```

## API Response Format

All API endpoints return responses in a standardized JSON format using the `ApiResponse<T>` interface:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { 
    "user": { "id", "email", ..., "lastLoginAt", "tokenVersion", "avatarUrl", "createdAt" },
    "tokens": { "accessToken", ... }
  },
  "error": null
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "data": null,
  "error": {
    "code": "ERROR_CODE"
  }
}
```

### Paginated Response
For endpoints that return lists of items, the `data` field contains pagination metadata using `PaginatedResponse<T>`:
```json
{
  "success": true,
  "message": "Items retrieved successfully",
  "data": {
    "items": [ ... ],
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  },
  "error": null
}
```

### Response Helpers
Controllers use the following standardized helpers provided by `responseHandlerMiddleware`:
- `res.apiSuccess<T>(data: T, message?: string)` - Creates success responses
- `res.apiError(message: string, code?: string)` - Creates error responses
- `createPaginatedResponse<T>()` - Wraps paginated data for admin endpoints

## Integration Notes (for Frontend)

### Authentication Strategy
1. **Hybrid Tokens**: Backend issues `accessToken` (JSON) and `refreshToken` (HTTP-Only Cookie).
2. **Cookie Options**: `refreshToken` is set with `httpOnly: true`, `secure: true` (in prod), `sameSite: 'strict'`, and `path: '/'`.
3. **Token Versioning**: `tokenVersion` increments on critical changes (password change, premium upgrade), forcing all sessions to re-authenticate upon their next refresh.
4. **CORS**: `FRONTEND_URL` must be correctly set in `.env` to allow cross-origin requests from the frontend.
5. **Google OAuth**: Redirects back to `${FRONTEND_URL}/auth-success?token=${accessToken}` after successful login.