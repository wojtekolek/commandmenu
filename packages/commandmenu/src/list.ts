import type { Config, GroupOf } from "./types";

export const EMPTY: readonly never[] = [];

/** One item the menu can show, with its lowercased label for matching and its group, if any. */
type Entry<T> = { item: T; text: string; group: GroupOf<string> | undefined };

/** A group's slice of the flat list: `start` inclusive, `end` exclusive. */
type Span = { id: string; label: string; start: number; end: number };

/**
 * Everything the menu can show, in display order, each id once (the first occurrence wins).
 * With `groups`, that's the items the groups list, in group order.
 */
export const buildEntries = <T extends Config>(
  config: readonly T[],
  groups: readonly GroupOf<string>[] | undefined,
): Entry<T>[] => {
  const entries: Entry<T>[] = [];
  const seen = new Set<string>();
  const add = (item: T | undefined, group?: GroupOf<string>) => {
    if (!item || seen.has(item.id)) return;
    seen.add(item.id);
    entries.push({ item, text: item.label.toLowerCase(), group });
  };

  if (!groups) {
    for (const item of config) add(item);
    return entries;
  }

  const byId = new Map<string, T>();
  for (const item of config) if (!byId.has(item.id)) byId.set(item.id, item);
  for (const group of groups) for (const id of group.items) add(byId.get(id), group);
  return entries;
};

/** Async results minus any id that's already on the menu or repeats among them. */
export const dropKnownIds = <A extends Config>(
  results: readonly A[],
  entries: readonly Entry<Config>[],
): readonly A[] => {
  if (!results.length) return EMPTY;
  const seen = new Set(entries.map((e) => e.item.id));
  return results.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

type LayoutArgs<T, A> = {
  entries: readonly Entry<T>[];
  query: string;
  grouped: boolean;
  results: readonly A[];
  resultsId: string | undefined;
  resultsLabel: string | undefined;
};

/**
 * The entries that match `query`, then the async results. `flat` is the single source of truth
 * for order and drives keyboard navigation; `spans` (null without groups) slices it back into
 * groups for rendering.
 */
export const layoutList = <T, A>({
  entries,
  query,
  grouped,
  results,
  resultsId,
  resultsLabel = "",
}: LayoutArgs<T, A>): { flat: readonly (T | A)[]; spans: Span[] | null } => {
  const q = query.toLowerCase();
  const flat: (T | A)[] = [];
  const spans: Span[] = [];

  for (const { item, text, group } of entries) {
    if (q && !text.includes(q)) continue;
    flat.push(item);
    if (!group) continue;
    const last = spans[spans.length - 1];
    if (last?.id === group.id) last.end = flat.length;
    else spans.push({ id: group.id, label: group.label, start: flat.length - 1, end: flat.length });
  }

  if (results.length && resultsId !== undefined) {
    spans.push({
      id: resultsId,
      label: resultsLabel,
      start: flat.length,
      end: flat.length + results.length,
    });
  }
  flat.push(...results);

  return { flat, spans: grouped ? spans : null };
};

type RowGroup<P> = { id: string; label: string; items: P[] };

const sameRows = <P>(a: readonly P[], b: readonly P[]) =>
  a.length === b.length && a.every((row, i) => row === b[i]);

/**
 * Slices `items` into groups along `spans`. A group whose rows didn't change keeps the object
 * `cache` holds for it, so memoized group components can skip re-rendering when, say, async
 * results arrive. The cache ends up holding exactly the groups returned.
 */
export const toGroups = <P>(
  spans: readonly Span[],
  items: readonly P[],
  cache: Map<string, RowGroup<P>>,
): RowGroup<P>[] => {
  const groups = spans.map(({ id, label, start, end }) => {
    const rows = items.slice(start, end);
    const cached = cache.get(id);
    return cached?.label === label && sameRows(cached.items, rows)
      ? cached
      : { id, label, items: rows };
  });
  cache.clear();
  for (const group of groups) cache.set(group.id, group);
  return groups;
};
