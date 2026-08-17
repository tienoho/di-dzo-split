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
      // First check local storage or Vite environment variable
      const envKey = ((import.meta as any).env?.VITE_FCM_VAPID_KEY as string | undefined);
      const existingKey = localStorage.getItem('nhau_fcm_vapid_key') || envKey;
      if (existingKey) {
        if (!localStorage.getItem('nhau_fcm_vapid_key') && envKey) {
          localStorage.setItem('nhau_fcm_vapid_key', envKey);
        }
        return;
      }

      try {
        const response = await fetch('/api/fcm-vapid');
        if (!response.ok) return;
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) return;

        const data = await response.json();
        if (data && data.success && data.key) {
          localStorage.setItem('nhau_fcm_vapid_key', data.key);
          console.log('[FCM client] Automatically bound FCM VAPID Key from server environment.');
          window.dispatchEvent(new Event('storage')); // Notify all components
        }
      } catch (err) {
        // Silently ignore serverless endpoint absences
        console.warn('[FCM client] Auto-fetching VAPID Key skipped:', err);
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
        
        // Clean out invalid keys (e.g. Firebase API Keys starting with AIzaSy or too short)
        if (vapidKey && (vapidKey.startsWith('AIzaSy') || vapidKey.length < 50)) {
          console.warn('[FCM client] Invalid VAPID Key in storage, clearing:', vapidKey);
          localStorage.removeItem('nhau_fcm_vapid_key');
          vapidKey = undefined;
        }

        if (!vapidKey) {
          try {
            const res = await fetch('/api/fcm-vapid');
            if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
              const data = await res.json();
              if (data && data.success && data.key && !data.key.startsWith('AIzaSy') && data.key.length >= 50) {
                vapidKey = data.key;
                localStorage.setItem('nhau_fcm_vapid_key', data.key);
                window.dispatchEvent(new Event('storage')); // Notify all listening components
              }
            }
          } catch (fetchErr) {
            console.warn('[FCM client] Direct VAPID fetch fallback skipped:', fetchErr);
          }
        }
        
        let token = '';
        const { getToken } = await import('firebase/messaging');
        try {
          if (vapidKey) {
            token = await getToken(messaging, { vapidKey });
          } else {
            token = await getToken(messaging);
          }
        } catch (e: any) {
          const errMsg = e?.message || String(e);
          if (errMsg.includes('applicationServerKey') || errMsg.includes('subscribe')) {
            console.warn('[FCM client] VAPID Key invalid, falling back to default:', e);
            localStorage.removeItem('nhau_fcm_vapid_key');
            try {
              token = await getToken(messaging);
            } catch (fallbackErr) {
              console.warn('[FCM client] Fallback token request skipped:', fallbackErr);
              return;
            }
          } else {
            console.warn('[FCM client] Standard FCM token registration skipped:', e);
            return;
          }
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
