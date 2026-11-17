import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Bill } from '../types';
import { getActiveDebts } from './storage';

const createBill = (): Bill => ({
  id: 'example',
  venueId: 'other',
  venueName: 'Quán thử nghiệm',
  date: '2026-11-17T00:00:00.000Z',
  rawAmount: 100,
  tipPercent: 0,
  tipAmount: 0,
  additionalFee: 0,
  discountAmount: 0,
  totalAmount: 100,
  splitType: 'equal',
  members: [
    { name: 'An', initialPaid: 60, finalShare: 20, hasPaidDebt: true },
    { name: 'Bình', initialPaid: 40, finalShare: 0, hasPaidDebt: true },
    { name: 'Chi', initialPaid: 0, finalShare: 80, hasPaidDebt: false }
  ]
});

describe('Multi-creditor debt settlements', () => {
  it('creates two real creditor transfers whose amounts sum exactly', () => {
    const transfers = getActiveDebts([createBill()]);
    assert.equal(transfers.length, 2);
    assert.equal(transfers.reduce((sum, transfer) => sum + transfer.amount, 0), 80);
  });

  it('marks exactly one transfer as paid without clearing another', () => {
    const bill = createBill();
    const transferId = getActiveDebts([bill])[0].id;
    const updated = { ...bill, settledTransfers: { [transferId]: true } };
    const transfers = getActiveDebts([updated]);
    assert.equal(transfers.filter(d => d.isPaid).length, 1);
    assert.equal(transfers.filter(d => !d.isPaid).length, 1);
  });

  it('retains paid statuses for old member-level records', () => {
    const bill = createBill();
    bill.members[2].hasPaidDebt = true;
    assert.equal(getActiveDebts([bill]).every(debt => debt.isPaid), true);
  });
});
