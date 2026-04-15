# AGENTS.md

## Project Overview
Node.js/TypeScript authentication system using Express, Prisma (PostgreSQL/Neon), JWT, and 2FA. Feature-based architecture.

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

1. Copy `.env.example` to `.env` and fill in all required variables
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
│   ├── auth/         # routes, controller, service, repository, schema, types
│   └── user/         # routes, controller, service, repository, schema, types
├── lib/              # jwt.ts, password.ts, mail.ts, otp.ts
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
- **Prisma Singleton**: Use `prisma` from `@/config/db` only.

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

## API Routes

```
/api/v1/auth/*  - Authentication endpoints (login, register, refresh, 2FA, etc.)
/api/v1/auth/me - Get current user (Based on accessToken cookie/header)
/api/v1/user/* - User management endpoints
/health         - Health check
```