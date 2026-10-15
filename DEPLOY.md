# BharatConnect — Production Deployment Guide

This guide covers deploying the BharatConnect backend on **Railway** (Django + PostgreSQL) and the frontend on **Vercel** (React + Vite).

---

## Prerequisites

- GitHub account with this repo pushed to it
- [Railway account](https://railway.app) (free tier works for prototypes)
- [Vercel account](https://vercel.com) (free tier works)
- Python 3.11+ installed locally (for generating the secret key)

---

## Step 1: Push to GitHub

```bash
# From the project root
git init                          # skip if already a git repo
git add .
git commit -m "chore: production deployment config"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/bharatconnect.git
git push -u origin main
```

---

## Step 2: Deploy Backend on Railway

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
2. Select your `bharatconnect` repository.
3. When Railway asks for a **Root Directory**, enter `/backend`.
4. Railway will detect the `Procfile` and `requirements.txt` automatically.

### Add PostgreSQL

5. In your Railway project dashboard, click **+ New** → **Database** → **Add PostgreSQL**.
6. Railway automatically injects `DATABASE_URL` into your service — no manual copy needed.

### Set Environment Variables

In your Railway backend service → **Variables** tab, add:

| Variable | Value |
|---|---|
| `DJANGO_SECRET_KEY` | *(see Generating a Secret Key below)* |
| `DJANGO_DEBUG` | `False` |
| `DJANGO_ALLOWED_HOSTS` | `yourapp.up.railway.app` |
| `CORS_ALLOWED_ORIGINS` | `https://yourapp.vercel.app` |
| `CSRF_TRUSTED_ORIGINS` | `https://yourapp.vercel.app` |
| `LOG_LEVEL` | `INFO` |

> **Note:** Replace `yourapp` with the actual subdomain Railway assigns. You can find it under your service's **Settings → Domains**.

7. Railway will run `build.sh` automatically on every deploy: installs dependencies, runs `collectstatic`, then `migrate`.
8. Once deployed, copy your **Railway public URL** (e.g. `https://bharatconnect-production.up.railway.app`).

---

## Step 3: Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → **Import Git Repository**.
2. Select your `bharatconnect` repository.
3. Leave **Root Directory** as `/` (the project root — `vercel.json` is there).
4. Vercel will auto-detect the Vite framework.

### Set Environment Variables

In Vercel → **Settings** → **Environment Variables**, add:

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://yourapp.up.railway.app/api/v1` |

> Use your actual Railway URL here.

5. Click **Deploy**. Vercel runs `npm run build` and serves the `dist/` folder.

---

## Step 4: Post-Deploy Checklist

After both services are live, verify end-to-end:

- [ ] `GET https://yourbackend.up.railway.app/api/v1/health/` → returns `{"status": "ok"}`
- [ ] Register a new user via the frontend
- [ ] Log in and receive JWT tokens
- [ ] Create a post — it should appear in the feed
- [ ] Verify both URLs use HTTPS (the browser padlock)
- [ ] Check Railway logs for any 5xx errors

---

## Generating a Secret Key

Run this locally to get a strong 50-character secret:

```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

Paste the output as the value of `DJANGO_SECRET_KEY` in Railway. **Never commit this value to git.**

---

## Environment Variables Reference

### Backend (Railway)

| Variable | Required | Description |
|---|---|---|
| `DJANGO_SECRET_KEY` | **Yes** | Strong random secret, min 50 chars |
| `DJANGO_DEBUG` | **Yes** | Must be `False` in production |
| `DATABASE_URL` | **Yes** | Auto-provided by Railway PostgreSQL plugin |
| `DJANGO_ALLOWED_HOSTS` | **Yes** | Comma-separated list of allowed hostnames |
| `CORS_ALLOWED_ORIGINS` | **Yes** | Full origin URL of your Vercel frontend |
| `CSRF_TRUSTED_ORIGINS` | **Yes** | Same as CORS_ALLOWED_ORIGINS |
| `ACCESS_TOKEN_MINUTES` | No | JWT access token lifetime (default: 20) |
| `REFRESH_TOKEN_DAYS` | No | JWT refresh token lifetime (default: 7) |
| `LOG_LEVEL` | No | Root log level (default: INFO) |
| `DJANGO_LOG_LEVEL` | No | Django framework log level (default: WARNING) |
| `CONN_MAX_AGE` | No | DB connection pool timeout in seconds (default: 60) |

### Frontend (Vercel)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | **Yes** | Full URL to Railway backend + `/api/v1` |

---

## Troubleshooting

**CORS errors in browser?**  
Double-check that `CORS_ALLOWED_ORIGINS` in Railway exactly matches the Vercel URL (including `https://`, no trailing slash).

**`DisallowedHost` error?**  
Add your Railway domain to `DJANGO_ALLOWED_HOSTS` in Railway environment variables.

**502 on first deploy?**  
Railway health-checks `/api/v1/health/` — if that endpoint doesn't exist in your URL config, either add it or remove `healthcheckPath` from `railway.json`.

**Migrations not running?**  
`build.sh` runs `python manage.py migrate` on every deploy. Check Railway build logs for errors.
