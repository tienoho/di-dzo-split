import { useEffect } from 'react';
import {
  auth,
  onAuthStateChanged,
  fetchVenuesFromCloud,
  fetchBillsFromCloud,
  fetchContactsFromCloud,
  getUserResetEpoch,
  saveBillToCloud,
  saveVenueToCloud,
  refreshPublicBillIfShared,
  saveContactToCloud,
  deleteContactFromCloud,
  FirebaseUser
} from '../lib/firebase';
import {
  getStoredVenues,
  saveStoredVenues,
  getStoredBills,
  saveStoredBills,
  getActiveDebts
} from '../utils/storage';
import { mergeVersioned } from '../utils/syncMerge';
import { Venue, Bill, Debt, ContactEntry } from '../types';

interface UseCloudSyncProps {
  setCurrentUser: (user: FirebaseUser | null) => void;
  setActiveCreatorName: (name: string) => void;
  setVenues: (venues: Venue[]) => void;
  setBills: (bills: Bill[]) => void;
  setDebts: (debts: Debt[]) => void;
  setContacts: (contacts: Record<string, ContactEntry>) => void;
  setAuthChecking: (checking: boolean) => void;
}

function readContacts(key: string) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    console.warn('[Cloud sync] Invalid cached contacts:', error);
    return {};
  }
}

export function useCloudSync({
  setCurrentUser, setActiveCreatorName, setVenues, setBills,
  setDebts, setContacts, setAuthChecking
}: UseCloudSyncProps) {
  useEffect(() => {
    let disposed = false;
    let sequence = 0;
    const unsubscribe = onAuthStateChanged(auth, async user => {
      const requestId = ++sequence;
      const live = () => !disposed && requestId === sequence;
      if (!live()) return;

      setAuthChecking(true);
      setCurrentUser(user);
      if (!user) {
        const guestBills = getStoredBills('guest');
        setActiveCreatorName(localStorage.getItem('nhau_creator_name_guest') || 'Bạn (Chủ phòng)');
        setVenues(getStoredVenues('guest'));
        setBills(guestBills);
        setDebts(getActiveDebts(guestBills));
        setContacts(readContacts('nhau_contacts_guest'));
        setAuthChecking(false);
        return;
      }

      const cachedName = localStorage.getItem(`nhau_creator_name_${user.uid}`);
      const displayName = cachedName || user.displayName || user.email?.split('@')[0] || 'Bạn (Chủ phòng)';
      setActiveCreatorName(displayName);
      localStorage.setItem(`nhau_creator_name_${user.uid}`, displayName);

      // Switch immediately to this account's cache; never render the previous account's bills.
      const cachedBills = getStoredBills(user.uid);
      setBills(cachedBills);
      setDebts(getActiveDebts(cachedBills));
      setVenues(getStoredVenues(user.uid));
      setContacts(readContacts(`nhau_contacts_${user.uid}`));

      try {
        const [cloudVenues, cloudBills, cloudContacts, resetEpoch] = await Promise.all([
          fetchVenuesFromCloud(user.uid),
          fetchBillsFromCloud(user.uid),
          fetchContactsFromCloud(user.uid),
          getUserResetEpoch(user.uid)
        ]);
        if (!live()) return;

        const epochKey = `nhau_seen_reset_${user.uid}`;
        const seenEpoch = Number(localStorage.getItem(epochKey) || 0);
        if (resetEpoch > seenEpoch) {
          saveStoredBills([], user.uid);
          saveStoredVenues([], user.uid);
          localStorage.setItem(`nhau_contacts_${user.uid}`, '{}');
          localStorage.setItem(epochKey, String(resetEpoch));
        }

        // Read local cache *after* remote I/O to include edits made during fetching.
        const mergedBills = mergeVersioned(cloudBills, getStoredBills(user.uid));
        const mergedVenues = mergeVersioned(cloudVenues, getStoredVenues(user.uid));
        const localContacts = readContacts(`nhau_contacts_${user.uid}`) as Record<string, ContactEntry>;
        const mergedContacts = mergeVersioned(
          Object.entries(cloudContacts).map(([id, entry]) => ({ id, ...entry })),
          Object.entries(localContacts).map(([id, entry]) => ({ id, ...entry }))
        );
        const contacts: Record<string, ContactEntry> = Object.fromEntries(
          mergedContacts.entities.map(({ id, ...entry }) => [id, entry])
        );

        setBills(mergedBills.entities);
        setDebts(getActiveDebts(mergedBills.entities));
        setVenues(mergedVenues.entities);
        setContacts(contacts);
        saveStoredBills(mergedBills.entities, user.uid);
        saveStoredVenues(mergedVenues.entities, user.uid);
        localStorage.setItem(`nhau_contacts_${user.uid}`, JSON.stringify(contacts));

        const operations = [
          ...mergedBills.toUpload.map(async b => {
            await saveBillToCloud(user.uid, b);
            if (!b.deletedAt) await refreshPublicBillIfShared(b);
          }),
          ...mergedVenues.toUpload.map(v => saveVenueToCloud(user.uid, v)),
          ...mergedContacts.toUpload.map(entry => entry.deletedAt
            ? deleteContactFromCloud(user.uid, entry.id, entry.deletedAt)
            : saveContactToCloud(user.uid, entry.id, entry.phone || '', entry.messenger || '', entry.updatedAt))
        ];
        if (operations.length) {
          const results = await Promise.allSettled(operations);
          if (results.some(result => result.status === 'rejected')) {
            console.error('[Cloud sync] Some writes failed. Local versions retained for retry.');
          }
        }
      } catch (error) {
        console.error('[Cloud sync] Remote fetch failed; offline cache retained:', error);
      } finally {
        if (live()) setAuthChecking(false);
      }
    });

    return () => {
      disposed = true;
      sequence++;
      unsubscribe();
    };
  }, [
    setCurrentUser, setActiveCreatorName, setVenues,
    setBills, setDebts, setContacts, setAuthChecking
  ]);
}
