export interface Member {
  name: string;
  initialPaid: number; // The amount this person actually paid at the counter (usually 0 for others, or the full amount for the host)
  finalShare: number; // The amount this person actually owes
  hasPaidDebt: boolean; // Indicates if this person has settled their debt if they owe
  phone?: string;
  percentage?: number; // Optional percentage split info
  penaltyAmount?: number; // Accumulated penalty amount for this person (e.g. late arrival, phone usage)
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  notes?: string;
  rating?: number;
  visitsCount: number;
}

export interface Bill {
  id: string;
  venueId: string;
  venueName: string;
  date: string; // ISO string
  rawAmount: number;
  tipPercent: number;
  tipAmount: number;
  additionalFee: number; // like VAT or service charge
  discountAmount: number;
  totalAmount: number;
  members: Member[];
  splitType: 'equal' | 'percentage' | 'unequal' | 'roulette';
  note?: string;
  receiptImage?: string; // Base64 compressed invoice proof
  isArchived?: boolean; // True if the bill has been archived to tidy up history
  bankName?: string; // e.g. 'mbbank', 'vcb'
  bankNo?: string; // Bank account number of the host
  bankAccountName?: string; // Account holder full name
}

export interface Debt {
  id: string;
  billId: string;
  billDate: string;
  venueName: string;
  debtorName: string;   // The person who owes
  creditorName: string; // The person who paid and gets paid
  amount: number;
  isPaid: boolean;
}

export interface SoloMeal {
  id: string;
  name: string;
  venueName?: string;
  date: string; // YYYY-MM-DD or ISO
  rawAmount: number;
  drinkAmount: number;
  otherAmount: number;
  totalAmount: number;
  note?: string;
}

export interface SoloSettings {
  monthlyBudget: number;
}

