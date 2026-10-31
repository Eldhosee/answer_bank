# One-time Firestore owner ID update

The standalone script `scripts\migrate-owner-ids.mjs` reads `answers`, `notes`,
and `folders` with the Firebase Admin SDK. It requires the Firebase project ID
from `.env` and Application Default Credentials in the shell. The target must
be provided as a Firebase Authentication UID; the script verifies that this
UID belongs to a Google-linked account. Never use an email address as the UID
or commit service-account credentials.

Run a read-only inventory first:

```powershell
$targetUid = "PASTE_VERIFIED_GOOGLE_FIREBASE_UID"
node --env-file=.env scripts\migrate-owner-ids.mjs --target-uid $targetUid
```

Review the owner distribution and counts. Documents with a missing, empty, or
non-string `ownerId` are left unchanged. Only documents with a non-empty string
`ownerId` different from the target UID are eligible.

After reviewing the dry run and obtaining explicit approval, run:

```powershell
$targetUid = "PASTE_VERIFIED_GOOGLE_FIREBASE_UID"
node --env-file=.env scripts\migrate-owner-ids.mjs --target-uid $targetUid --apply --confirm-target-uid $targetUid
```

Before writing, the script saves the eligible documents with their original
IDs and fields as JSON under the Git-ignored `firestore-backup/` directory. It
updates only `ownerId`, reports batch failures, and verifies the final owner
values. Firestore security rules and application authentication remain
unchanged.
