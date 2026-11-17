import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getActiveDebts } from './storage';
import type { Bill } from '../types';

const bill: Bill = {
  id:'b',venueId:'x',venueName:'Test',date:'2026-11-17T00:00:00Z',rawAmount:100,
  tipPercent:0,tipAmount:0,additionalFee:0,discountAmount:0,totalAmount:100,
  splitType:'equal',
  members:[
    {name:'An',initialPaid:100,finalShare:0,hasPaidDebt:true},
    {name:'Bình',initialPaid:0,finalShare:100,hasPaidDebt:false}
  ]
};
describe('Payment event ledger',()=>{
  it('tracks multiple partial repayments and resets without losing history',()=>{
    const id=getActiveDebts([bill])[0].id;
    const paid = {...bill,payments:{[id]:[
      {id:'p1',type:'payment' as const,amount:30,createdAt:'2026-11-17T00:00:00Z'},
      {id:'p2',type:'payment' as const,amount:20,createdAt:'2026-11-17T00:01:00Z'}
    ]}};
    assert.equal(getActiveDebts([paid])[0].remainingAmount,50);
    const complete={...paid,payments:{[id]:[...paid.payments[id],{id:'p3',type:'payment' as const,amount:50,createdAt:'2026-11-17T00:02:00Z'}]}};
    assert.equal(getActiveDebts([complete])[0].isPaid,true);
    const reset={...complete,payments:{[id]:[...complete.payments[id],{id:'r',type:'reset' as const,amount:0,createdAt:'2026-11-17T00:03:00Z'}]}};
    assert.equal(getActiveDebts([reset])[0].remainingAmount,100);
    assert.equal(reset.payments[id].length,4);
  });
});
