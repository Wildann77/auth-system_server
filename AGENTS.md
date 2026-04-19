# AGENTS.md

## Project Overview
Node.js/TypeScript authentication system using Express, Prisma (PostgreSQL/Neon), JWT, 2FA, Google OAuth, and premium subscription features. Feature-based architecture.

## Commands

```bash
bun run dev              # Development server (ts-node-dev with hot reload)
bun run build            # TypeScript compilation to dist/
bun run start            # Run compiled server from dist/
bun run lint             # ESLint on src/

# Prisma (run after schema changes)
bun run prisma:generate  # Generate Prisma client
bun run prisma:push      # Push schema to database
bun run prisma:migrate   # Run migrations
```

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
│   ├── admin/        # routes, controller, service, repository, schema, types
│   ├── auth/         # routes, controller, service, repository, schema, types
│   ├── user/         # routes, controller, service, repository, schema, types
│   ├── payment/      # routes, controller, service, repository, schema, types
│   └── content/      # routes, controller, service, repository, schema, types
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
- **Feature-Based Architecture**: Each feature (auth, user, admin, payment, content) is self-contained with routes, controller, service, repository, schema, and types files.
- **Singleton Pattern**: Services and repositories use singleton instances exported at the end of their files (e.g., `export const authService = new AuthService()`).
- **Direct Imports**: Services import repository instances directly instead of using dependency injection constructors.
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
- **Feature Files**: Each feature folder contains consistent files:
  - `*.routes.ts` - Route definitions and middleware
  - `*.controller.ts` - Request/response handling
  - `*.service.ts` - Business logic
  - `*.repository.ts` - Database operations
  - `*.schema.ts` - Zod validation schemas
  - `*.types.ts` - TypeScript interfaces
  - `index.ts` - Module exports
- **Index Files**: Export all public APIs using `export * from './file'` pattern.
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
  "data": { ... },
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