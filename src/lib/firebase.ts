import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  setDoc, 
  updateDoc,
  deleteDoc, 
  query, 
  where,
  writeBatch,
  arrayUnion
} from 'firebase/firestore';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { Venue, Bill, SoloMeal } from '../types';

// Import config directly (supported natively by Vite)
import config from '../../firebase-applet-config.json';

const envApiKey = (import.meta as any).env?.VITE_FIREBASE_API_KEY;
const envAuthDomain = (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN;
const envProjectId = (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID;
const envStorageBucket = (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET;
const envMessagingSenderId = (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID;
const envAppId = (import.meta as any).env?.VITE_FIREBASE_APP_ID;
const envFirestoreDatabaseId = (import.meta as any).env?.VITE_FIREBASE_FIRESTORE_DATABASE_ID;

const firebaseConfig = {
  apiKey: envApiKey || config.apiKey,
  authDomain: envAuthDomain || config.authDomain,
  projectId: envProjectId || config.projectId,
  storageBucket: envStorageBucket || config.storageBucket,
  messagingSenderId: envMessagingSenderId || config.messagingSenderId,
  appId: envAppId || config.appId
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, envFirestoreDatabaseId || config.firestoreDatabaseId || "(default)");

// ==========================================
// TELEMETRY EXCEPTION HANDLER (SYSTEM SKILL)
// ==========================================
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('[Firestore Diagnostics Error]:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Recursive sanitizer to strip undefined values preventing Firestore setDoc/writeBatch errors
export function sanitizeFirestoreData<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeFirestoreData(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const cleanObj: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        cleanObj[key] = sanitizeFirestoreData(val);
      }
    }
    return cleanObj as T;
  }
  return data;
}

// Firestore utilities for sync
export const syncVenuesToCloud = async (userId: string, venues: Venue[]) => {
  try {
    const batch = writeBatch(db);
    venues.forEach((venue) => {
      const venueRef = doc(db, 'users', userId, 'venues', venue.id);
      batch.set(venueRef, sanitizeFirestoreData({ ...venue, userId }));
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/venues`);
  }
};

export const syncBillsToCloud = async (userId: string, bills: Bill[]) => {
  try {
    const batch = writeBatch(db);
    bills.forEach((bill) => {
      const billRef = doc(db, 'users', userId, 'bills', bill.id);
      batch.set(billRef, sanitizeFirestoreData({ ...bill, userId }));
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/bills`);
  }
};

export const fetchVenuesFromCloud = async (userId: string): Promise<Venue[]> => {
  try {
    const q = query(collection(db, 'users', userId, 'venues'));
    const querySnapshot = await getDocs(q);
    const venues: Venue[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      venues.push({
        id: doc.id,
        name: data.name || '',
        address: data.address || '',
        notes: data.notes || '',
        rating: data.rating || 0,
        visitsCount: data.visitsCount || 0
      });
    });
    return venues;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${userId}/venues`);
  }
};

export const fetchBillsFromCloud = async (userId: string): Promise<Bill[]> => {
  try {
    const q = query(collection(db, 'users', userId, 'bills'));
    const querySnapshot = await getDocs(q);
    const bills: Bill[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      bills.push({
        id: doc.id,
        venueId: data.venueId || '',
        venueName: data.venueName || '',
        date: data.date || '',
        rawAmount: data.rawAmount || 0,
        tipPercent: data.tipPercent || 0,
        tipAmount: data.tipAmount || 0,
        additionalFee: data.additionalFee || 0,
        discountAmount: data.discountAmount || 0,
        totalAmount: data.totalAmount || 0,
        splitType: data.splitType || 'equal',
        note: data.note || '',
        members: data.members || [],
        receiptImage: data.receiptImage || undefined,
        isArchived: data.isArchived || false
      });
    });
    return bills;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${userId}/bills`);
  }
};

export const saveVenueToCloud = async (userId: string, venue: Venue) => {
  try {
    const venueRef = doc(db, 'users', userId, 'venues', venue.id);
    await setDoc(venueRef, sanitizeFirestoreData({ ...venue, userId }));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/venues/${venue.id}`);
  }
};

export const saveBillToCloud = async (userId: string, bill: Bill) => {
  try {
    const billRef = doc(db, 'users', userId, 'bills', bill.id);
    await setDoc(billRef, sanitizeFirestoreData({ ...bill, userId }));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/bills/${bill.id}`);
  }
};

export const deleteVenueFromCloud = async (userId: string, venueId: string) => {
  try {
    const venueRef = doc(db, 'users', userId, 'venues', venueId);
    await deleteDoc(venueRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/venues/${venueId}`);
  }
};

export const deleteBillFromCloud = async (userId: string, billId: string) => {
  try {
    const billRef = doc(db, 'users', userId, 'bills', billId);
    await deleteDoc(billRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/bills/${billId}`);
  }
};

export const clearUserCloudData = async (userId: string) => {
  try {
    const subcollections = ['bills', 'venues', 'solo_meals', 'contacts', 'solo_settings'];
    for (const subcol of subcollections) {
      const q = query(collection(db, 'users', userId, subcol));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
    }
    console.log(`[Firestore] Successfully cleared cloud data for user ${userId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/[all]`);
  }
};

// ==========================================
// DZÔ QUÁN TỦ - COMMUNITY SHARING FEATURES
// ==========================================

export interface PublicVenue {
  id: string;
  name: string;
  address: string;
  notes?: string;
  rating: number; 
  ratingsCount: number;
  sharedByUid: string;
  sharedByName: string;
  createdAt: string;
}

export interface PublicVenueReview {
  id: string;
  authorId: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

// Fetch public shared venues
export const fetchPublicVenuesFromCloud = async (): Promise<PublicVenue[]> => {
  try {
    const q = query(collection(db, 'public_venues'));
    const querySnapshot = await getDocs(q);
    const venues: PublicVenue[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      venues.push({
        id: doc.id,
        name: data.name || '',
        address: data.address || '',
        notes: data.notes || '',
        rating: typeof data.rating === 'number' ? data.rating : 5,
        ratingsCount: typeof data.ratingsCount === 'number' ? data.ratingsCount : 0,
        sharedByUid: data.sharedByUid || '',
        sharedByName: data.sharedByName || 'Người dùng ẩn danh',
        createdAt: data.createdAt || new Date().toISOString()
      });
    });
    return venues;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'public_venues');
  }
};

// Share a venue to community public collection
export const shareVenueToCommunityCloud = async (
  venue: Omit<Venue, 'id' | 'visitsCount'>, 
  currentUserId: string, 
  currentUserName: string
): Promise<PublicVenue> => {
  const pubVenuesRef = collection(db, 'public_venues');
  const docRef = doc(pubVenuesRef);
  try {
    const pubVenue: PublicVenue = {
      id: docRef.id,
      name: venue.name,
      address: venue.address,
      notes: venue.notes || '',
      rating: venue.rating || 5,
      ratingsCount: 1,
      sharedByUid: currentUserId,
      sharedByName: currentUserName || 'Bợm nhậu ẩn danh',
      createdAt: new Date().toISOString()
    };
    
    await setDoc(docRef, sanitizeFirestoreData(pubVenue));
    
    // Auto populate first rating review
    const reviewRef = doc(collection(db, 'public_venues', docRef.id, 'reviews'));
    const initialReview: PublicVenueReview = {
      id: reviewRef.id,
      authorId: currentUserId,
      authorName: currentUserName || 'Bợm nhậu ẩn danh',
      rating: venue.rating || 5,
      comment: venue.notes || 'Quán ngon đỉnh chóp cực kỳ sầm uất và đắc địa!',
      createdAt: new Date().toISOString()
    };
    await setDoc(reviewRef, sanitizeFirestoreData(initialReview));
    
    return pubVenue;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `public_venues/${docRef.id}`);
  }
};

// Fetch reviews for a specific public venue
export const fetchPublicVenueReviewsFromCloud = async (venueId: string): Promise<PublicVenueReview[]> => {
  try {
    const q = query(collection(db, 'public_venues', venueId, 'reviews'));
    const querySnapshot = await getDocs(q);
    const reviews: PublicVenueReview[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      reviews.push({
        id: doc.id,
        authorId: data.authorId || '',
        authorName: data.authorName || 'Người dấu tên 🤫',
        rating: typeof data.rating === 'number' ? data.rating : 5,
        comment: data.comment || '',
        createdAt: data.createdAt || new Date().toISOString()
      });
    });
    
    return reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `public_venues/${venueId}/reviews`);
  }
};

// Add a brand-new review and update public venue's overall scores
export const addPublicVenueReviewCloud = async (
  venueId: string,
  rating: number,
  comment: string,
  currentUserId: string,
  currentUserName: string
): Promise<PublicVenueReview> => {
  const reviewCollectionRef = collection(db, 'public_venues', venueId, 'reviews');
  const reviewDocRef = doc(reviewCollectionRef);
  try {
    const newReview: PublicVenueReview = {
      id: reviewDocRef.id,
      authorId: currentUserId,
      authorName: currentUserName,
      rating,
      comment,
      createdAt: new Date().toISOString()
    };
    
    await setDoc(reviewDocRef, sanitizeFirestoreData(newReview));
    
    // Calculate new averages
    const reviews = await fetchPublicVenueReviewsFromCloud(venueId);
    const ratingsCount = reviews.length;
    const totalSum = reviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = ratingsCount > 0 ? Number((totalSum / ratingsCount).toFixed(1)) : rating;
    
    const venueRef = doc(db, 'public_venues', venueId);
    await updateDoc(venueRef, {
      rating: avgRating,
      ratingsCount: ratingsCount
    });
    
    return newReview;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `public_venues/${venueId}/reviews/${reviewDocRef.id}`);
  }
};

// Save a bill to public_bills collection for shareable web links
export const savePublicBillToCloud = async (bill: Bill): Promise<void> => {
  try {
    const docRef = doc(db, 'public_bills', bill.id);
    const sanitized = sanitizeFirestoreData(bill);
    await setDoc(docRef, {
      ...sanitized,
      sharedAt: new Date().toISOString()
    });
  } catch (error) {
    console.warn("Could not save bill to public cloud, relying on URL encoding fallback:", error);
  }
};

// Fetch a public bill by ID from public_bills collection
export const fetchPublicBillFromCloud = async (billId: string): Promise<Bill | null> => {
  try {
    const docRef = doc(db, 'public_bills', billId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        venueId: data.venueId || 'shared-venue',
        venueName: data.venueName || 'Quán nhậu',
        totalAmount: data.totalAmount || 0,
        rawAmount: data.rawAmount || data.totalAmount || 0,
        tipPercent: data.tipPercent || 0,
        tipAmount: data.tipAmount || 0,
        additionalFee: data.additionalFee || 0,
        discountAmount: data.discountAmount || 0,
        date: data.date || new Date().toISOString(),
        members: Array.isArray(data.members) ? data.members : [],
        splitType: data.splitType || 'equal',
        note: data.note || '',
        receiptImage: data.receiptImage || undefined,
        isArchived: data.isArchived ?? false
      };
    }
    return null;
  } catch (error) {
    console.warn("Could not fetch public bill from cloud:", error);
    return null;
  }
};

// Google login Helper
export const signInWithGoogle = async (): Promise<FirebaseUser> => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

export { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
};
export type { FirebaseUser };

// ==========================================
// FCM PUSH NOTIFICATIONS UTILITIES
// ==========================================

export const getFirebaseMessaging = async () => {
  try {
    const supported = await isSupported();
    if (supported) {
      return getMessaging(app);
    }
  } catch (error) {
    console.error('Firebase Cloud Messaging is not supported on this browser context:', error);
  }
  return null;
};

export const saveFCMTokenToCloud = async (userName: string, token: string) => {
  const cleanName = userName.trim();
  if (!cleanName) return;

  // Detect if we have an active logged-in user at the moment
  const currentUser = auth.currentUser;
  const authMetadata = currentUser ? {
    userId: currentUser.uid,
    email: currentUser.email || null,
    isGuest: false
  } : {
    userId: null,
    email: null,
    isGuest: true
  };

  const lowerName = cleanName.toLowerCase();
  const tokenLowerRef = doc(db, 'user_fcm_tokens', lowerName);

  try {
    // Save with case-insensitive normalized document ID
    await setDoc(tokenLowerRef, {
      name: cleanName,
      tokens: arrayUnion(token),
      updatedAt: new Date().toISOString(),
      ...authMetadata
    }, { merge: true });

    // Also register under original name for complete redundancy
    if (cleanName !== lowerName) {
      const tokenOriginalRef = doc(db, 'user_fcm_tokens', cleanName);
      await setDoc(tokenOriginalRef, {
        name: cleanName,
        tokens: arrayUnion(token),
        updatedAt: new Date().toISOString(),
        ...authMetadata
      }, { merge: true });
    }

    console.log(`[FCM] Registered token for name: ${cleanName} | Status: ${currentUser ? 'Logged-In' : 'Guest'}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `user_fcm_tokens/${lowerName}`);
  }
};

export const getFCMTokensByUserName = async (userName: string): Promise<string[]> => {
  const cleanName = userName.trim();
  if (!cleanName) return [];

  const lowerName = cleanName.toLowerCase();
  
  try {
    // 1. Try lowercase matching (the default normalized approach)
    const lowerRef = doc(db, 'user_fcm_tokens', lowerName);
    const snapLower = await getDoc(lowerRef);
    if (snapLower.exists()) {
      const tokens = snapLower.data().tokens || [];
      if (tokens.length > 0) return tokens;
    }

    // 2. Fallback to exact casing match
    const origRef = doc(db, 'user_fcm_tokens', cleanName);
    const snapOrig = await getDoc(origRef);
    if (snapOrig.exists()) {
      return snapOrig.data().tokens || [];
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `user_fcm_tokens/${lowerName}`);
  }
  return [];
};

// ==========================================
// NHẬU SOLO - PERSONAL EXPENSE TRACKING
// ==========================================

export const fetchSoloMealsFromCloud = async (userId: string): Promise<SoloMeal[]> => {
  try {
    const q = query(collection(db, 'users', userId, 'solo_meals'));
    const querySnapshot = await getDocs(q);
    const meals: SoloMeal[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      meals.push({
        id: doc.id,
        name: data.name || '',
        venueName: data.venueName || '',
        date: data.date || '',
        rawAmount: data.rawAmount || 0,
        drinkAmount: data.drinkAmount || 0,
        otherAmount: data.otherAmount || 0,
        totalAmount: data.totalAmount || 0,
        note: data.note || ''
      });
    });
    return meals;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${userId}/solo_meals`);
  }
};

export const saveSoloMealToCloud = async (userId: string, meal: SoloMeal) => {
  try {
    const mealRef = doc(db, 'users', userId, 'solo_meals', meal.id);
    await setDoc(mealRef, sanitizeFirestoreData({ ...meal, userId }));
    console.log(`[Firestore] Successfully saved solo meal ${meal.id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/solo_meals/${meal.id}`);
  }
};

export const deleteSoloMealFromCloud = async (userId: string, mealId: string) => {
  try {
    const mealRef = doc(db, 'users', userId, 'solo_meals', mealId);
    await deleteDoc(mealRef);
    console.log(`[Firestore] Successfully deleted solo meal ${mealId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/solo_meals/${mealId}`);
  }
};

export const saveSoloBudgetToCloud = async (userId: string, budget: number) => {
  try {
    const budgetRef = doc(db, 'users', userId, 'solo_settings', 'settings');
    await setDoc(budgetRef, sanitizeFirestoreData({ monthlyBudget: budget }));
    console.log(`[Firestore] Successfully saved solo budget to ${budget}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/solo_settings/settings`);
  }
};

export const fetchSoloBudgetFromCloud = async (userId: string): Promise<number | null> => {
  try {
    const budgetRef = doc(db, 'users', userId, 'solo_settings', 'settings');
    const budgetSnap = await getDoc(budgetRef);
    if (budgetSnap.exists()) {
      return budgetSnap.data().monthlyBudget || null;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}/solo_settings/settings`);
  }
  return null;
};

export const fetchContactsFromCloud = async (userId: string): Promise<Record<string, { phone?: string; messenger?: string }>> => {
  try {
    const q = query(collection(db, 'users', userId, 'contacts'));
    const querySnapshot = await getDocs(q);
    const contactsMap: Record<string, { phone?: string; messenger?: string }> = {};
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      contactsMap[doc.id] = {
        phone: data.phone || '',
        messenger: data.messenger || ''
      };
    });
    return contactsMap;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${userId}/contacts`);
  }
};

export const saveContactToCloud = async (userId: string, name: string, phone: string, messenger: string) => {
  try {
    const contactRef = doc(db, 'users', userId, 'contacts', name);
    await setDoc(contactRef, sanitizeFirestoreData({
      phone: phone.trim(),
      messenger: messenger.trim(),
      updatedAt: new Date().toISOString()
    }));
    console.log(`[Firestore] Successfully saved contact ${name}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/contacts/${name}`);
  }
};

export const deleteContactFromCloud = async (userId: string, name: string) => {
  try {
    const contactRef = doc(db, 'users', userId, 'contacts', name);
    await deleteDoc(contactRef);
    console.log(`[Firestore] Successfully deleted contact ${name}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/contacts/${name}`);
  }
};

export const syncContactsToCloud = async (userId: string, contacts: Record<string, { phone?: string; messenger?: string }>) => {
  try {
    const batch = writeBatch(db);
    Object.entries(contacts).forEach(([name, data]) => {
      const contactRef = doc(db, 'users', userId, 'contacts', name);
      batch.set(contactRef, sanitizeFirestoreData({
        phone: (data.phone || '').trim(),
        messenger: (data.messenger || '').trim(),
        updatedAt: new Date().toISOString()
      }));
    });
    await batch.commit();
    console.log(`[Firestore] Successfully batch synced ${Object.keys(contacts).length} contacts.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/contacts [batch]`);
  }
};


