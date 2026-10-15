# BharatConnect implementation update

## Included in this update
- Preserved the existing React/Vite and Django REST Framework project structure.
- Added Django `.env` loading with `python-dotenv` and a production guard against the default development secret.
- Added API endpoints for post replies, bookmarks, following/unfollowing, user search, notification listing, and marking notifications read.
- Added notification creation for post likes, replies, and new follows.
- Wired the frontend reply composer to the replies API, bookmarks to persistent bookmark endpoints, and notifications to the backend.
- Updated the visual accent system toward BharatConnect's saffron, ivory, and emerald identity.
- Kept the existing migration history and database intact.

## Local setup
1. Copy `backend/.env.example` to `backend/.env`.
2. Set a strong `DJANGO_SECRET_KEY`, local `DJANGO_DEBUG=True`, `DATABASE_URL` matching your local PostgreSQL role/password, and `CORS_ALLOWED_ORIGINS=http://localhost:5173`.
3. Backend: activate your venv, install `backend/requirements.txt`, run `python manage.py check`, `python manage.py migrate`, then `python manage.py runserver`.
4. Frontend: from project root run `npm ci`, then `npm run dev`.

## Not yet production-complete
This is an implementation increment, not a claim of complete production readiness. Direct messaging, media uploads/storage, a fully data-driven profile editor, complete automated test coverage, deployment infrastructure, monitoring, and a final security review still require implementation and verification. Demo/fallback feed content may still appear when the API is unavailable. Run the project tests and verify each workflow against your own local database before deployment.

## Security
The source archive deliberately excludes `.env`, `.venv`, `node_modules`, build output, and Python cache files. Never commit real secrets. If credentials from an earlier `.env` were shared outside your machine, rotate them.
