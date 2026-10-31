# NABARD Answer Bank

A simple, responsive personal web app for storing and reading NABARD answer-writing model answers in one place.

## What is included

- React + TypeScript + Vite
- Tailwind CSS v4
- Firebase Firestore persistence
- Firebase Authentication with anonymous sessions and Google account linking
- Responsive desktop and mobile UI
- Light and dark mode
- Search across questions, topics and answer text
- Subject filters: ARD, ESI and English
- Add, read, edit-ready architecture, favourite and delete flows
- Book-like answer reader
- Demo data/localStorage fallback when Firebase is not configured
- Modular feature-based source structure

## 1. Requirements

- Node.js 20+ recommended
- A Firebase project if you want cloud persistence

## 2. Install

```bash
npm install
```

## 3. Run locally without Firebase

You can start immediately in demo mode:

```bash
npm run dev
```

The app uses sample answers and localStorage when Firebase environment variables are missing.

## 4. Connect Firebase

1. Create a project in Firebase Console.
2. Create a Web App inside the Firebase project.
3. Enable **Cloud Firestore**.
4. Enable **Authentication → Sign-in method → Anonymous** and **Google**.
5. Add `localhost` and your Vercel/custom production hostnames under **Authentication → Settings → Authorized domains**.
6. Create a local `.env` file using the Firebase web-app values below.
7. Use the same Firebase project in local and Vercel settings if both environments should see the same data, then restart the Vite dev server.

Example `.env`:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Do not commit `.env` to Git. It is ignored by `.gitignore`.

## 5. Authentication and Firestore ownership

The app preserves the existing anonymous Firebase UID and offers to link Google to that account. Linking keeps the same UID and existing `ownerId` data. Google sign-in uses a popup; popup cancellation or blocking does not modify the account. If the Google credential already belongs to another Firebase UID, the app stops without switching accounts or merging data.

All Firestore operations remain scoped by the authenticated UID, and `firestore.rules` continues to enforce `ownerId` ownership. Review [docs/google-auth-migration.md](./docs/google-auth-migration.md) before linking if data was created from both localhost and production: anonymous sessions on different origins can have different UIDs and must not be automatically merged.

For a one-time owner-ID update, use the standalone Admin SDK script at `scripts/migrate-owner-ids.mjs`. It defaults to a read-only dry run; review its output and generated local backup before running it with `--apply` and an exact UID confirmation. It requires Application Default Credentials with Firebase Auth read and Firestore read/write access. The script does not change application authentication or Firestore rules.

```powershell
$targetUid = "PASTE_VERIFIED_GOOGLE_FIREBASE_UID"

# Dry run
node --env-file=.env scripts\migrate-owner-ids.mjs --target-uid $targetUid

# Actual update, only after reviewing the dry run and backup requirements
node --env-file=.env scripts\migrate-owner-ids.mjs --target-uid $targetUid --apply --confirm-target-uid $targetUid
```

## 6. Build

```bash
npm run build
```

## 7. Suggested future additions

Keep the current version small. If the app becomes useful after you have a substantial answer collection, good next additions would be:

- simple spaced revision
- richer editor formatting
- import/export
- tags
- answer-writing practice mode

These should be added as separate features rather than mixed into the current answer flow.

## Project structure

```text
src/
├── app/                         # application shell and providers
├── components/                  # reusable UI and layout components
├── features/
│   └── answers/
│       ├── components/          # answer-specific UI
│       ├── hooks/               # answer state/data hooks
│       ├── models/              # answer types
│       ├── pages/               # route-level screens
│       ├── services/            # Firebase/local data access
│       └── utils/               # answer helpers/filtering
├── firebase/                    # Firebase configuration/auth
├── theme/                       # design tokens
├── index.css
└── main.tsx
```

## Architecture principle

UI components should not call Firestore directly. Data access lives in `features/answers/services/answerService.ts`, while pages use the `useAnswers` hook. This makes future backend or feature changes much easier without spreading Firebase logic throughout the UI.
