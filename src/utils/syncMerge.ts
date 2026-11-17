/**
 * Merge offline and cloud snapshots by version. Deletions remain tombstones,
 * so another device with an old local cache cannot silently resurrect them.
 */
export interface VersionedEntity {
  id: string;
  date?: string;
  updatedAt?: string;
  deletedAt?: string;
}

function timestamp(value: string | undefined): number {
  if (!value) return 0;
  const result = Date.parse(value);
  return Number.isFinite(result) ? result : 0;
}

export function revision<T extends VersionedEntity>(entity: T): number {
  return Math.max(timestamp(entity.updatedAt), timestamp(entity.deletedAt), timestamp(entity.date));
}

export function mergeVersioned<T extends VersionedEntity>(
  cloud: T[],
  local: T[]
): { entities: T[]; toUpload: T[] } {
  const merged = new Map<string, { entity: T; source: 'cloud' | 'local' }>();
  cloud.forEach(entity => merged.set(entity.id, { entity, source: 'cloud' }));
  local.forEach(entity => {
    const current = merged.get(entity.id);
    if (!current) {
      merged.set(entity.id, { entity, source: 'local' });
      return;
    }
    const localVersion = revision(entity);
    const cloudVersion = revision(current.entity);
    // Favor deletion on ties. Otherwise authoritative cloud wins equal versions.
    const localWins = localVersion > cloudVersion ||
      (localVersion === cloudVersion && !!entity.deletedAt && !current.entity.deletedAt);
    if (localWins) merged.set(entity.id, { entity, source: 'local' });
  });
  const all = Array.from(merged.values());
  return {
    entities: all.map(entry => entry.entity),
    toUpload: all.filter(entry => entry.source === 'local').map(entry => entry.entity)
  };
}

export function visibleEntities<T extends VersionedEntity>(entities: T[]): T[] {
  return entities.filter(entity => !entity.deletedAt);
}
