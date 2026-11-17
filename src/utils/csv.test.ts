import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, csvRow } from './csv';

test('quotes delimiters, newlines and Vietnamese strings correctly', () => {
  assert.equal(csvRow(['Quán "Nhà"; A', 'Hà Nội', 150000]), '"Quán ""Nhà""; A";"Hà Nội";150000\n');
  assert.equal(csvCell('Một\nhai'), '"Một\nhai"');
});
test('prevents spreadsheet formula injection in user-controlled text', () => {
  assert.equal(csvCell('=2+3'), '"\'=2+3"');
  assert.equal(csvCell('  +SUM(A1:A3)'), '"\'  +SUM(A1:A3)"');
  assert.equal(csvCell('@HYPERLINK("x")'), '"\'@HYPERLINK(""x"")"');
  assert.equal(csvCell(-5), '-5');
});
