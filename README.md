# CertiChain Certificate System

Production-ready certificate issuance and verification system with:

- React/Vite frontend
- Express/MongoDB backend
- Hardhat Solidity certificate registry
- Render deployment config

## Local Setup

Install each workspace:

```bash
npm run install:all
```

Create env files:

```bash
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
copy smart-contract\.env.example smart-contract\.env
```

Start local development:

```bash
npm run dev:backend
npm run dev:frontend
```

Run checks:

```bash
npm test
npm run build
```

## Required Backend Env

`backend/.env`:

```bash
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/certificate_system
JWT_SECRET=change_this_to_a_long_random_secret
JWT_EXPIRES_IN=12h
ALLOWED_STUDENT_DOMAIN=@rub.edu.bt
ADMIN_EMAIL=admin@college.edu
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change_admin_password
CHAIN_RPC_URL=http://127.0.0.1:8545
CERTIFICATE_REGISTRY_ADDRESS=0x...
ISSUER_PRIVATE_KEY=0x...
EMAIL_API_PROVIDER=brevo
EMAIL_API_KEY=your_brevo_api_key
EMAIL_API_URL=
BREVO_API_KEY=
RESEND_API_KEY=
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_FAMILY=4
SMTP_CONNECTION_TIMEOUT_MS=10000
SMTP_GREETING_TIMEOUT_MS=10000
SMTP_SOCKET_TIMEOUT_MS=20000
SMTP_USER=no-reply@example.com
SMTP_PASS=your_smtp_password
SMTP_FROM="CertiChain <no-reply@example.com>"
```

## Required Frontend Env

`frontend/.env`:

```bash
VITE_API_BASE_URL=/api
VITE_CHAIN_RPC_URL=http://127.0.0.1:8545
VITE_CERTIFICATE_REGISTRY_ADDRESS=0x...
VITE_CHAIN_ID=31337
VITE_CERTIFICATE_REGISTRY_DEPLOYMENT_BLOCK=
VITE_EVENT_LOOKBACK_BLOCKS=10
VITE_EVENT_QUERY_CHUNK_BLOCKS=10
```

For Sepolia, use `VITE_CHAIN_ID=11155111`. If your RPC rejects large event
queries, set `VITE_CERTIFICATE_REGISTRY_DEPLOYMENT_BLOCK` to the block where the
registry contract was deployed. Without it, the frontend scans the most recent
`VITE_EVENT_LOOKBACK_BLOCKS` blocks. Alchemy Free currently limits
`eth_getLogs` ranges, so keep `VITE_EVENT_QUERY_CHUNK_BLOCKS=10` unless your RPC
plan supports larger log ranges.

## Deployment

`render.yaml` is configured for a single Render web service. It builds the frontend, serves it from the backend, and exposes the API under `/api`.

Before deploy, configure these Render environment variables:

- `MONGODB_URI`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `CHAIN_RPC_URL`
- `CERTIFICATE_REGISTRY_ADDRESS`
- `ISSUER_PRIVATE_KEY`
- `VITE_CHAIN_RPC_URL`
- `VITE_CERTIFICATE_REGISTRY_ADDRESS`
- `VITE_CHAIN_ID`
- `VITE_CERTIFICATE_REGISTRY_DEPLOYMENT_BLOCK`
- `VITE_EVENT_LOOKBACK_BLOCKS`
- `VITE_EVENT_QUERY_CHUNK_BLOCKS`
- `EMAIL_API_PROVIDER`
- `EMAIL_API_KEY`
- `EMAIL_API_URL`
- `BREVO_API_KEY`
- `RESEND_API_KEY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_FAMILY`
- `SMTP_CONNECTION_TIMEOUT_MS`
- `SMTP_GREETING_TIMEOUT_MS`
- `SMTP_SOCKET_TIMEOUT_MS`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

The Render health check is `/api/health`.

## Data Storage

MongoDB stores application data:

- admin and student user accounts
- reusable certificate templates
- account-bound student certificate addresses

The blockchain stores issued certificate proof data:

- certificate hash
- NFT token ID
- student certificate address
- issued/revoked status
- token URI metadata

Template CRUD is served by authenticated admin endpoints under `/api/templates`.

Student certificate addresses are assigned by the backend after email OTP signup
verification. The address is generated from the verified student email and a backend-only
secret, saved on the student record, and reused whenever certificates are issued by email.
Students can copy the address from their dashboard, but they cannot replace it later.

Student registration and password reset use email OTP verification. The backend stores
pending OTPs with hashed codes for 10 minutes, sends the code through a transactional
email API such as Brevo or Resend, and only
creates the student account after `/api/auth/signup/verify` succeeds or updates the
password after `/api/auth/password-reset/verify` succeeds. In non-production
development without email delivery configured, the API returns `otpPreview` so local testing can
continue without an email provider.

For Render deployment, prefer `EMAIL_API_PROVIDER=brevo` plus `EMAIL_API_KEY` or
`BREVO_API_KEY` because HTTPS email APIs avoid SMTP port timeouts. SMTP settings remain
available as a fallback for local or hosting environments where outbound SMTP works.

Student certificate addresses are generated server-side. The app does not expose student
private keys or require students to connect a third-party wallet provider.

## Smart Contract

Compile and test:

```bash
npm run compile --prefix smart-contract
npm test --prefix smart-contract
```

Deploy locally:

```bash
npm run node --prefix smart-contract
npm run deploy:local --prefix smart-contract
```

After deploying, copy the contract address into:

- `backend/.env` as `CERTIFICATE_REGISTRY_ADDRESS`
- `frontend/.env` as `VITE_CERTIFICATE_REGISTRY_ADDRESS`
