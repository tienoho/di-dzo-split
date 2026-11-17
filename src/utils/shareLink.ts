import { Bill } from '../types';
import { auth, savePublicBillToCloud, fetchPublicBillFromCloud } from '../lib/firebase';

/**
 * Encode compact bill details into a base64 string safe for URLs (legacy/offline fallback)
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
      bn: bill.bankName || 'mbbank',
      bno: bill.bankNo || '',
      ba: bill.bankAccountName || '',
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
 * Generate a clean, concise, short shareable web link to view a bill.
 * Automatically saves the enriched bill to Cloud Firestore `public_bills`.
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

  // A short link is valid only after Firestore acknowledges the write.
  try {
    await savePublicBillToCloud(enrichedBill);
    return `${origin}?b=${encodeURIComponent(enrichedBill.id)}`;
  } catch (error) {
    // Guests and offline users can still share a self-contained legacy URL.
    // Do not claim that a short cloud link exists when the write failed.
    // Signed-in owners should not silently bypass revocation with a public portable link.
    if (auth.currentUser) throw error;
    console.warn('[Share link] Cloud unavailable; using portable URL fallback:', error);
    const encoded = compressBillForUrl(enrichedBill);
    if (!encoded) {
      throw new Error('Không thể tạo liên kết hóa đơn. Vui lòng thử lại.');
    }
    return `${origin}?bill=${encoded}`;
  }
}

/**
 * Resolve a bill from either a Short Bill ID or Legacy Compressed URL parameter
 */
export async function resolveBillFromUrl(search: string): Promise<Bill | null> {
  const params = new URLSearchParams(search);
  const paramVal = params.get('b') || params.get('bill') || params.get('billId');
  if (!paramVal) return null;

  // A revoked or expired short link must never fall back to local cache.
  if (params.has('b') || params.has('billId')) {
    if (paramVal.length > 128 || paramVal.includes('/')) return null;
    return fetchPublicBillFromCloud(paramVal);
  }

  // Legacy portable links are self-contained and cannot be remotely revoked.
  if (params.has('bill')) {
    if (paramVal.length > 12000) return null;
    return decompressBillFromUrl(paramVal);
  }

  return null;
}
