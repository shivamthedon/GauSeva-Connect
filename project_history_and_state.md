# GauSeva Connect - Project History & State Memory

This file serves as a handoff memory for any AI developer tools or future developers working on the GauSeva Connect application. It documents the evolution of the project's authentication system and its current state.

---

## 1. Project Overview
GauSeva Connect is a platform for cow protection, marketplace, listings, gaushalas, transport, vets, and sponsorships.
- **Frontend**: React + Vite + TypeScript + TailwindCSS / Custom CSS + Framer Motion (motion/react).
- **Backend**: Node.js Express server (`server.ts`).
- **Database/Storage**: Cloudflare D1 (SQL-based database via API) and Cloudflare R2 (for listings media/storage).

---

## 2. Authentication System Iteration History

### Phase 1: Initial Setup
- Initial setup used Firebase Google Auth.

### Phase 2: WhatsApp Cloud API Integration (Meta)
- The user requested integration of mobile OTP authentication.
- We integrated the **Official Meta WhatsApp Cloud API** for real OTP delivery, providing a `whatsapp_setup.md` guide and creating `/api/auth/whatsapp/send` endpoints.

### Phase 3: WorkOS Mobile SMS & Hosted AuthKit Integration
- The user decided to shift to **WorkOS** for authentication.
- We integrated the WorkOS Node SDK (`@workos-inc/node`) and implemented MFA flow (Factor enrollment, Challenge creation, Verification).
- Later, the user requested integration of the hosted WorkOS AuthKit UI (`https://resolute-pyramid-33-staging.authkit.app/`).
- We replaced the local sign-in modal with redirect links to WorkOS OAuth (`/api/auth/login`) and handled callbacks at `/api/auth/callback` to sync user profiles.
- *Limitation encountered*: WorkOS SMS OTP delivery is free/supported primarily for the United States (+1), causing delivery to fail for international/Indian numbers (+91) unless using paid tiers.

### Phase 4: Reversion to Firebase Google Auth (Current State)
- The user requested to remove all WorkOS/SMS setups and revert back to **Firebase Google Sign-In only**.
- **Actions Completed**:
  1. Cleaned up and removed the WorkOS Node SDK initialization and endpoints (`/api/auth/login`, `/api/auth/callback`, `/api/auth/phone/send`, etc.) from `server.ts`.
  2. Updated `src/lib/firebase.ts` to export real Firebase Auth initialize code, `GoogleAuthProvider`, and `signInWithGoogle` using `signInWithPopup`.
  3. Re-implemented `src/components/AuthModal.tsx` containing a direct "Continue with Google" sign-in button.
  4. Updated `src/App.tsx` to handle the `isAuthModalOpen` state and trigger the login modal instead of redirecting to WorkOS.
  5. Cleaned up references to `ProfileCompletionModal` and WorkOS.

---

## 3. Current Project State & Credentials

### Frontend Config
Firebase credentials are dynamically loaded from `f:\gauseva-main\firebase-applet-config.json` inside `src/lib/firebase.ts`.

### Active Blocker
When trying to log in using the Google Provider, the browser throws:
`Firebase: Error (auth/api-key-not-valid.-please-pass-a-valid-api-key.)`

This error occurs because the project details in `firebase-applet-config.json` belong to an old project or are invalid/unauthorized for Google Sign-In.

---

## 4. Next Steps / Actions Required

1. **Firebase Console Project Setup**:
   - Go to [Firebase Console](https://console.firebase.google.com/).
   - Create a project named **GauSeva Connect**.
   - Enable **Google Provider** under *Build -> Authentication -> Sign-in method*.
2. **Update Config**:
   - Register a Web App in the project to get the web configuration.
   - Update `f:\gauseva-main\firebase-applet-config.json` with the new values:
     ```json
     {
       "projectId": "YOUR_PROJECT_ID",
       "appId": "YOUR_APP_ID",
       "apiKey": "YOUR_API_KEY",
       "authDomain": "YOUR_AUTH_DOMAIN",
       "storageBucket": "YOUR_STORAGE_BUCKET",
       "messagingSenderId": "YOUR_MESSAGING_SENDER_ID",
       "measurementId": ""
     }
     ```
