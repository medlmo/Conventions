# Conventions Management Platform

Web application for managing conventions, financial contributions, administrative events, document exports, and secured file uploads.

## Tech Stack

- Frontend: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, Wouter
- Backend: Node.js, Express, TypeScript, session-based authentication
- Database: PostgreSQL with Drizzle ORM
- Security: Helmet, API rate limiting, role-based authorization

## Main Features

- Convention CRUD with search and filtering
- Convention statistics endpoints
- Financial contribution tracking per convention
- Administrative event tracking per convention
- Authenticated file upload/download with validation and limits
- Role-based access control for sensitive operations

## Project Structure

- `client/`: React UI
- `server/`: Express API and app bootstrap
- `server/routes/`: API modules (`auth`, `users`, `conventions`, `stats`, `uploads`, etc.)
- `shared/`: shared schema and types
- `uploads/`: stored uploaded files (ignored by Git)

## Prerequisites

- Node.js 20+
- PostgreSQL database
- npm

## Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgres://user:password@host:5432/dbname
SESSION_SECRET=replace-with-a-strong-secret
TRUST_PROXY=loopback
```

Notes:
- `DATABASE_URL` is required.
- `SESSION_SECRET` should be changed in production.
- `TRUST_PROXY` defaults to `loopback` if omitted.

## Install and Run

```bash
npm install
npm run db:push
npm run dev
```

The app runs on `http://localhost:5000`.

## Available Scripts

- `npm run dev`: start development server
- `npm run build`: build frontend and backend into `dist/`
- `npm run start`: run production build
- `npm run check`: TypeScript type checking
- `npm run db:push`: push Drizzle schema to database

## API Overview

Base API prefix: `/api`

- Auth: `/api/auth`
- Users: `/api/users`
- Conventions: `/api/conventions`
- Convention stats: `/api/conventions/stats`
- Financial contributions:
  - `/api/conventions/:conventionId/financial-contributions`
  - `/api/financial-contributions`
- Administrative events:
  - `/api/conventions/:conventionId/administrative-events`
  - `/api/administrative-events`
- Uploads:
  - `/api/upload` (upload/delete)
  - `/uploads` (secured static file access)

## Upload Rules

- Max file size: 10 MB per file
- Max files per request: 5
- Allowed types: PDF, Word, Excel, and images
- Upload/delete endpoints require authenticated users with `ADMIN` or `EDITOR` role

## Production Notes

- Build with `npm run build`, then run `npm run start`.
- The server is configured to listen on port `5000`.
- Keep `uploads/` out of version control (already ignored in `.gitignore`).
