# BharatConnect — Full-stack starter

India-inspired, responsive social platform prototype with a Django REST Framework API and PostgreSQL data model.

## Stack
- React + Vite + Tailwind CSS frontend
- Django REST Framework API
- PostgreSQL
- JWT access/refresh tokens
- Docker Compose for local PostgreSQL

## Run it
Follow `backend/README.md` for full instructions.

Quick path:
1. `docker compose up -d postgres`
2. In `backend/`: create a virtual environment, `pip install -r requirements.txt`, copy `.env.example` to `.env`, update the local `DATABASE_URL`, then run `python manage.py makemigrations social`, `python manage.py migrate`, and `python manage.py runserver`.
3. In the project root: `npm install`, create `.env` with `VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1`, then `npm run dev`.

## Connected features
- Register and login modal
- JWT-authenticated API requests
- PostgreSQL-backed post creation
- Home feed loaded from the API
- Like/unlike for backend posts
- Demo fallback when API is not running

## Prototype vs production
The starter is not yet production-certified. It still needs email verification, password reset, secure production session strategy, media storage, follow APIs, notifications, moderation, deletion/retention workflows, observability, load/security tests, and operational recovery procedures. Read `backend/README.md` before deploying.
