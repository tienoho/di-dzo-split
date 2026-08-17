import { useEffect } from 'react';
import { 
  auth, 
  onAuthStateChanged, 
  fetchVenuesFromCloud, 
  fetchBillsFromCloud, 
  fetchContactsFromCloud,
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
        if (user.displayName) {
          setActiveCreatorName(user.displayName);
        }

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
          
          setVenues(cloudVenues);
          setBills(cloudBills);
          setDebts(getActiveDebts(cloudBills));
          setContacts(cloudContacts);

          // Save cloud data directly to user's local cache
          saveStoredVenues(cloudVenues, user.uid);
          saveStoredBills(cloudBills, user.uid);
          localStorage.setItem(`nhau_contacts_${user.uid}`, JSON.stringify(cloudContacts));
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
