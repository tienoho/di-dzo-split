import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { allocateExact, equalShares, percentageShares, rouletteShares } from './splitMath';

describe('VND settlement allocation', () => {
  it('preserves the exact total when dividing indivisible dong', () => {
    assert.deepEqual(equalShares(100, 3), [34, 33, 33]);
    assert.deepEqual(equalShares(1, 4), [1, 0, 0, 0]);
    assert.deepEqual(equalShares(0, 2), [0, 0]);
  });

  it('uses largest remainders for exact 100% splits', () => {
    assert.deepEqual(percentageShares(101, [33, 33, 34]), [33, 33, 35]);
    assert.deepEqual(percentageShares(100, [0, 100]), [0, 100]);
  });

  it('retains incomplete percentages visibly for validation', () => {
    assert.deepEqual(percentageShares(100, [20, 30]), [20, 30]);
  });

  it('keeps roulette sums exact and supports a single participant', () => {
    assert.deepEqual(rouletteShares(99, 3, 0, 50), [50, 25, 24]);
    assert.deepEqual(rouletteShares(99, 1, 0, 50), [99]);
    assert.deepEqual(rouletteShares(99, 3, null, 50), [33, 33, 33]);
  });

  it('can add penalties without changing the original total', () => {
    const penalties = [20, 0];
    const shared = equalShares(100 - penalties.reduce((a, b) => a + b, 0), 2);
    assert.equal(shared.map((s, i) => s + penalties[i]).reduce((a, b) => a + b, 0), 100);
  });

  it('rejects invalid input rather than silently constructing debt', () => {
    assert.throws(() => allocateExact(10.5, [1, 1]), RangeError);
    assert.throws(() => allocateExact(10, [-1, 1]), RangeError);
  });
});
