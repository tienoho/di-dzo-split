import { useEffect } from 'react';
import { 
  auth, 
  onAuthStateChanged,
  fetchVenuesFromCloud,
  fetchBillsFromCloud,
  fetchContactsFromCloud,
  FirebaseUser
} from '../lib/firebase';
import { getStoredVenues, getStoredBills, getActiveDebts } from '../utils/storage';
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
        
        try {
          const cloudVenues = await fetchVenuesFromCloud(user.uid);
          const cloudBills = await fetchBillsFromCloud(user.uid);
          const cloudContacts = await fetchContactsFromCloud(user.uid);
          
          if (cloudVenues.length > 0 || cloudBills.length > 0 || Object.keys(cloudContacts).length > 0) {
            setVenues(cloudVenues);
            setBills(cloudBills);
            setDebts(getActiveDebts(cloudBills));
            setContacts(cloudContacts);
            localStorage.setItem('nhau_contacts', JSON.stringify(cloudContacts));
          } else {
            // New user scenario: auto-sync existing offline storage to active cloud
            const localVenues = getStoredVenues();
            const localBills = getStoredBills();
            const localContacts = JSON.parse(localStorage.getItem('nhau_contacts') || '{}');
            
            const { syncVenuesToCloud, syncBillsToCloud, syncContactsToCloud } = await import('../lib/firebase');
            if (localVenues.length > 0) {
              await syncVenuesToCloud(user.uid, localVenues);
            }
            if (localBills.length > 0) {
              await syncBillsToCloud(user.uid, localBills);
            }
            if (Object.keys(localContacts).length > 0) {
              await syncContactsToCloud(user.uid, localContacts);
            }
            setVenues(localVenues);
            setBills(localBills);
            setDebts(getActiveDebts(localBills));
            setContacts(localContacts);
          }
        } catch (err) {
          console.error("Error synchronizing with Firestore:", err);
          // Fallback to local
          const localVenues = getStoredVenues();
          const localBills = getStoredBills();
          const localContacts = JSON.parse(localStorage.getItem('nhau_contacts') || '{}');
          setVenues(localVenues);
          setBills(localBills);
          setDebts(getActiveDebts(localBills));
          setContacts(localContacts);
        }
      } else {
        setCurrentUser(null);
        // Clean session and reload offline guest records
        const localVenues = getStoredVenues();
        const localBills = getStoredBills();
        const localContacts = JSON.parse(localStorage.getItem('nhau_contacts') || '{}');
        setVenues(localVenues);
        setBills(localBills);
        setDebts(getActiveDebts(localBills));
        setContacts(localContacts);
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
