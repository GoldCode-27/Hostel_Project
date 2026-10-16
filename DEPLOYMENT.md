# Deployment Guide

This project has two deployable apps:

- `backend`: Express API for auth, rooms, billing, Chapa, etc.
- `frontend`: Vite React app.

## 1. Push To GitHub

Create a new GitHub repository, then run these commands from the project root:

```bash
git init
git add .
git commit -m "Prepare hostel management system for deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

Do not commit `.env` files. The root `.gitignore` already excludes them.

## 2. Deploy Backend On Vercel

Create a new Vercel project from the same GitHub repo.

Use these settings:

- Root Directory: `backend`
- Framework Preset: `Other`
- Build Command: leave empty
- Output Directory: leave empty

Add backend environment variables in Vercel:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_random_secret
CHAPA_SECRET_KEY=your_chapa_secret_key
CHAPA_API_BASE_URL=https://api.chapa.co/v1
CHAPA_CURRENCY=ETB
BACKEND_URL=https://your-backend-project.vercel.app
FRONTEND_URL=https://your-frontend-project.vercel.app
```

After deploy, your backend URL will look like:

```text
https://your-backend-project.vercel.app
```

Test:

```text
https://your-backend-project.vercel.app/
```

It should say the Hostel Management API is running.

## 3. Deploy Frontend On Vercel

Create another Vercel project from the same GitHub repo.

Use these settings:

- Root Directory: `frontend`
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

Add frontend environment variable:

```env
VITE_API_BASE_URL=https://your-backend-project.vercel.app/api
VITE_BILLING_CURRENCY=ETB
```

Deploy it. Your frontend URL will look like:

```text
https://your-frontend-project.vercel.app
```

## 4. Chapa Callback Notes

Set `BACKEND_URL` to the public backend URL so Chapa can reach the payment callback. The customer return URL is the billing page on the frontend:

```text
https://your-frontend-project.vercel.app/dashboard/billing
```

Use a valid Chapa secret key and ensure `CHAPA_CURRENCY` matches the currency enabled for your Chapa account. Keep `VITE_BILLING_CURRENCY` aligned with it.
