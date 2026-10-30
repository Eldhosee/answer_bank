# One-time legacy ownership backfill

The web app intentionally does not scan an entire collection to discover ownerless records. That scan is rejected by owner-scoped Firestore rules. Run the Admin SDK migration once with trusted project credentials; Admin SDK access bypasses client rules while the app rules remain strict.

1. Confirm the current authenticated UID in the browser developer console (development builds log `[firebase] authenticated UID`).
2. Install the migration-only dependency without saving credentials or committing them: `npm install --no-save --package-lock=false firebase-admin`.
3. Authenticate the shell with Application Default Credentials or set `GOOGLE_APPLICATION_CREDENTIALS` to a trusted service-account key kept outside the repository.
4. Run `node scripts/migrate-legacy-ownership.mjs --project=<firebase-project-id> --uid=<authenticated-user-uid>`.

The script scans `answers`, `notes`, and `folders`. It transactionally sets only a missing or null `ownerId`; it does not change IDs, other fields, or any non-null owner. It writes a completion marker so the migration runs once, and refuses to rerun for a different UID. Firestore rules stay owner-scoped throughout. Never commit service-account credentials.
