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
├── config/          # env.ts (Zod validation), db.ts (Prisma singleton)
├── features/
│   ├── auth/         # auth.controller, auth.service, auth.repository, auth.schema, auth.types
│   └── user/         # user.controller, user.service, user.repository, user.schema, user.types
├── lib/              # jwt.ts, password.ts, mail.ts, otp.ts
└── shared/
    ├── middleware/   # auth-middleware, error-handler, validate-request, etc.
    ├── types/        # Express augmentation, API response types
    └── utils/        # token.ts, date.ts
```

## Key Patterns

- **Repository pattern**: Data access isolated in `*.repository.ts`
- **Service layer**: Business logic in `*.service.ts` 
- **Zod schemas**: Request validation in `*.schema.ts` files
- **Prisma singleton**: Use `prisma` from `@/config/db` (prevents connection exhaustion)
- **Environment validation**: All env vars validated at startup via `env.ts`

## TypeScript Guidelines

### Schema Organization
- All Zod schemas are centralized in `*.schema.ts` files within each feature
- Schema files export both the schema objects and their inferred TypeScript types
- Use proper ES6 imports instead of `require()` for all dependencies

### Schema Validation
Use Zod schemas with `{ body: z.object({...}) }` structure:
```typescript
export const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }),
});

// Export inferred types for use in controllers
export type RegisterInput = z.infer<typeof registerSchema>['body'];
```

### Middleware Usage
```typescript
// Validate request with schema
validateRequest(registerSchema)

// Auth middleware for protected routes
authMiddleware

// Async handler for route controllers
asyncHandler(async (req, res) => { ... })
```

### User Type Handling
Prisma returns `role` and `provider` as objects `{ name: string }`. Handle appropriately:
```typescript
// In services, cast appropriately
role: user.role as string
// Or handle both string and object
const roleValue = typeof user.role === 'string' ? user.role : (user.role as any).name;
```

### TypeScript Improvements (Latest)
- **ES6 Imports**: All code now uses proper ES6 imports instead of `require()` calls
- **Schema Files**: All features now have dedicated `*.schema.ts` files with Zod validation schemas
- **Type Exports**: Schema files export inferred TypeScript types for better type safety
- **Type Assertions**: Controllers use proper type assertions for validated request data
- **Consistent Architecture**: All features follow the same pattern: controller, service, repository, schema, types

## Database

- **Provider**: PostgreSQL (Neon or local via Docker)
- **Schema**: `prisma/schema.prisma`
- **Models**: User, EmailVerificationToken, PasswordResetToken, RefreshToken

## API Routes

```
/api/v1/auth/*  - Authentication endpoints (login, register, refresh, 2FA, etc.)
/api/v1/auth/me - Get current user
/api/v1/auth/change-password - Change password (authenticated)
/api/v1/user/* - User management endpoints
/health         - Health check
```