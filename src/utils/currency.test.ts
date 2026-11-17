import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCurrencyInput } from './currency';

describe('Vietnamese money entry', () => {
  it('handles abbreviations and localized grouping', () => {
    assert.equal(parseCurrencyInput('500k'), 500_000);
    assert.equal(parseCurrencyInput('1.5m'), 1_500_000);
    assert.equal(parseCurrencyInput('1,5tr'), 1_500_000);
    assert.equal(parseCurrencyInput('1.000k'), 1_000_000);
    assert.equal(parseCurrencyInput('1.000.000'), 1_000_000);
    assert.equal(parseCurrencyInput('0,5tr'), 500_000);
  });
  it('handles empty and malformed data without NaN', () => {
    assert.equal(parseCurrencyInput(''), 0);
    assert.equal(parseCurrencyInput('abc'), 0);
    assert.equal(parseCurrencyInput('12đ'), 12);
  });
});
