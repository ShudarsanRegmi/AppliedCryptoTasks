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
