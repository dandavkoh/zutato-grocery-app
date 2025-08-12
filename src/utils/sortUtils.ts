export const SortModes = {
  Edited: 'edited',
  Created: 'created',
  Alphabetical: 'alphabetical',
} as const;

export type SortMode = typeof SortModes[keyof typeof SortModes];

type ItemLike = {
  name?: string;
  updatedAt?: string;
  updated_at?: string;
  created_at?: string;
  createdAt?: string;
};

function safeParseDate(value: unknown): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime() || 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    // Normalize microseconds to milliseconds (keep first 3 digits)
    const normalized = value.replace(/\.(\d{3})\d+/, '.$1');
    const ts = Date.parse(normalized);
    return Number.isFinite(ts) ? ts : 0;
  }
  return 0;
}

export function sortItems<T extends ItemLike>(mode: SortMode, ascending: boolean, items: T[]): T[] {
  const cloned = [...items];
  const direction = ascending ? 1 : -1;

  cloned.sort((a, b) => {
    switch (mode) {
      case SortModes.Edited: {
        const aDate = safeParseDate(a.updatedAt ?? a.updated_at ?? a.created_at ?? a.createdAt ?? 0);
        const bDate = safeParseDate(b.updatedAt ?? b.updated_at ?? b.created_at ?? b.createdAt ?? 0);
        if (aDate === bDate) return 0;
        return aDate < bDate ? -1 * direction : 1 * direction;
      }
      case SortModes.Created: {
        const aDate = safeParseDate(a.created_at ?? a.createdAt ?? 0);
        const bDate = safeParseDate(b.created_at ?? b.createdAt ?? 0);
        if (aDate === bDate) return 0;
        return aDate < bDate ? -1 * direction : 1 * direction;
      }
      case SortModes.Alphabetical: {
        const aName = (a.name || '').toLocaleLowerCase('de');
        const bName = (b.name || '').toLocaleLowerCase('de');
        const cmp = aName.localeCompare(bName, 'de', { sensitivity: 'base', numeric: true });
        return cmp * direction;
      }
      default:
        return 0;
    }
  });

  return cloned;
}

