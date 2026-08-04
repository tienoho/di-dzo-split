import { useEffect } from 'react';
import { FirebaseUser } from '../lib/firebase';

interface UseFCMProps {
  activeCreatorName: string;
  currentUser: FirebaseUser | null;
}

export function useFCM({ activeCreatorName, currentUser }: UseFCMProps) {
  // Automatically fetch and bind FCM VAPID key from backend server
  useEffect(() => {
    const fetchVapidKey = async () => {
      const existingKey = localStorage.getItem('nhau_fcm_vapid_key');
      if (!existingKey) {
        try {
          const response = await fetch('/api/fcm-vapid');
          const data = await response.json();
          if (data.success && data.key) {
            localStorage.setItem('nhau_fcm_vapid_key', data.key);
            console.log('[FCM client] Automatically bound FCM VAPID Key from server environment.');
            window.dispatchEvent(new Event('storage')); // Notify all components
          }
        } catch (err) {
          console.error('[FCM client] Error auto-fetching VAPID Key:', err);
        }
      }
    };
    fetchVapidKey();
  }, []);

  // Synchronize FCM Registration Token with Firestore mapping
  useEffect(() => {
    const registerFCM = async () => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      
      try {
        const { getFirebaseMessaging, saveFCMTokenToCloud } = await import('../lib/firebase');
        const messaging = await getFirebaseMessaging();
        if (!messaging) return;

        // Custom or dynamic user VAPID key
        let vapidKey = localStorage.getItem('nhau_fcm_vapid_key') || ((import.meta as any).env?.VITE_FCM_VAPID_KEY as string | undefined) || undefined;
        
        if (!vapidKey) {
          try {
            const res = await fetch('/api/fcm-vapid');
            const data = await res.json();
            if (data.success && data.key) {
              vapidKey = data.key;
              localStorage.setItem('nhau_fcm_vapid_key', data.key);
              window.dispatchEvent(new Event('storage')); // Notify all listening components
            }
          } catch (fetchErr) {
            console.warn('[FCM client] Direct VAPID fetch fallback failed:', fetchErr);
          }
        }
        
        let token = '';
        const { getToken } = await import('firebase/messaging');
        try {
          if (vapidKey) {
            token = await getToken(messaging, { vapidKey });
          } else {
            // Fallback: request without explicit key or catch
            token = await getToken(messaging);
          }
        } catch (e) {
          console.warn('[FCM client] VAPID Key required for standard FCM notifications in this context:', e);
          return;
        }

        if (token) {
          localStorage.setItem('nhau_my_fcm_token', token);
          if (activeCreatorName && activeCreatorName.trim() !== '') {
            await saveFCMTokenToCloud(activeCreatorName, token);
          }
        }
      } catch (err) {
        console.error('[FCM sync failed]', err);
      }
    };

    // Delay slight runtime registration to keep main thread light
    const registerTimerId = setTimeout(registerFCM, 4500);
    return () => clearTimeout(registerTimerId);
  }, [activeCreatorName, currentUser]);
}
