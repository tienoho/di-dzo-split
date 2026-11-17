import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, Timestamp } from 'firebase/firestore';

test('Firestore rules isolate accounts, tokens and public links', async () => {
  const env = await initializeTestEnvironment({
    projectId: 'demo-dzospit-rules',
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: readFileSync('firestore.rules', 'utf8')
    }
  });
  try {
    const owner = env.authenticatedContext('alice').firestore();
    const other = env.authenticatedContext('bob').firestore();
    const guest = env.unauthenticatedContext().firestore();

    await assertSucceeds(setDoc(doc(owner, 'users/alice/venues/v1'), { name: 'test' }));
    await assertFails(getDoc(doc(other, 'users/alice/venues/v1')));
    await assertFails(getDoc(doc(guest, 'user_fcm_tokens/alice')));
    await assertFails(setDoc(doc(guest, 'user_fcm_tokens/spam'), { tokens: ['bad'] }));

    const expiry = Timestamp.fromMillis(Date.now() + 24 * 3600_000);
    const payload = {
      id: 'link1', ownerUid: 'alice', members: [{ name: 'An', initialPaid: 100, finalShare: 50 }],
      totalAmount: 100, expiresAt: expiry
    };
    await assertFails(setDoc(doc(guest, 'public_bills/link1'), payload));
    await assertSucceeds(setDoc(doc(owner, 'public_bills/link1'), payload));
    await assertSucceeds(getDoc(doc(guest, 'public_bills/link1')));
    await assertFails(getDocs(collection(guest, 'public_bills')));
    await assertFails(updateDoc(doc(other, 'public_bills/link1'), { totalAmount: 1 }));
    await assertFails(updateDoc(doc(owner, 'public_bills/link1'), {
      expiresAt: Timestamp.fromMillis(Date.now() + 60 * 24 * 3600_000)
    }));
    await assertSucceeds(updateDoc(doc(owner, 'public_bills/link1'), { revokedAt: Timestamp.now() }));
    await assertFails(getDoc(doc(guest, 'public_bills/link1')));
    await assertFails(updateDoc(doc(owner, 'public_bills/link1'), { totalAmount: 2 }));

    const venue = {
      name: 'Quán', address: 'Hà Nội', sharedByUid: 'alice',
      sharedByName: 'An', rating: 5, ratingsCount: 1, createdAt: new Date().toISOString()
    };
    await assertSucceeds(setDoc(doc(owner, 'public_venues/v1'), venue));
    await assertFails(updateDoc(doc(other, 'public_venues/v1'), { rating: 1 }));
    await assertFails(updateDoc(doc(owner, 'public_venues/v1'), { rating: 1 }));
    await assertSucceeds(setDoc(doc(owner, 'public_venues/v1/reviews/alice'), { authorId: 'alice', rating: 5 }));
    await assertFails(setDoc(doc(other, 'public_venues/v1/reviews/spam'), { authorId: 'bob', rating: 1 }));
  } finally {
    await env.cleanup();
  }
});
