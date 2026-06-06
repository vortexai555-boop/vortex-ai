# VORTEX AI - Product Requirements Document

## Original Problem Statement
Build a production-ready MVP for a SaaS platform called VORTEX AI. Core needs:
- Authentication (Google OAuth + Email/Password)
- Dashboard (welcome message, sidebar: AI Chat / Profile / Settings)
- AI Chat system (ChatGPT-style, persisted history per user)
- Per-user data isolation
- Protected routes
- Dark futuristic UI with neon blue/purple accents and glassmorphism
- MVP scope explicitly EXCLUDES: website builder, image gen, video gen, payments, admin panel

## Architecture
- **Frontend**: React 19 + Tailwind + shadcn/ui, framer-motion, Phosphor icons (Outfit/Manrope/JetBrains Mono fonts)
- **Backend**: FastAPI + Motor (async MongoDB) + JWT + Emergent Google OAuth
- **AI**: Claude Sonnet 4.5 via Emergent Universal LLM key (emergentintegrations library)
- **DB**: MongoDB collections: `users`, `conversations`, `activity`, `user_sessions`, `password_resets`, plus extra (`images`, `logos`, `websites`) for future tools.

## User Personas
- **Creator / Indie maker** (P0): Wants a fast premium AI chat for daily work
- **Team / SaaS founder** (P1): Wants conversation history + export
- **Admin** (P1, seeded): Manages users (admin endpoints exist but no UI in MVP)

## Implemented (2026-06-06)
- Landing page (hero, features, pricing, testimonials, FAQ, footer)
- Auth: JWT signup/login/forgot/reset + Emergent Google OAuth callback
- Dashboard layout with sidebar (Home, AI Chat, Profile, Settings)
- Dashboard home: welcome card, credit/conversations/actions stats, recent activity
- AI Chat: ChatGPT-style with Claude Sonnet 4.5, conversation list, rename, delete, export to markdown, prompt suggestions, loading indicator
- Profile page: account info, user_id copy, plan & credits
- Settings page: appearance, notifications, logout, feedback link
- Protected routes via `ProtectedRoute` + `AuthProvider`
- Per-user isolation on all conversation endpoints (verified via testing agent)
- Admin seeding on backend startup (`admin@vortex.ai` / `VortexAdmin@2026`)

## Backlog (future)
- **P1**: Add streaming responses for chat (currently uses `send_message`); reduces UX wait
- **P1**: Light theme toggle (currently dark-only)
- **P1**: Notifications toast preferences persisted to user record
- **P2**: Stripe billing integration for Pro/Enterprise upgrades
- **P2**: Admin panel UI (endpoints already exist: `/api/admin/users`, `/api/admin/stats`)
- **P2**: Activate the additional AI tools whose backend already exists: image gen (Gemini Nano Banana), logo gen, content writer, code gen, website builder, business assistant
- **P2**: Email-based password reset (currently returns token inline)
- **P2**: Server-side retry fallback for transient LLM 502s

## Test Credentials
Stored in `/app/memory/test_credentials.md`.

## Key Files
- `/app/backend/server.py` — all FastAPI routes
- `/app/backend/.env` — `EMERGENT_LLM_KEY`, `JWT_SECRET`, `ADMIN_EMAIL/PASSWORD`
- `/app/frontend/src/App.js` — routes
- `/app/frontend/src/lib/{api.js, auth.jsx}` — API client + auth context
- `/app/frontend/src/pages/{Landing, Login, Signup, Forgot, AuthCallback, DashboardLayout, DashboardHome, ChatPage, ProfilePage, SettingsPage}.jsx`
- `/app/backend/tests/test_vortex_api.py` — pytest baseline (21/21 passing)
