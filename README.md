# Auth System

A secure, feature-based Node.js/TypeScript authentication system built with Express, Prisma, PostgreSQL (Neon), JWT, and 2FA support.

## Description

This authentication system provides a robust foundation for user management with features like email verification, password reset, two-factor authentication, and secure token management. It uses a hybrid JWT strategy with access and refresh tokens, and includes role-based access control.

## Features

- 🔐 User registration and login with email verification
- 📧 Password reset functionality
- 🔑 JWT-based authentication with access and refresh tokens
- 🛡️ Two-factor authentication (2FA) with TOTP
- 🌐 OAuth integration (Google)
- 👤 Role-based access control (User/Admin)
- 🔄 Token rotation and revocation
- 📱 Session management with device tracking
- 🚀 Feature-based architecture for scalability

## Tech Stack

- **Backend**: Node.js, TypeScript, Express
- **Database**: PostgreSQL (via Neon), Prisma ORM
- **Authentication**: JWT, bcryptjs, otplib
- **Email**: Nodemailer
- **Validation**: Zod
- **Development**: ts-node-dev, ESLint

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database (Neon recommended)
- Docker (optional, for local PostgreSQL)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd auth-system
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the database:
   - Start PostgreSQL via Docker (optional):
     ```bash
     docker compose up -d
     ```
   - Or use a cloud database like Neon

4. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. Set up the database schema:
   ```bash
   npm run prisma:generate
   npm run prisma:push
   ```

## Configuration

Create a `.env` file based on `.env.example` with the following variables:

### Database
- `DATABASE_URL`: PostgreSQL connection string

### JWT
- `JWT_ACCESS_SECRET`: Secret key for access tokens (min 32 chars)
- `JWT_REFRESH_SECRET`: Secret key for refresh tokens (min 32 chars)
- `JWT_ACCESS_EXPIRY`: Access token expiry (default: "15m")
- `JWT_REFRESH_EXPIRY`: Refresh token expiry (default: "7d")

### Email (SMTP)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`: SMTP configuration
- `SMTP_USER`, `SMTP_PASS`: Email credentials
- `SMTP_FROM`: Sender email address

### OAuth (Google)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google OAuth credentials
- `GOOGLE_CALLBACK_URL`: OAuth callback URL

### Application
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 3000)
- `FRONTEND_URL`: Frontend application URL

### 2FA
- `TWO_FACTOR_APP_NAME`: App name for 2FA (default: "AuthSystem")

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Linting
```bash
npm run lint
```

## API Endpoints

### Authentication (`/api/v1/auth`)
- `POST /register` - User registration
- `POST /verify-email` - Email verification
- `POST /login` - User login
- `POST /refresh` - Refresh access token
- `POST /logout` - User logout
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password
- `POST /enable-2fa` - Enable 2FA
- `POST /verify-2fa` - Verify 2FA code
- `POST /disable-2fa` - Disable 2FA
- `GET /google` - Google OAuth login
- `GET /google/callback` - Google OAuth callback
- `GET /me` - Get current user info

### User Management (`/api/v1/user`)
- `GET /` - Get user profile
- `PUT /` - Update user profile
- `DELETE /` - Delete user account

### Health Check
- `GET /health` - Application health check

## Project Structure

```
src/
├── config/          # Environment and database configuration
├── features/
│   ├── auth/        # Authentication module
│   │   ├── auth.routes.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.repository.ts
│   │   ├── auth.schema.ts
│   │   └── auth.types.ts
│   └── user/         # User management module
├── lib/             # Utility libraries (JWT, password, mail, OTP)
├── shared/
│   ├── middleware/  # Express middlewares
│   ├── types/       # Shared TypeScript types
│   └── utils/       # Utility functions
└── server.ts        # Application entry point
```

## Security Features

- **Hybrid Token Strategy**: Access tokens in JSON body, refresh tokens in HTTP-only cookies
- **Token Rotation**: Refresh tokens are rotated on each use
- **Global Revocation**: `tokenVersion` for instant session invalidation
- **Specific Revocation**: Individual refresh token revocation
- **Password Security**: bcryptjs hashing with salt rounds
- **Input Validation**: Zod schemas for all request data
- **CORS Protection**: Configured CORS policies

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

MIT License - see the LICENSE file for details.