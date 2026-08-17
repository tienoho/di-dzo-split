import { Bill, Venue, Debt } from '../types';

// Default empty lists for fresh production deployment
const DEFAULT_VENUES: Venue[] = [];
const DEFAULT_BILLS: Bill[] = [];

const getStorageKey = (prefix: string, userId?: string): string => {
  return `${prefix}_${userId ? userId : 'guest'}`;
};

// Helper to save and load venues with user scoping
export const getStoredVenues = (userId?: string): Venue[] => {
  const key = getStorageKey('nhau_venues', userId);
  const local = localStorage.getItem(key);
  if (local) {
    try {
      return JSON.parse(local);
    } catch (e) {
      console.error(e);
    }
  }

  // Fallback migration for legacy un-scoped key
  if (!userId) {
    const legacy = localStorage.getItem('nhau_venues');
    if (legacy) {
      try {
        const parsed = JSON.parse(legacy);
        localStorage.setItem(key, legacy);
        return parsed;
      } catch (e) {}
    }
  }

  return DEFAULT_VENUES;
};

export const saveStoredVenues = (venues: Venue[], userId?: string) => {
  try {
    const key = getStorageKey('nhau_venues', userId);
    localStorage.setItem(key, JSON.stringify(venues));
  } catch (e) {
    console.warn('[Storage] Failed to save venues to localStorage (possibly quota exceeded):', e);
  }
};

// Helper to save and load bills with user scoping
export const getStoredBills = (userId?: string): Bill[] => {
  const key = getStorageKey('nhau_bills', userId);
  const local = localStorage.getItem(key);
  if (local) {
    try {
      return JSON.parse(local);
    } catch (e) {
      console.error(e);
    }
  }

  // Fallback migration for legacy un-scoped key
  if (!userId) {
    const legacy = localStorage.getItem('nhau_bills');
    if (legacy) {
      try {
        const parsed = JSON.parse(legacy);
        localStorage.setItem(key, legacy);
        return parsed;
      } catch (e) {}
    }
  }

  return DEFAULT_BILLS;
};

export const saveStoredBills = (bills: Bill[], userId?: string) => {
  try {
    const key = getStorageKey('nhau_bills', userId);
    localStorage.setItem(key, JSON.stringify(bills));
  } catch (e) {
    console.warn('[Storage] Failed to save bills to localStorage (possibly quota exceeded):', e);
  }
};

// Compute dynamic Debts from pending bills using Multi-Payer Greedy Debt Settlement
export const getActiveDebts = (bills: Bill[]): Debt[] => {
  const debts: Debt[] = [];
  
  // Filter out archived bills from active debt calculations
  const activeBills = bills.filter(b => !b.isArchived);
  
  activeBills.forEach((bill) => {
    // Calculate net balance for each member: balance = initialPaid - finalShare
    const creditors = bill.members
      .filter(m => m.initialPaid > m.finalShare)
      .map(m => ({ name: m.name, remaining: m.initialPaid - m.finalShare, hasPaidDebt: m.hasPaidDebt }))
      .sort((a, b) => b.remaining - a.remaining);

    const debtors = bill.members
      .filter(m => m.initialPaid < m.finalShare)
      .map(m => ({ name: m.name, remaining: m.finalShare - m.initialPaid, hasPaidDebt: m.hasPaidDebt }))
      .sort((a, b) => b.remaining - a.remaining);

    // Fallback: If no one has initialPaid > finalShare, assign first member or host as default creditor
    if (creditors.length === 0 && debtors.length > 0 && bill.members.length > 0) {
      const defaultHost = bill.members[0];
      debtors.forEach(debtor => {
        debts.push({
          id: `${bill.id}-${debtor.name}-${defaultHost.name}`,
          billId: bill.id,
          billDate: bill.date,
          venueName: bill.venueName,
          debtorName: debtor.name,
          creditorName: defaultHost.name,
          amount: Math.round(debtor.remaining),
          isPaid: !!debtor.hasPaidDebt,
        });
      });
      return;
    }

    // Greedy matching algorithm for multi-payer resolution
    let cIdx = 0;
    let dIdx = 0;

    while (cIdx < creditors.length && dIdx < debtors.length) {
      const creditor = creditors[cIdx];
      const debtor = debtors[dIdx];

      const settleAmount = Math.min(creditor.remaining, debtor.remaining);

      if (settleAmount > 0) {
        debts.push({
          id: `${bill.id}-${debtor.name}-${creditor.name}`,
          billId: bill.id,
          billDate: bill.date,
          venueName: bill.venueName,
          debtorName: debtor.name,
          creditorName: creditor.name,
          amount: Math.round(settleAmount),
          isPaid: !!debtor.hasPaidDebt,
        });

        creditor.remaining -= settleAmount;
        debtor.remaining -= settleAmount;
      }

      if (creditor.remaining <= 1) {
        cIdx++;
      }
      if (debtor.remaining <= 1) {
        dIdx++;
      }
    }
  });

  return debts;
};
