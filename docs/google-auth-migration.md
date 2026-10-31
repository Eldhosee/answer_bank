# Google authentication and anonymous-data migration

## Existing ownership model

The app currently signs visitors in anonymously when Firebase is configured and no Firebase user is present. Firebase Auth persistence keeps that anonymous user on its browser origin. Answer, note, and folder services use that user's UID for every Firestore query and write through `ownerId`; the Firestore rules require the same UID and are intentionally owner-scoped. When Firebase is not configured, the app uses local sample data and `localStorage`.

Linking Google to an existing anonymous Firebase user preserves its UID. That is the preferred path because it keeps all documents already owned by that UID accessible without changing Firestore data.

## Multiple origins or Firebase projects

Do not assume localhost and production have the same anonymous UID. Auth persistence is scoped to the origin, and the two environments can also be configured for different Firebase projects. Do not automatically merge records or silently switch to a Google account that already exists.

Before linking Google when data was created on more than one origin:

1. Confirm the Firebase project ID used by localhost and by the deployed Vercel environment.
2. On each origin containing data, record the current Firebase UID and project ID. The development build logs the UID as `[firebase] authenticated UID`; never share service-account credentials or paste them into the app.
3. Inventory and back up the `answers`, `notes`, and `folders` documents associated with each UID. Compare document IDs, counts, and folder relationships before changing ownership.
4. Choose one canonical UID, preferably the UID containing the primary collection and the origin on which Google will be linked. If all records are in one Firebase project, a trusted, reviewed Admin SDK migration may reassign only the non-canonical records' `ownerId` to that UID, preserving document IDs and all other fields. If projects differ, export/import is required; check for ID collisions and preserve `folderId`/`parentId` relationships before importing. Do not overwrite conflicting records.
5. Test the migration against a backup or staging project first. Verify counts, relationships, and access under the canonical UID before linking Google. Keep the backup until verification is complete.
6. Link Google on the canonical origin. If Firebase reports `auth/credential-already-in-use`, stop: the existing Google account belongs to another UID. Do not retry by switching accounts or merging automatically. Revisit the inventory and migration decision first.

The standalone `scripts\migrate-owner-ids.mjs` can update documents that
already have a non-empty string `ownerId`; documents without a valid owner are
left unchanged. It is not a cross-project import tool. Review
[the script procedure](./legacy-ownership-migration.md), its dry-run output,
and its local backup before explicitly applying any update.

## Firebase and deployment setup

- Enable Google in Firebase Console under Authentication → Sign-in method.
- Add `localhost` and the deployed Vercel hostname (including any production/custom domains actually used) under Authentication → Settings → Authorized domains.
- Use the same Firebase project in each environment that is intended to share Firestore data. Set the Vite Firebase environment variables in local `.env` and Vercel project settings; do not commit them.
- Keep Firestore security rules owner-scoped. Google sign-in does not require weakening the existing `ownerId` checks.
- Vercel's existing rewrite to `/index.html` supports the client-side routes; no auth-specific rewrite is needed.
