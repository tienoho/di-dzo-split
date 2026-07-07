import { Bill, Venue, Debt } from '../types';

// Default empty lists for fresh production deployment
const DEFAULT_VENUES: Venue[] = [];
const DEFAULT_BILLS: Bill[] = [];

// Helper to save and load data
export const getStoredVenues = (): Venue[] => {
  const local = localStorage.getItem('nhau_venues');
  if (local) {
    try {
      return JSON.parse(local);
    } catch (e) {
      console.error(e);
    }
  }
  localStorage.setItem('nhau_venues', JSON.stringify(DEFAULT_VENUES));
  return DEFAULT_VENUES;
};

export const saveStoredVenues = (venues: Venue[]) => {
  localStorage.setItem('nhau_venues', JSON.stringify(venues));
};

export const getStoredBills = (): Bill[] => {
  const local = localStorage.getItem('nhau_bills');
  if (local) {
    try {
      return JSON.parse(local);
    } catch (e) {
      console.error(e);
    }
  }
  localStorage.setItem('nhau_bills', JSON.stringify(DEFAULT_BILLS));
  return DEFAULT_BILLS;
};

export const saveStoredBills = (bills: Bill[]) => {
  localStorage.setItem('nhau_bills', JSON.stringify(bills));
};

// Compute dynamic Debts from pending bills
export const getActiveDebts = (bills: Bill[]): Debt[] => {
  const debts: Debt[] = [];
  
  // Filter out archived bills from active debt calculations
  const activeBills = bills.filter(b => !b.isArchived);
  
  activeBills.forEach((bill) => {
    // Find who paid the most / the hosts
    // Traditionally, one person settles the main bill, then others owe them.
    // Let's identify the members who paid more than their finalShare.
    const creditors = bill.members.filter(m => m.initialPaid > m.finalShare);
    const debtors = bill.members.filter(m => m.initialPaid < m.finalShare);
    
    if (creditors.length > 0 && debtors.length > 0) {
      // Typically, there is 1 creditor (the person who paid). Let's distribute debts.
      const primaryCreditor = creditors[0]; // Simple, robust algorithm
      
      debtors.forEach((debtor) => {
        const owedAmount = debtor.finalShare - debtor.initialPaid;
        if (owedAmount > 0) {
          debts.push({
            id: `${bill.id}-${debtor.name}`,
            billId: bill.id,
            billDate: bill.date,
            venueName: bill.venueName,
            debtorName: debtor.name,
            creditorName: primaryCreditor.name,
            amount: owedAmount,
            isPaid: debtor.hasPaidDebt,
          });
        }
      });
    }
  });

  return debts;
};
