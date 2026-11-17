/**
 * One-time purge of the insecure legacy name-based FCM token directory.
 * Rules already deny public access; this handles data retention.
 * DRY RUN by default; set MIGRATION_APPLY=yes after backup and privacy review.
 *
 * FIREBASE_PROJECT_ID and Google Application Default Credentials are required.
 */
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function run() {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('FIREBASE_PROJECT_ID is required');
  const app = initializeApp({ credential: applicationDefault(), projectId });
  const databaseId = process.env.FIRESTORE_DATABASE_ID || process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '(default)';
  const database = getFirestore(app, databaseId);
  const snapshot = await database.collection('user_fcm_tokens').get();
  const apply = process.env.MIGRATION_APPLY === 'yes';
  console.log(JSON.stringify({
    projectId, databaseId, legacyTokenDocuments: snapshot.size,
    dryRun: !apply
  }, null, 2));
  if (!apply) {
    console.log('No changes made. Confirm backup and credentials before MIGRATION_APPLY=yes.');
    return;
  }
  for (let offset = 0; offset < snapshot.docs.length; offset += 400) {
    const batch = database.batch();
    snapshot.docs.slice(offset, offset + 400).forEach(document => batch.delete(document.ref));
    await batch.commit();
    console.log(`Purged ${Math.min(offset + 400, snapshot.size)} / ${snapshot.size}`);
  }
}

run().catch(error => {
  console.error('FCM migration failed:', error);
  process.exitCode = 1;
});
