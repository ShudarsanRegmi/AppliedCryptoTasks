# OAuth 2.0 From Scratch — Run & debug guide

This repository contains a complete tutorial-style OAuth 2.0 demo with three cooperating services:

- `auth-server` (port 4000) — Authorization server (login, consent, tokens)
- `resource-server` (port 4001) — Notes service (protected API + web UI)
- `client-app` (port 4002) — Third-party analytics app demonstrating Authorization Code + PKCE

Below are step-by-step instructions to run the project locally, test the OAuth flow, and troubleshoot common issues.

## Prerequisites

- Node.js (v16+ recommended) and npm
- A terminal per service, or use tmux / iTerm panes

## Start all services (recommended)

Open three terminals and run these commands (one per service):

Auth server
```bash
cd oauth/auth-server
npm install
npm run dev
```

Resource server (Notes)
```bash
cd oauth/resource-server
npm install
npm run dev
```

Client app (Analytics)
```bash
cd oauth/client-app
npm install
npm run dev
```

After startup you should see logs confirming each service is running on its port.

## Quick links (local)

- Auth Server: http://localhost:4000
- Resource Server (Notes UI): http://localhost:4001
- Client App (start OAuth): http://localhost:4002

Health endpoints
- http://localhost:4000/health
- http://localhost:4001/health
- http://localhost:4002/health

## Seeded credentials and clients

- Test user: `testuser` / `password123`
- Client: `analytics-app` (client secret: `analytics-app-secret`) — used by the `client-app` in this repo

## How to test the flow manually

1. Open the client app: http://localhost:4002
2. Click the "Connect" / "Authorize" button. This will start the Authorization Code + PKCE flow:
   - the client will redirect you to the auth server login/consent page
   - after consenting, the auth server redirects back to the client with an auth code
   - the client exchanges the code for tokens and calls the resource server to fetch notes

3. You should end up on the client dashboard showing analytics of your notes.

## Troubleshooting

1) invalid_state — State parameter mismatch

- Why it happens: The client generates a random `state` when the flow starts and stores it (server-side session or another mechanism). When the auth server redirects back, the client must see the same `state`. If it doesn't, the client rejects the response as a possible CSRF attack.

- Common reasons and fixes:
  - You started the flow incorrectly (e.g., opened the callback URL directly instead of starting from the client UI).
  - The client's session cookie carrying the stored `state` wasn't sent with the callback request (SameSite cookie issues, different origin/port, popup blocking cookies). For local dev ensure the client app sets cookie options to `sameSite: 'lax'` and `secure: false` in `express-session` configuration.
  - The server restarted during the flow (MemoryStore cleared). Use a persistent session store (Redis) for stability.
  - For popup flows, consider storing `state` keyed by its value on the server or use a postMessage handshake between popup and opener.

Quick checks:
  - Start the flow from the client UI (http://localhost:4002) and click Connect.
  - In DevTools → Application → Cookies, ensure the client has a session cookie (e.g., `connect.sid`) and it exists both before and after the redirect.
  - Add temporary logs to `client-app/src/routes/index.ts` in `/connect` and `/callback` to print `req.sessionID`, `req.session.state`, and the returned `state` query parameter.

2) EJS / missing template errors

- If a service complains `Cannot find module 'ejs'`, `cd` into that service folder and run `npm install` to ensure dependencies are installed for that package.

3) Sessions appear to be lost

- Ensure the `express-session` configuration (cookie `sameSite` and `secure`) is compatible with your browser and local setup. For example (dev only):

```ts
// client-app/src/index.ts
app.use(session({
  secret: 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, sameSite: 'lax' }
}));
```

## Notes about the popup UX

- The demo contains a popup-based OAuth UX. Popups should share cookies if they're the same origin. However, some browsers or settings block cookies in popups or treat cross-site redirects differently.
- If your popup flow shows `invalid_state`, prefer the following approaches:
  - Keep the state in a server-side map keyed by the `state` value (so the callback handler looks up codeVerifier/state by value, not by session).
  - Or implement a postMessage channel where the popup sends the result to the opener window, and the parent performs the token exchange.

## Data files

- `auth-server/data/users.json` — persistent users
- `resource-server/data/notes.json` — sample notes persisted to disk

Remove or edit these files to reset data between runs.

## Advanced / convenience

- Run all services in background (single terminal) — example:

```bash
(cd oauth/auth-server && npm run dev) &
(cd oauth/resource-server && npm run dev) &
(cd oauth/client-app && npm run dev) &
```

- Kill all running `ts-node` dev servers:

```bash
pkill -f "ts-node" || true
```

## I can help further

If you want, I can:

- Add temporary debug logging to the client `/connect` and `/callback` handlers and restart the client app so you can reproduce and we can inspect logs together.
- Switch the popup flow to a state-keyed map implementation (so popup/callback don't require the same session).
- Wire up Redis for sessions if you prefer a persistent store for local testing.

Tell me which you'd like and I'll implement it and restart the relevant service.
# OAuth 2.0 From Scratch - Implementation Plan

## 🎯 What We're Building

A complete OAuth 2.0 implementation with a practical, real-world scenario:

### **Scenario**
- **Resource Server**: A "Notes Service" - stores user's private notes
- **Client App**: A "Notes Analytics App" - a third-party app that wants to read user's notes to provide analytics (word count, sentiment, etc.)
- **Auth Server**: Handles all authentication and authorization

---

## 🧩 Components Overview

| Component | Purpose | Port |
|-----------|---------|------|
| **auth-server** | Issues tokens, manages users, handles consent | 4000 |
| **resource-server** | The "Notes Service" - protected API with user data | 4001 |
| **client-app** | Third-party "Analytics App" wanting access | 4002 |
| **shared** | Common types, utilities, crypto functions | - |

---

## 🔄 OAuth 2.0 Flow We'll Implement

**Authorization Code Grant** (most secure, most common):

```
┌──────────────┐                              ┌──────────────┐
│  Client App  │                              │     User     │
│  (Analytics) │                              │   (Browser)  │
└──────┬───────┘                              └──────┬───────┘
       │                                             │
       │ 1. User clicks "Connect Notes"              │
       │────────────────────────────────────────────>│
       │                                             │
       │ 2. Redirect to Auth Server                  │
       │<────────────────────────────────────────────│
       │                                             │
       │         ┌──────────────┐                    │
       │         │  Auth Server │                    │
       │         └──────┬───────┘                    │
       │                │                            │
       │ 3. Login Page  │                            │
       │                │<───────────────────────────│
       │                │                            │
       │ 4. User Logs In + Grants Permission         │
       │                │<───────────────────────────│
       │                │                            │
       │ 5. Auth Code sent to Client (via redirect)  │
       │<───────────────│                            │
       │                │                            │
       │ 6. Exchange Auth Code for Access Token      │
       │───────────────>│                            │
       │                │                            │
       │ 7. Access Token + Refresh Token             │
       │<───────────────│                            │
       │                                             │
       │         ┌──────────────┐                    │
       │         │   Resource   │                    │
       │         │    Server    │                    │
       │         └──────┬───────┘                    │
       │                │                            │
       │ 8. Request Notes with Access Token          │
       │───────────────>│                            │
       │                │                            │
       │ 9. Return Protected Data                    │
       │<───────────────│                            │
       │                                             │
       │ 10. Show Analytics to User                  │
       │────────────────────────────────────────────>│
```

---

## 📁 Folder Structure

```
oauth/
├── auth-server/          # Authorization Server
│   ├── src/
│   │   ├── controllers/  # Auth endpoints logic
│   │   ├── models/       # User, Client, Token storage
│   │   ├── services/     # Token generation, validation
│   │   ├── routes/       # API routes
│   │   └── views/        # Login & consent pages
│   └── package.json
│
├── resource-server/      # Notes Service (Protected API)
│   ├── src/
│   │   ├── controllers/  # Notes CRUD operations
│   │   ├── middleware/   # Token validation
│   │   ├── models/       # Notes storage
│   │   └── routes/       # API routes
│   └── package.json
│
├── client-app/           # Third-party Analytics App
│   ├── src/
│   │   ├── services/     # OAuth flow handling
│   │   ├── routes/       # App routes + callback
│   │   └── views/        # UI pages
│   └── package.json
│
├── shared/               # Common utilities
│   └── src/
│       ├── types/        # TypeScript interfaces
│       └── utils/        # Crypto, JWT helpers
│
└── README.md
```

---

## 🔐 Key Features We'll Implement

### Auth Server
- User registration & login
- Client app registration
- Authorization endpoint (`/authorize`)
- Token endpoint (`/token`)
- Token introspection (`/introspect`)
- Refresh token support
- Consent screen
- PKCE support (optional security enhancement)

### Resource Server
- Protected notes API
- Token validation middleware
- Scope-based access control
- User's notes CRUD operations

### Client App
- OAuth flow initiation
- Callback handling
- Token storage
- API calls with access token
- Token refresh logic

---

## 🛠 Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Storage**: In-memory (for simplicity, easy to swap for DB)
- **Templating**: EJS (for login/consent pages)
- **Crypto**: Native Node.js crypto + custom JWT implementation

---

## 📋 Implementation Order

1. **Phase 1**: Set up project structure & shared utilities
2. **Phase 2**: Build Auth Server (core OAuth logic)
3. **Phase 3**: Build Resource Server (Notes API)
4. **Phase 4**: Build Client App (third-party app)
5. **Phase 5**: Integration testing & demo flow
