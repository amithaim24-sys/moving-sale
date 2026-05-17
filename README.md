# Moving Sale

A bilingual (Hebrew / English) marketplace for selling or giving away items before a move. Built with Next.js 15, NextAuth (Google), Prisma + Postgres, Cloudinary, and Tailwind.

## Features

- Public catalog with type filter (For sale / Free) and search
- Item detail page with one-tap **WhatsApp** contact (`wa.me` deep link, works on phone and desktop)
- Multi-image upload directly to Cloudinary (server only signs requests)
- "Sell" or "Give away" toggle — Free badge when giving
- Google sign-in; first registered user becomes ADMIN automatically
- User dashboard: profile, my items, create/edit/delete
- Admin dashboard: moderate all items, promote/demote/ban users
- Hebrew (RTL) + English (LTR) with a language toggle
- Mobile-first responsive design (44px tap targets, sticky WhatsApp button on mobile)

## Deploy publicly

See **[DEPLOY.md](DEPLOY.md)** — full step-by-step guide for Vercel + Neon + Cloudinary + Google OAuth (all free tiers).

## Local development

```powershell
pnpm install
cp .env.example .env       # fill in DATABASE_URL, Google + Cloudinary keys
pnpm prisma migrate dev    # creates Postgres tables
pnpm dev                   # http://localhost:3000
```

## Tech stack

- **Next.js 15** App Router + React 19
- **NextAuth v5** with Google provider, Prisma adapter, database sessions
- **Prisma 5** ORM with **Postgres** (Neon recommended)
- **Cloudinary** for image storage (signed direct browser uploads)
- **next-intl** for i18n + RTL
- **Tailwind CSS** for styling
