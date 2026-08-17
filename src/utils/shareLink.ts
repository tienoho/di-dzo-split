import { Bill } from '../types';
import { savePublicBillToCloud, fetchPublicBillFromCloud } from '../lib/firebase';

/**
 * Encode compact bill details into a base64 string safe for URLs
 */
export function compressBillForUrl(bill: Bill): string {
  try {
    const compact = {
      id: bill.id,
      v: bill.venueName,
      t: bill.totalAmount,
      r: bill.rawAmount,
      tip: bill.tipAmount,
      fee: bill.additionalFee,
      d: bill.discountAmount,
      dt: bill.date,
      n: bill.note || '',
      bn: bill.bankName || localStorage.getItem('nhau_bank_name') || 'mbbank',
      bno: bill.bankNo || localStorage.getItem('nhau_bank_no') || '',
      ba: bill.bankAccountName || localStorage.getItem('nhau_bank_account_name') || '',
      m: bill.members.map(m => ({
        n: m.name,
        p: m.initialPaid,
        s: m.finalShare,
        pn: m.penaltyAmount || 0,
        h: m.hasPaidDebt ? 1 : 0
      }))
    };
    const jsonStr = JSON.stringify(compact);
    // Base64 encoding compatible with UTF-8
    const utf8Bytes = new TextEncoder().encode(jsonStr);
    let binary = '';
    for (let i = 0; i < utf8Bytes.length; i++) {
      binary += String.fromCharCode(utf8Bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    console.error("Error compressing bill for URL:", e);
    return '';
  }
}

/**
 * Decompress a bill from URL base64 payload
 */
export function decompressBillFromUrl(encoded: string): Bill | null {
  try {
    // Restore standard base64 from URL-safe base64
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const jsonStr = new TextDecoder().decode(bytes);
    const data = JSON.parse(jsonStr);

    return {
      id: data.id || 'shared-' + Date.now(),
      venueId: data.vid || 'shared-venue',
      venueName: data.v || 'Quán nhậu',
      totalAmount: data.t || 0,
      rawAmount: data.r || data.t || 0,
      tipPercent: data.tp || 0,
      tipAmount: data.tip || 0,
      additionalFee: data.fee || 0,
      discountAmount: data.d || 0,
      date: data.dt || new Date().toISOString(),
      splitType: data.st || 'equal',
      note: data.n || '',
      bankName: data.bn || undefined,
      bankNo: data.bno || undefined,
      bankAccountName: data.ba || undefined,
      members: (data.m || []).map((m: any) => ({
        name: m.n || 'Thành viên',
        initialPaid: m.p || 0,
        finalShare: m.s || 0,
        penaltyAmount: m.pn || 0,
        hasPaidDebt: m.h === 1
      }))
    };
  } catch (e) {
    console.warn("Could not decompress bill from URL:", e);
    return null;
  }
}

/**
 * Generate a complete, shareable web link to view a bill.
 * Proactively saves to Cloud (for short link) and includes encoded fallback.
 */
export async function generateShareableBillUrl(bill: Bill): Promise<string> {
  const origin = window.location.origin + window.location.pathname;
  
  // Enrich with current host bank details if not already present
  const enrichedBill: Bill = {
    ...bill,
    bankName: bill.bankName || localStorage.getItem('nhau_bank_name') || 'mbbank',
    bankNo: bill.bankNo || localStorage.getItem('nhau_bank_no') || '',
    bankAccountName: bill.bankAccountName || localStorage.getItem('nhau_bank_account_name') || ''
  };

  // Save to public collection on Firebase
  savePublicBillToCloud(enrichedBill).catch(console.warn);

  const encodedPayload = compressBillForUrl(enrichedBill);
  if (encodedPayload) {
    return `${origin}?b=${encodedPayload}`;
  }
  return `${origin}?bill=${bill.id}`;
}

/**
 * Resolve a bill from either the URL parameter or Cloud storage
 */
export async function resolveBillFromUrl(search: string): Promise<Bill | null> {
  const params = new URLSearchParams(search);
  
  // 1. Try compressed payload (0ms instant offline decode)
  const encodedPayload = params.get('b');
  if (encodedPayload) {
    const decoded = decompressBillFromUrl(encodedPayload);
    if (decoded) return decoded;
  }

  // 2. Try bill ID from Firestore or Local Cache
  const billId = params.get('bill') || params.get('billId');
  if (billId) {
    const cloudBill = await fetchPublicBillFromCloud(billId);
    if (cloudBill) return cloudBill;
  }

  return null;
}
