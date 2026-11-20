# Postmark Email Workspace

A single-owner email dashboard built with Next.js App Router, TypeScript, Tailwind, Nodemailer, PostgreSQL, and Zod. Gmail credentials remain server-side. This project requires real server configuration before sending; it never simulates sending.

The Templates workspace includes reusable bilingual, table-based HTML email templates with inline styles, HTTPS image assets, configurable social/app links, saved template management, desktop/mobile previews, and a test-send action. Template settings and uploaded PNG/JPEG/WebP assets are stored in PostgreSQL. Uploaded email images are served from public, immutable asset URLs so recipient mail clients can fetch them. Configure the production app on HTTPS for email-safe image links.

## Requirements

- Node.js 20+
- PostgreSQL database reachable from the application
- Gmail account with 2-Step Verification and a Google App Password

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Set `APP_PASSWORD` to the private workspace login password and set `AUTH_SECRET` to a random value of at least 32 characters.
3. Configure `SMTP_USER` and `SMTP_PASSWORD` with the Gmail address and App Password. Keep all SMTP values server-only.
4. Set `DATABASE_URL` to a PostgreSQL connection string. The application creates its `emails` table on first use.
5. Install and run:

```sh
npm install
npm run dev
```

Open `http://localhost:3000` and sign in with `APP_PASSWORD`.

## Gmail setup

In the Google Account security settings, enable 2-Step Verification and create an App Password for this app. Set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_SECURE=false`, `SMTP_USER` and `SMTP_PASSWORD`. Gmail may apply account sending limits. A successful SMTP response means Gmail accepted the message for processing; it does not verify final delivery.

## Deployment to Vercel

Import the repository into Vercel and set all variables from `.env.example` for each deployment environment. Use a managed PostgreSQL service with SSL and set `DATABASE_URL`; set `NEXT_PUBLIC_APP_URL` to the deployed URL. Deploy with the standard Next.js preset. The email table is initialized automatically on first database access. Keep the database accessible from Vercel and use a database role scoped to this application.

## Operational notes

- The app uses one shared workspace password. Set a unique, strong password and rotate it when needed. This is a single-owner login, not multi-user identity management.
- Template tables are created automatically on first database use; the equivalent SQL is in `migrations/001_emails.sql`. Uploaded template images are limited to PNG, JPEG, or WebP and 2 MB each.
- Authentication uses a signed, HTTP-only, same-site cookie. Mutating API requests check the request origin. Every email API endpoint checks the session.
- The in-process send rate limiter is per server instance. For a multi-instance deployment, add a shared rate limit store (such as PostgreSQL/Redis) before exposing the service broadly.
- Attachments are limited to five files, 5 MB each and 10 MB total. Supported formats: PDF, PNG, JPEG, TXT and DOCX.
- Email HTML is sanitized server-side. SMTP-accepted and failed submissions are stored as records; BCC is restricted to the authenticated workspace.
- There is no delivery receipt integration, so accepted records are never labeled delivered.

## Production checklist

- Set a long random `AUTH_SECRET`, a strong `APP_PASSWORD`, and production-only Gmail App Password.
- Use TLS PostgreSQL with backups and restricted credentials.
- Confirm deployment variables are set and SMTP status is connected.
- Send a test message to an address you control; inspect both accepted status and the mailbox.
- Check failure handling with invalid SMTP configuration, confirm unauthorized requests are rejected, and review provider quotas.
- Configure a shared rate limiter and monitoring for multi-instance/production traffic.
