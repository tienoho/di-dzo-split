import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mergeVersioned, visibleEntities } from './syncMerge';

const cloud = { id:'a', updatedAt:'2026-11-17T07:00:00Z', value:1 };
const offline = { id:'a', updatedAt:'2026-11-17T08:00:00Z', value:2 };

describe('Cloud/local conflict resolution', () => {
  it('preserves newer offline changes and schedules their upload', () => {
    const result = mergeVersioned([cloud], [offline]);
    assert.equal(result.entities[0].value, 2);
    assert.equal(result.toUpload.length, 1);
  });
  it('favors newer cloud changes and avoids stale overwrites', () => {
    const result = mergeVersioned([offline], [cloud]);
    assert.equal(result.entities[0].value, 2);
    assert.equal(result.toUpload.length, 0);
  });
  it('never resurrects deleted cloud entities from stale local cache', () => {
    const tombstone = {id:'a', deletedAt:'2026-11-17T09:00:00Z', updatedAt:'2026-11-17T09:00:00Z'};
    const result = mergeVersioned([tombstone], [cloud]);
    assert.deepEqual(visibleEntities(result.entities), []);
    assert.equal(result.toUpload.length, 0);
  });
  it('propagates offline deletions and protects against stale cloud documents', () => {
    const tombstone = {id:'a', deletedAt:'2026-11-17T10:00:00Z', updatedAt:'2026-11-17T10:00:00Z'};
    const result = mergeVersioned([cloud], [tombstone]);
    assert.deepEqual(visibleEntities(result.entities), []);
    assert.equal(result.toUpload.length, 1);
  });
  it('does not overwrite authoritative cloud on equal timestamps', () => {
    const c = {id:'a', updatedAt:'2026-11-17T07:00:00Z', value:'cloud'};
    const l = {id:'a', updatedAt:'2026-11-17T07:00:00Z', value:'local'};
    assert.equal(mergeVersioned([c], [l]).entities[0].value, 'cloud');
  });
});
