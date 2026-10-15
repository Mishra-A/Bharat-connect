# BharatConnect Django API

## Prerequisites
- Python 3.11+
- Node.js 18+
- Docker Desktop (recommended for local PostgreSQL)

## 1. Start PostgreSQL
From the project root:
```bash
docker compose up -d postgres
```
The local database is `bharatconnect`, username `bharatconnect`, password `change-me-local-only`.

## 2. Start the API
```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.venv\\Scripts\\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env
```
On macOS/Linux, use `cp .env.example .env`. Make sure the `DATABASE_URL` password matches the local Docker password:
`postgresql://bharatconnect:change-me-local-only@localhost:5432/bharatconnect`

Then:
```bash
python manage.py makemigrations social
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000
```
API health check: `http://127.0.0.1:8000/api/v1/health/`

## 3. Start the frontend
Open a second terminal at the project root:
```bash
npm install
```
Create a root `.env` file:
```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```
Then:
```bash
npm run dev
```
Open the Vite URL (usually `http://localhost:5173`).

## API endpoints
- `POST /api/v1/auth/register/` — `{username,email,password,display_name,preferred_language}`
- `POST /api/v1/auth/login/` — `{username,password}`; username can be email
- `POST /api/v1/auth/refresh/` — `{refresh}`
- `GET/PATCH /api/v1/users/me/`
- `GET /api/v1/feed/home/?limit=20`
- `GET/POST /api/v1/posts/`
- `GET/DELETE /api/v1/posts/{uuid}/`
- `PUT/DELETE /api/v1/posts/{uuid}/like/`

Authenticated endpoints use `Authorization: Bearer <access-token>`.

## Important implementation notes
- This is a functional development starter, not a fully production-certified service.
- This starter stores JWTs in browser localStorage for convenience. For a public production service, prefer secure HttpOnly cookie-based sessions or another carefully reviewed token storage design, plus CSRF protections where applicable.
- Registration does not yet verify email/phone; password reset, MFA, account deletion workflow, content reporting/moderation, media uploads, follow endpoints, and notification delivery are not yet implemented.
- Before public launch, set a strong `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=False`, restrictive allowed hosts and CORS origins, HTTPS, secure cookies, proper secrets management, rate limits, security tests, backups and restore tests.
- Review Indian privacy/intermediary obligations with qualified counsel before launch.
