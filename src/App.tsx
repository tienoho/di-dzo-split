import React, { useState, useEffect } from 'react';
import { getStoredVenues, saveStoredVenues, getStoredBills, saveStoredBills, getActiveDebts } from './utils/storage';
import { Bill, Venue, Debt } from './types';
import BillSplitter from './components/BillSplitter';
import VenueManager from './components/VenueManager';
import HistoryAndReports from './components/HistoryAndReports';
import DebtReminders from './components/DebtReminders';
import AIRecommendations from './components/AIRecommendations';
import SoloDining from './components/SoloDining';
import ContactManager from './components/ContactManager';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator, Store, Calendar, Bell, Wine, Beer, DollarSign, TrendingUp, Sparkles, User, Settings, Info, Sun, Moon, LogIn, LogOut, UserCheck, Coins, Users } from 'lucide-react';
import { 
  auth, 
  onAuthStateChanged, 
  signOut, 
  FirebaseUser,
  fetchVenuesFromCloud,
  fetchBillsFromCloud,
  saveVenueToCloud,
  saveBillToCloud,
  deleteVenueFromCloud,
  deleteBillFromCloud,
  fetchContactsFromCloud,
  saveContactToCloud,
  deleteContactFromCloud,
  syncContactsToCloud
} from './lib/firebase';
import AuthModal from './components/AuthModal';

export default function App() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  
  // Auth states
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'split' | 'venues' | 'history' | 'reminders' | 'recommendations' | 'solo' | 'contacts'>('split');

  // Contacts State
  const [contacts, setContacts] = useState<Record<string, { phone?: string; messenger?: string }>>(() => {
    const local = localStorage.getItem('nhau_contacts');
    if (local) {
      try { return JSON.parse(local); } catch (e) { return {}; }
    }
    return {};
  });

  const handleSaveContact = async (name: string, phone: string, messenger: string) => {
    const updated = {
      ...contacts,
      [name]: { phone: phone.trim(), messenger: messenger.trim() }
    };
    setContacts(updated);
    localStorage.setItem('nhau_contacts', JSON.stringify(updated));

    if (currentUser) {
      try {
        await saveContactToCloud(currentUser.uid, name, phone, messenger);
      } catch (e) {
        console.error("Failed to sync contact to cloud:", e);
      }
    }
  };

  const handleDeleteContact = async (name: string) => {
    const updated = { ...contacts };
    delete updated[name];
    setContacts(updated);
    localStorage.setItem('nhau_contacts', JSON.stringify(updated));

    if (currentUser) {
      try {
        await deleteContactFromCloud(currentUser.uid, name);
      } catch (e) {
        console.error("Failed to delete contact from cloud:", e);
      }
    }
  };
  
  // Current user configuration settings
  const [activeCreatorName, setActiveCreatorName] = useState<string>('Tuấn Anh (Bạn)');
  
  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('nhau_dark_mode') === 'true';
  });

  // Track dark mode class on document element
  useEffect(() => {
    localStorage.setItem('nhau_dark_mode', String(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);
  
  // System alert / Push notification state
  const [systAlert, setSystAlert] = useState<{ title: string; message: string; type: 'warning' | 'info' | 'success'; debtId?: string } | null>(null);

  // Auth State Listener & Cloud Sync
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
            
            const { syncVenuesToCloud, syncBillsToCloud, syncContactsToCloud } = await import('./lib/firebase');
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
  }, []);

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
        const { getFirebaseMessaging, saveFCMTokenToCloud } = await import('./lib/firebase');
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

  // Monitor debts to trigger push notification when user has an outstanding debt
  useEffect(() => {
    if (debts.length === 0) return;

    // Check if user has outstanding debts
    const myOutstanding = debts.filter(d => 
      d.debtorName.toLowerCase().trim() === activeCreatorName.toLowerCase().trim() && !d.isPaid
    );

    if (myOutstanding.length > 0) {
      const key = `notified_sessions_${activeCreatorName.replace(/\s+/g, '')}`;
      const notifiedRaw = sessionStorage.getItem(key) || '[]';
      let notifiedList: string[] = [];
      try {
        notifiedList = JSON.parse(notifiedRaw);
      } catch (e) {
        notifiedList = [];
      }

      const unnotified = myOutstanding.filter(d => !notifiedList.includes(d.id));

      if (unnotified.length > 0) {
        unnotified.forEach((debt) => {
          const title = `🚨 Nhắc Nợ: Bạn có khoản nợ chưa trả!`;
          const body = `Hóa đơn ${debt.venueName} còn thiếu ${debt.amount.toLocaleString('vi-VN')} đ chưa thanh toán cho ${debt.creditorName}.`;

          // 1. Browser Native Push Notification
          if ('Notification' in window) {
            if (Notification.permission === 'granted') {
              try {
                new Notification(title, {
                  body: body,
                  icon: 'https://cdn-icons-png.flaticon.com/512/3135/3135706.png',
                });
              } catch (e) {
                console.error("Error creating Notification: ", e);
              }
            } else if (Notification.permission !== 'denied') {
              Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                  new Notification(title, {
                    body: body,
                    icon: 'https://cdn-icons-png.flaticon.com/512/3135/3135706.png',
                  });
                }
              });
            }
          }

          // 2. Play double-ding sound
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gainSym = ctx.createGain();
            osc.connect(gainSym);
            gainSym.connect(ctx.destination);
            
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            gainSym.gain.setValueAtTime(0.06, ctx.currentTime);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
            
            setTimeout(() => {
              const osc2 = ctx.createOscillator();
              const gainSym2 = ctx.createGain();
              osc2.connect(gainSym2);
              gainSym2.connect(ctx.destination);
              osc2.frequency.setValueAtTime(783.99, ctx.currentTime); // G5
              gainSym2.gain.setValueAtTime(0.06, ctx.currentTime);
              osc2.start();
              osc2.stop(ctx.currentTime + 0.18);
            }, 100);
          } catch (e) {
            console.log('Audio chime blocked or unsupported');
          }

          // 3. Set visual toast
          setSystAlert({
            title: 'THÔNG BÁO TỨ THÌ (PUSH) 📬',
            message: body,
            type: 'warning',
            debtId: debt.id
          });
          
          notifiedList.push(debt.id);
        });

        sessionStorage.setItem(key, JSON.stringify(notifiedList));
      }
    }
  }, [debts, activeCreatorName]);

  // Periodic 24h+ Unpaid Bill Reminder System (HTML5 Browser Notification + Custom Toast fallback)
  useEffect(() => {
    let timerId: NodeJS.Timeout;
    let initialTimeoutId: NodeJS.Timeout;

    const checkUnpaidReminders = () => {
      const isEnabled = localStorage.getItem('nhau_push_enabled') !== 'false';
      if (!isEnabled) return;

      const intervalType = localStorage.getItem('nhau_push_interval') || '24h';
      let intervalMs = 24 * 60 * 60 * 1000; // default 24h
      if (intervalType === '12h') intervalMs = 12 * 60 * 60 * 1000;
      else if (intervalType === '1h') intervalMs = 1 * 60 * 60 * 1000;
      else if (intervalType === '5m') intervalMs = 5 * 60 * 1000;
      else if (intervalType === '1m') intervalMs = 1 * 60 * 1000;

      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours threshold

      // Filter active (unarchived) bills
      const activeUnpaidBills = bills.filter(b => !b.isArchived);

      activeUnpaidBills.forEach((bill) => {
        const billTime = new Date(bill.date).getTime();
        const ageMs = now - billTime;

        // Verify if the bill is > 24 hours old
        if (ageMs < twentyFourHours) return;

        // Find members who haven't paid their share (owes > 0 and hasPaidDebt is false)
        const unpaidDebtors = bill.members.filter(m => m.initialPaid < m.finalShare && !m.hasPaidDebt);
        if (unpaidDebtors.length === 0) return; // Perfect, all settled

        // Find the host / creditor (who paid for this bill)
        const creditors = bill.members.filter(m => m.initialPaid > m.finalShare);
        const creditor = creditors[0] || { name: 'Chủ bàn' };

        const userClean = activeCreatorName.toLowerCase().trim();
        const isUserCreditor = creditor.name.toLowerCase().trim() === userClean;
        const matchingDebtor = unpaidDebtors.find(d => d.name.toLowerCase().trim() === userClean);

        let title = '';
        let body = '';
        let trackingKey = '';

        if (isUserCreditor) {
          // Current user is the creditor reminding them of friends who haven't paid
          const unpaidNames = unpaidDebtors.map(d => d.name).join(', ');
          title = `⏱️ Quá 24 Giờ: Hóa Đơn Trễ Hạn!`;
          body = `Cuộc nhậu "${bill.venueName}" còn chiến hữu (${unpaidNames}) chưa trả tiền. Click để hối đòi sòng phẳng!`;
          trackingKey = `creditor_remind_24h_${bill.id}`;
        } else if (matchingDebtor) {
          // Current user is the debtor who hasn't paid
          const owedAmount = matchingDebtor.finalShare - matchingDebtor.initialPaid;
          title = `⏳ Chưa Trả Tiền: Cuộc Nhậu >24h!`;
          body = `Bạn còn thiếu ${owedAmount.toLocaleString('vi-VN')} đ tại "${bill.venueName}" chưa gửi trả cho ${creditor.name}.`;
          trackingKey = `debtor_remind_24h_${bill.id}`;
        } else {
          return; // User is not involved or has paid their share
        }

        // Handle rate limiting using localStorage timestamp
        const lastNotified = localStorage.getItem(`nhau_notified_ts_${trackingKey}`);
        const lastNotifiedTime = lastNotified ? parseInt(lastNotified, 10) : 0;

        if (now - lastNotifiedTime >= intervalMs) {
          // 1. Desktop Notification
          if ('Notification' in window) {
            if (Notification.permission === 'granted') {
              try {
                new Notification(title, {
                  body: body,
                  icon: 'https://cdn-icons-png.flaticon.com/512/3135/3135706.png',
                  tag: trackingKey // merge identical notices on system tray
                });
              } catch (e) {
                console.error("Error creating Notification: ", e);
              }
            }
          }

          // 2. Play alert chime
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gainSym = ctx.createGain();
            osc.connect(gainSym);
            gainSym.connect(ctx.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
            gainSym.gain.setValueAtTime(0.05, ctx.currentTime);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
            
            setTimeout(() => {
              const osc2 = ctx.createOscillator();
              const gainSym2 = ctx.createGain();
              osc2.connect(gainSym2);
              gainSym2.connect(ctx.destination);
              osc2.type = 'triangle';
              osc2.frequency.setValueAtTime(554.37, ctx.currentTime); // C#5
              gainSym2.gain.setValueAtTime(0.05, ctx.currentTime);
              osc2.start();
              osc2.stop(ctx.currentTime + 0.25);
            }, 120);
          } catch (e) {}

          // 3. Set visual toast
          setSystAlert({
            title: 'NHẮC NỢ ĐỊNH KỲ (>24H) ⏰',
            message: body,
            type: 'warning'
          });

          // Save tracking value to prevent spam
          localStorage.setItem(`nhau_notified_ts_${trackingKey}`, String(now));
        }
      });
    };

    // Run first check 6 seconds after mount
    initialTimeoutId = setTimeout(checkUnpaidReminders, 6000);

    // Watch for interval checks dynamically
    timerId = setInterval(checkUnpaidReminders, 25000); // check status every 25 seconds for dynamic feel

    // Listen to local 'storage' events to immediately apply changes
    window.addEventListener('storage', checkUnpaidReminders);

    return () => {
      clearTimeout(initialTimeoutId);
      clearInterval(timerId);
      window.removeEventListener('storage', checkUnpaidReminders);
    };
  }, [bills, activeCreatorName]);

  // Sync state helpers
  const handleAddVenue = (newVenue: Omit<Venue, 'id' | 'visitsCount'>): Venue => {
    const freshVenue: Venue = {
      ...newVenue,
      id: `venue-${Date.now()}`,
      visitsCount: 0
    };
    const updated = [...venues, freshVenue];
    setVenues(updated);

    if (!currentUser) {
      saveStoredVenues(updated);
    } else {
      saveVenueToCloud(currentUser.uid, freshVenue).catch(console.error);
    }
    return freshVenue;
  };

  const handleDeleteVenue = (id: string) => {
    const updated = venues.filter(v => v.id !== id);
    setVenues(updated);

    if (!currentUser) {
      saveStoredVenues(updated);
    } else {
      deleteVenueFromCloud(currentUser.uid, id).catch(console.error);
    }
  };

  const handleSaveBill = (newBill: Omit<Bill, 'id'>) => {
    const freshBill: Bill = {
      ...newBill,
      id: `bill-${Date.now()}`
    };
    
    // Update venue counter visits dynamically if assigned
    if (freshBill.venueId !== 'unknown') {
      const updatedVenues = venues.map(v => {
        if (v.id === freshBill.venueId) {
          const updatedVisits = { ...v, visitsCount: v.visitsCount + 1 };
          if (currentUser) {
            saveVenueToCloud(currentUser.uid, updatedVisits).catch(console.error);
          }
          return updatedVisits;
        }
        return v;
      });
      setVenues(updatedVenues);
      if (!currentUser) {
        saveStoredVenues(updatedVenues);
      }
    }

    const updatedBills = [freshBill, ...bills];
    setBills(updatedBills);
    if (!currentUser) {
      saveStoredBills(updatedBills);
    } else {
      saveBillToCloud(currentUser.uid, freshBill).catch(console.error);
    }
    setDebts(getActiveDebts(updatedBills));
  };

  const handleDeleteBill = (id: string) => {
    // Subtract venue visits counter first
    const targetBill = bills.find(b => b.id === id);
    if (targetBill && targetBill.venueId !== 'unknown') {
      const updatedVenues = venues.map(v => {
        if (v.id === targetBill.venueId) {
          const updatedVisits = { ...v, visitsCount: Math.max(0, v.visitsCount - 1) };
          if (currentUser) {
            saveVenueToCloud(currentUser.uid, updatedVisits).catch(console.error);
          }
          return updatedVisits;
        }
        return v;
      });
      setVenues(updatedVenues);
      if (!currentUser) {
        saveStoredVenues(updatedVenues);
      }
    }

    const updatedBills = bills.filter(b => b.id !== id);
    setBills(updatedBills);
    if (!currentUser) {
      saveStoredBills(updatedBills);
    } else {
      deleteBillFromCloud(currentUser.uid, id).catch(console.error);
    }
    setDebts(getActiveDebts(updatedBills));
  };

  const handleArchiveBill = (id: string, isArchived: boolean = true) => {
    const updatedBills = bills.map(b => {
      if (b.id === id) {
        const updatedBill = { ...b, isArchived };
        if (currentUser) {
          saveBillToCloud(currentUser.uid, updatedBill).catch(console.error);
        }
        return updatedBill;
      }
      return b;
    });

    setBills(updatedBills);
    if (!currentUser) {
      saveStoredBills(updatedBills);
    }
    setDebts(getActiveDebts(updatedBills));
  };

  const handleMarkDebtAsPaid = (billId: string, debtorName: string) => {
    // We locate the bill, toggle the specific member owes status hasPaidDebt
    const updatedBills = bills.map(bill => {
      if (bill.id === billId) {
        const updatedBill = {
          ...bill,
          members: bill.members.map(member => 
            member.name === debtorName ? { ...member, hasPaidDebt: !member.hasPaidDebt } : member
          )
        };
        
        if (currentUser) {
          saveBillToCloud(currentUser.uid, updatedBill).catch(console.error);
        }
        return updatedBill;
      }
      return bill;
    });

    setBills(updatedBills);
    if (!currentUser) {
      saveStoredBills(updatedBills);
    }
    setDebts(getActiveDebts(updatedBills));
  };

  // Quick stats panel
  const totalAmountSplitted = bills.reduce((acc, b) => acc + b.totalAmount, 0);
  const unpaidDebtsLength = debts.filter(d => !d.isPaid).length;
  const totalUnpaidDebtsAmount = debts.filter(d => !d.isPaid).reduce((acc, d) => acc + d.amount, 0);

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-yellow-50 text-slate-800'} antialiased font-sans pb-12 transition-colors duration-300`}>
      
      {/* SYSTEM-WIDE PUSH NOTIFICATION ALERT TOAST */}
      <AnimatePresence>
        {systAlert && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 left-4 right-4 md:left-auto md:right-5 md:w-[420px] bg-slate-900 border-4 border-slate-950 text-white p-5 rounded-[24px] shadow-2xl z-50 flex items-start gap-4"
          >
            <div className="bg-orange-500 border-2 border-slate-950 p-2.5 rounded-2xl flex-shrink-0 animate-bounce">
              <Bell className="w-5 h-5 text-slate-950 animate-pulse" />
            </div>
            
            <div className="flex-1 min-w-0 space-y-1">
              <span className="text-[9px] uppercase font-black text-orange-400 tracking-widest block font-mono">
                {systAlert.title}
              </span>
              <p className="text-xs font-black text-slate-100 leading-relaxed">
                {systAlert.message}
              </p>
              <div className="flex items-center gap-2 pt-1.5">
                <button
                  onClick={() => {
                    setActiveTab('reminders');
                    setSystAlert(null);
                  }}
                  className="bg-orange-500 hover:bg-orange-600 text-slate-950 text-[10px] font-black px-3.5 py-1.5 rounded-xl border border-slate-950 transition-all cursor-pointer shadow-sm"
                >
                  Xem Cực Nhanh 🔍
                </button>
                <button
                  onClick={() => setSystAlert(null)}
                  className="bg-transparent hover:bg-white/10 text-slate-300 hover:text-white text-[10px] font-black px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                >
                  Bỏ qua
                </button>
              </div>
            </div>
            
            <button
              onClick={() => setSystAlert(null)}
              className="text-slate-400 hover:text-slate-200 text-xs font-bold cursor-pointer p-0.5"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* HEADER MASTER TITLE BRAND BAR - VIBRANT PALETTE */}
      <header className="max-w-7xl mx-auto px-4 pt-8 pb-4 relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 self-start md:self-auto">
          <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-6 transition-all duration-300">
            <span className="text-white font-black text-3xl">Đ!</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black tracking-tight text-slate-900">
                Dzô! <span className="text-orange-500">Split</span>
              </h1>
              <span className="bg-orange-150 text-orange-600 text-[10px] uppercase tracking-wider font-black px-2 py-1 rounded-full border-2 border-orange-200">
                Lên Đồ Sòng Phẳng
              </span>
            </div>
            <p className="text-xs font-bold text-slate-500 mt-1">
              Phần mềm chia tiền mồi nước và phục vụ cực chuẩn cho cuộc vui sướng 🍻
            </p>
          </div>
        </div>

        {/* Quick Profile & Dark Mode Toggle Section */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          {/* Dark Mode toggle Button */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-3 bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 rounded-full shadow-sm hover:bg-yellow-100 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center text-slate-800 dark:text-yellow-400 group flex-shrink-0"
            title={isDarkMode ? "Chuyển sang Giao diện Sáng ☀️" : "Chuyển sang Giao diện Tối 🌙"}
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
            )}
          </button>

          {/* Authentication System Controls */}
          {currentUser ? (
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 rounded-full px-3.5 py-1.5 shadow-xs flex-shrink-0">
              <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-xs text-white border border-emerald-600">
                <UserCheck className="w-3.5 h-3.5" />
              </div>
              <div className="text-left hidden sm:block">
                <span className="text-[8px] uppercase font-black text-emerald-500 block leading-none">CẬP NHẬT ĐÁM MÂY ☁️</span>
                <span className="text-[10px] font-black text-slate-800 dark:text-emerald-300 max-w-[120px] truncate block leading-tight">{currentUser.displayName || currentUser.email}</span>
              </div>
              <button
                onClick={() => signOut(auth)}
                className="p-1 px-1.5 ml-1 bg-slate-200 dark:bg-slate-800 hover:bg-red-200 dark:hover:bg-red-900/60 rounded-full hover:text-red-650 transition-all cursor-pointer border border-transparent dark:border-slate-700"
                title="Đăng xuất tài khoản"
              >
                <LogOut className="w-3 h-3 text-slate-600 dark:text-slate-300" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 border-2 border-slate-950 text-slate-950 font-black text-xs uppercase tracking-tight px-4 py-2.5 rounded-full transition-all hover:-translate-y-0.5 cursor-pointer shadow-md flex-shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập mây ☁️</span>
            </button>
          )}

          {/* Quick Profile config info - Vibrant Palette Styled */}
          <div className="flex items-center space-x-3 bg-white dark:bg-slate-900 px-4 py-2 rounded-full shadow-sm border-2 border-yellow-105 dark:border-slate-800 w-full sm:w-auto flex-1 md:flex-initial">
            <div className="w-8 h-8 bg-teal-400 rounded-full border-2 border-white flex items-center justify-center text-slate-900 font-extrabold text-xs shadow-inner">
              👤
            </div>
            <div className="flex-1 md:flex-initial text-left">
              <span className="text-[8px] uppercase font-black text-slate-400 block tracking-wider leading-none">Chủ trì cầm quỹ:</span>
              <input
                type="text"
                value={activeCreatorName}
                onChange={(e) => setActiveCreatorName(e.target.value)}
                onBlur={async () => {
                  if (currentUser && activeCreatorName.trim()) {
                    try {
                      const { updateProfile } = await import('./lib/firebase');
                      await updateProfile(currentUser, { displayName: activeCreatorName.trim() });
                      console.log('Successfully updated cloud user display name to:', activeCreatorName.trim());
                    } catch (e) {
                      console.error('Error updating profile display name:', e);
                    }
                  }
                }}
                placeholder="Nhập tên"
                className="text-xs font-black text-teal-600 dark:text-teal-400 bg-transparent outline-none w-full sm:w-28 border-b border-dashed border-teal-200 focus:border-teal-450 pb-0.5"
                title="Thay đổi tên chủ phòng để các thông báo nhắc nợ gán đúng STK của bạn!"
              />
            </div>
          </div>
        </div>
      </header>

      {/* HIGH CONTRAST FINANCIAL LEDGER OVERVIEW STATS */}
      <div className="max-w-7xl mx-auto px-4 mb-6">
        <div className="bg-slate-900 text-white rounded-[32px] p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-12 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-6 items-center">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest block">Tổng cuộc quây</span>
              <div className="flex items-center gap-2">
                <Wine className="w-4 h-4 text-amber-400" />
                <span className="text-lg font-black text-white">{bills.length} cuộc nhậu</span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest block">Địa bàn quán ngon</span>
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-teal-400" />
                <span className="text-lg font-black text-white">{venues.length} quán tủ</span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest block">F1 chưa trả nợ</span>
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-orange-400 animate-swing" />
                <span className="text-lg font-black text-orange-400">{unpaidDebtsLength} đồng chí</span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest block">Dư nợ tồn đọng</span>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-lg font-black text-emerald-400">{totalUnpaidDebtsAmount.toLocaleString('vi-VN')} đ</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PRIMARY TAB SELECTOR CONTROLLER */}
      <nav className="max-w-7xl mx-auto px-4 mb-8">
        <div className="bg-white rounded-3xl p-2 shadow-md border-2 border-yellow-100 flex overflow-x-auto scrollbar-none gap-2">
          
          {/* Tab: Split */}
          <button
            onClick={() => setActiveTab('split')}
            className={`flex items-center gap-2 py-3 px-5 rounded-2xl text-xs md:text-sm font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'split' 
                ? 'bg-orange-500 text-white shadow-md shadow-orange-200' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Chia Hóa Đơn & Tip</span>
          </button>

          {/* Tab: Reminders */}
          <button
            onClick={() => setActiveTab('reminders')}
            className={`relative flex items-center gap-2 py-3 px-5 rounded-2xl text-xs md:text-sm font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'reminders' 
                ? 'bg-blue-500 text-white shadow-md shadow-blue-200' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Đòi Nợ & VietQR</span>
            {unpaidDebtsLength > 0 && (
              <span className="bg-red-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center animate-bounce">
                {unpaidDebtsLength}
              </span>
            )}
          </button>

          {/* Tab: History */}
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 py-3 px-5 rounded-2xl text-xs md:text-sm font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'history' 
                ? 'bg-purple-500 text-white shadow-md shadow-purple-200' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Lịch Sử & Báo Cáo</span>
          </button>

          {/* Tab: Contacts */}
          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex items-center gap-2 py-3 px-5 rounded-2xl text-xs md:text-sm font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'contacts' 
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-200' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Danh Bạ Chiến Hữu</span>
          </button>

          {/* Tab: Venues */}
          <button
            onClick={() => setActiveTab('venues')}
            className={`flex items-center gap-2 py-3 px-5 rounded-2xl text-xs md:text-sm font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'venues' 
                ? 'bg-pink-500 text-white shadow-md shadow-pink-200' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Quán Quen Tủ</span>
          </button>

          {/* Tab: Recommendations */}
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`flex items-center gap-2 py-3 px-5 rounded-2xl text-xs md:text-sm font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'recommendations' 
                ? 'bg-amber-500 text-white shadow-md shadow-amber-200 animate-pulse' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="w-4 h-4 text-orange-200" />
            <span>Gợi Ý Quán AI 🤖</span>
          </button>

          {/* Tab: Solo eating expenditure tracker */}
          <button
            onClick={() => setActiveTab('solo')}
            className={`flex items-center gap-2 py-3 px-5 rounded-2xl text-xs md:text-sm font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'solo' 
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-250' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Coins className="w-4 h-4 text-emerald-200" />
            <span>Nhậu Solo & Ngân Sách 🍽️</span>
          </button>

        </div>
      </nav>

      {/* MAIN LAYOUT BODY CONTAINER WITH TRANSITIONS */}
      <main className="max-w-7xl mx-auto px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'split' && (
              <BillSplitter 
                venues={venues} 
                onAddVenue={handleAddVenue} 
                onSaveBill={handleSaveBill} 
                activeCreatorName={activeCreatorName}
                contacts={contacts}
              />
            )}

            {activeTab === 'venues' && (
              <VenueManager 
                venues={venues} 
                onAddVenue={handleAddVenue} 
                onDeleteVenue={handleDeleteVenue} 
                currentUser={currentUser}
                activeCreatorName={activeCreatorName}
              />
            )}

            {activeTab === 'history' && (
              <HistoryAndReports 
                bills={bills} 
                onDeleteBill={handleDeleteBill} 
                onArchiveBill={handleArchiveBill}
              />
            )}

            {activeTab === 'reminders' && (
              <DebtReminders 
                debts={debts} 
                onMarkDebtAsPaid={handleMarkDebtAsPaid} 
                activeCreatorName={activeCreatorName}
                currentUser={currentUser}
                contacts={contacts}
                onSaveContact={handleSaveContact}
              />
            )}

            {activeTab === 'contacts' && (
              <ContactManager 
                contacts={contacts} 
                onSaveContact={handleSaveContact} 
                onDeleteContact={handleDeleteContact} 
                currentUser={currentUser}
              />
            )}

            {activeTab === 'recommendations' && (
              <AIRecommendations 
                savedVenues={venues} 
                onAddVenue={handleAddVenue} 
              />
            )}

            {activeTab === 'solo' && (
              <SoloDining 
                venues={venues} 
                currentUser={currentUser} 
                activeCreatorName={activeCreatorName}
                bills={bills}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center mt-12 text-slate-400 text-xs font-semibold">
        <p>© 2026 Chia Tiền Nhậu - Built with ❤️ for Vietnam drinking communities.</p>
        <p className="mt-1 text-[10px] text-slate-300">Giải pháp sòng phẳng tối thượng, giữ trọn chân tình anh em.</p>
      </footer>

      {/* AUTH SYSTEM POPUP/MODAL */}
      <AnimatePresence>
        {showAuthModal && (
          <AuthModal 
            currentUser={currentUser}
            onClose={() => setShowAuthModal(false)}
            onSuccess={(user, name) => {
              setCurrentUser(user);
              setActiveCreatorName(name);
              setShowAuthModal(false);
            }}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
