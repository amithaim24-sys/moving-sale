# Deploying Moving Sale publicly

The fastest path: **Vercel** (hosting) + **Neon** (Postgres) + **Cloudinary** (images) + **Google OAuth** (sign-in). All have free tiers — total cost: $0.

---

## 1. Create accounts (5 min, free)

| Service | Sign up | What you need from it |
|---|---|---|
| [Neon](https://neon.tech) | Google login | The `DATABASE_URL` connection string (Dashboard → Connection Details → Pooled connection) |
| [Cloudinary](https://cloudinary.com/users/register_free) | Email | Cloud name, API key, API secret (Dashboard → "Product Environment Credentials") |
| [Google Cloud Console](https://console.cloud.google.com/apis/credentials) | Google | OAuth client ID + secret (see step 3) |
| [Vercel](https://vercel.com/signup) | GitHub login | Hosting + a `*.vercel.app` URL |

---

## 2. Push the code to GitHub

```powershell
cd C:\Users\amit\claude\moving-sale
git init
git add .
git commit -m "Initial commit"
gh repo create moving-sale --public --source . --push
```

(Or use the GitHub web UI to create the repo and push manually.)

---

## 3. Create the Google OAuth client

1. Go to https://console.cloud.google.com/apis/credentials
2. **Create credentials → OAuth client ID → Web application**
3. Set:
   - **Authorized JavaScript origins**: `https://<your-app>.vercel.app`
   - **Authorized redirect URIs**: `https://<your-app>.vercel.app/api/auth/callback/google`
4. Copy the **Client ID** and **Client secret**.

> You can leave `http://localhost:3000` and `http://localhost:3000/api/auth/callback/google` in the same client too, so the same credentials work locally and in prod.

---

## 4. Deploy to Vercel

1. Go to https://vercel.com/new and **import** the GitHub repo.
2. Framework: **Next.js** (auto-detected).
3. Under **Environment Variables**, paste all of these:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | Neon pooled connection string (must end with `?sslmode=require`) |
   | `AUTH_SECRET` | Run `openssl rand -base64 32` and paste the result |
   | `AUTH_URL` | `https://<your-app>.vercel.app` |
   | `AUTH_TRUST_HOST` | `true` |
   | `AUTH_GOOGLE_ID` | from Google Cloud Console |
   | `AUTH_GOOGLE_SECRET` | from Google Cloud Console |
   | `CLOUDINARY_CLOUD_NAME` | from Cloudinary dashboard |
   | `CLOUDINARY_API_KEY` | from Cloudinary dashboard |
   | `CLOUDINARY_API_SECRET` | from Cloudinary dashboard |
   | `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | same as `CLOUDINARY_CLOUD_NAME` |
   | `NEXT_PUBLIC_CLOUDINARY_UPLOAD_FOLDER` | `moving-sale` |

4. Click **Deploy**. The build runs `prisma migrate deploy` automatically (creates all tables in Neon), then builds Next.js.

---

## 5. First sign-in = admin

Visit `https://<your-app>.vercel.app/he`, click **Sign in**, log in with the Google account that should be the admin. The very first user to register is auto-promoted to ADMIN (see `src/lib/auth.ts` → `events.createUser`).

Then: go to **Profile**, set your WhatsApp number (e.g. `+972501234567`), and start adding items.

---

## 6. Sharing with others

- Send the URL `https://<your-app>.vercel.app` — visitors can browse without an account.
- Anyone who wants to **post** items signs in with Google and posts their own.
- You (the admin) can promote others to admin or ban abusive users at `/he/admin/users`.

---

## Updating later

```powershell
git add .
git commit -m "..."
git push
```
Vercel auto-deploys every push to `main`. Migrations are applied automatically because of the build command.

---

## Local dev against the same Postgres

You can point your local `.env`'s `DATABASE_URL` at the same Neon database (or a dedicated `dev` branch in Neon). Then:

```powershell
pnpm install
pnpm prisma migrate dev   # generates a migration when you change schema.prisma
pnpm dev
```
