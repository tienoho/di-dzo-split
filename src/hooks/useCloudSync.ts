import { useEffect } from 'react';
import { 
  auth, 
  onAuthStateChanged, 
  fetchVenuesFromCloud, 
  fetchBillsFromCloud, 
  fetchContactsFromCloud,
  syncVenuesToCloud,
  syncBillsToCloud,
  FirebaseUser
} from '../lib/firebase';
import { getStoredVenues, saveStoredVenues, getStoredBills, saveStoredBills, getActiveDebts } from '../utils/storage';
import { Venue, Bill, Debt } from '../types';

interface UseCloudSyncProps {
  setCurrentUser: (user: FirebaseUser | null) => void;
  setActiveCreatorName: (name: string) => void;
  setVenues: (venues: Venue[]) => void;
  setBills: (bills: Bill[]) => void;
  setDebts: (debts: Debt[]) => void;
  setContacts: (contacts: Record<string, { phone?: string; messenger?: string }>) => void;
  setAuthChecking: (isChecking: boolean) => void;
}

export function useCloudSync({
  setCurrentUser,
  setActiveCreatorName,
  setVenues,
  setBills,
  setDebts,
  setContacts,
  setAuthChecking
}: UseCloudSyncProps) {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthChecking(true);
      if (user) {
        setCurrentUser(user);
        
        // Resolve dynamic user display name
        const cachedCreatorName = localStorage.getItem(`nhau_creator_name_${user.uid}`);
        const resolvedName = user.displayName || cachedCreatorName || (user.email ? user.email.split('@')[0] : 'Bạn (Chủ phòng)');
        setActiveCreatorName(resolvedName);
        localStorage.setItem(`nhau_creator_name_${user.uid}`, resolvedName);
        localStorage.setItem('nhau_creator_name', resolvedName);

        // Fast load from user-scoped local cache first
        const cachedVenues = getStoredVenues(user.uid);
        const cachedBills = getStoredBills(user.uid);
        const cachedContacts = JSON.parse(localStorage.getItem(`nhau_contacts_${user.uid}`) || '{}');
        
        if (cachedVenues.length > 0 || cachedBills.length > 0 || Object.keys(cachedContacts).length > 0) {
          setVenues(cachedVenues);
          setBills(cachedBills);
          setDebts(getActiveDebts(cachedBills));
          setContacts(cachedContacts);
        }
        
        try {
          const cloudVenues = await fetchVenuesFromCloud(user.uid);
          const cloudBills = await fetchBillsFromCloud(user.uid);
          const cloudContacts = await fetchContactsFromCloud(user.uid);
          
          let finalVenues = cloudVenues;
          let finalBills = cloudBills;
          let finalContacts = cloudContacts;

          // If brand-new or empty cloud account, automatically migrate offline guest bills & venues
          if (cloudBills.length === 0 && cachedBills.length === 0) {
            const guestBills = getStoredBills('guest');
            const guestVenues = getStoredVenues('guest');
            if (guestBills.length > 0 || guestVenues.length > 0) {
              if (guestBills.length > 0) {
                await syncBillsToCloud(user.uid, guestBills);
                finalBills = guestBills;
              }
              if (guestVenues.length > 0) {
                await syncVenuesToCloud(user.uid, guestVenues);
                finalVenues = guestVenues;
              }
            }
          }

          setVenues(finalVenues);
          setBills(finalBills);
          setDebts(getActiveDebts(finalBills));
          setContacts(finalContacts);

          // Save cloud data directly to user's local cache
          saveStoredVenues(finalVenues, user.uid);
          saveStoredBills(finalBills, user.uid);
          localStorage.setItem(`nhau_contacts_${user.uid}`, JSON.stringify(finalContacts));
        } catch (err) {
          console.error("Error synchronizing with Firestore, retaining local cache:", err);
          const localVenues = getStoredVenues(user.uid);
          const localBills = getStoredBills(user.uid);
          const localContacts = JSON.parse(localStorage.getItem(`nhau_contacts_${user.uid}`) || '{}');
          setVenues(localVenues);
          setBills(localBills);
          setDebts(getActiveDebts(localBills));
          setContacts(localContacts);
        }
      } else {
        setCurrentUser(null);
        const guestName = localStorage.getItem('nhau_creator_name_guest') || localStorage.getItem('nhau_creator_name') || 'Bạn (Chủ phòng)';
        setActiveCreatorName(guestName);
        // Clean session and reload offline guest records safely
        const guestVenues = getStoredVenues('guest');
        const guestBills = getStoredBills('guest');
        const guestContacts = JSON.parse(localStorage.getItem('nhau_contacts_guest') || localStorage.getItem('nhau_contacts') || '{}');
        setVenues(guestVenues);
        setBills(guestBills);
        setDebts(getActiveDebts(guestBills));
        setContacts(guestContacts);
      }
      setAuthChecking(false);
    });

    // Request browser notification permission nicely
    if ('Notification' in window && Notification.permission === 'default') {
      setTimeout(() => {
        Notification.requestPermission().catch(console.error);
      }, 3500);
    }

    return () => unsubscribe();
  }, [setCurrentUser, setActiveCreatorName, setVenues, setBills, setDebts, setContacts, setAuthChecking]);
}
