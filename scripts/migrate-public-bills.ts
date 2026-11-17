/**
 * One-time Firebase Admin migration for legacy public bills.
 * DRY RUN is default. Set MIGRATION_APPLY=yes only after reviewing counts.
 *
 * Requires Google Application Default Credentials for the target Firebase project.
 */
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';

async function main() {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('FIREBASE_PROJECT_ID is required');
  const app = initializeApp({ credential: applicationDefault(), projectId });
  const dbId = process.env.FIRESTORE_DATABASE_ID || process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '(default)';
  const db = getFirestore(app, dbId);
  const snapshot = await db.collection('public_bills').get();

  const dryRun = process.env.MIGRATION_APPLY !== 'yes';
  const revoke = [];
  const expire = [];
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.revokedAt) continue;
    if (!data.ownerUid || typeof data.ownerUid !== 'string') {
      revoke.push(doc.ref);
    } else if (!data.expiresAt) {
      expire.push(doc.ref);
    }
  }

  const summary = {
    projectId, dbId, dryRun, scanned: snapshot.size,
    legacyToRevoke: revoke.length,
    ownerLinksToExpire: expire.length
  };
  console.log(JSON.stringify(summary, null, 2));
  if (dryRun) {
    console.log('No mutations made. Review project and counts, then run with MIGRATION_APPLY=yes.');
    return;
  }

  const expiry = Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const updates = [
    ...revoke.map(ref => ({ ref, patch: { revokedAt: FieldValue.serverTimestamp() } })),
    ...expire.map(ref => ({ ref, patch: { expiresAt: expiry } }))
  ];
  for (let index = 0; index < updates.length; index += 400) {
    const batch = db.batch();
    updates.slice(index, index + 400).forEach(({ ref, patch }) => batch.update(ref, patch));
    await batch.commit();
    console.log(`Updated ${Math.min(index + 400, updates.length)} / ${updates.length}`);
  }
  console.log('Migration completed.');
}

main().catch(error => {
  console.error('Public bill migration failed:', error);
  process.exitCode = 1;
});
