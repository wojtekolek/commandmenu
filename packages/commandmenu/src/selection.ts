import type { Config } from "./types";

/**
 * Where the highlight is: the item's `id`, with its position as a fallback for when that id
 * leaves the list. `reveal` asks for it to be scrolled into view, which keyboard moves and
 * resets do and pointer moves don't.
 */
export type Selection = { id: string | undefined; idx: number; reveal: boolean };

export const INITIAL_SELECTION: Selection = { id: undefined, idx: 0, reveal: false };

/** Back to the first item, scrolled into view. A new object each time, so the reveal re-runs. */
export const firstItem = (): Selection => ({ id: undefined, idx: 0, reveal: true });

export const isAtFirst = ({ id, idx }: Selection) => id === undefined && idx === 0;

export const sameSelection = (a: Selection, b: Selection) =>
  a.id === b.id && a.idx === b.idx && a.reveal === b.reveal;

const findEnabled = (items: readonly Config[], from: number, dir: 1 | -1): number => {
  for (let i = from; i >= 0 && i < items.length; i += dir) {
    if (!items[i].disabled) return i;
  }
  return -1;
};

/** Clamps `idx` into range and skips disabled items. Returns -1 when nothing is selectable. */
const resolveIdx = (items: readonly Config[], idx: number): number => {
  if (!items.length) return -1;
  const i = Math.min(Math.max(idx, 0), items.length - 1);
  if (!items[i].disabled) return i;
  const next = findEnabled(items, i + 1, 1);
  return next === -1 ? findEnabled(items, i - 1, -1) : next;
};

/**
 * The index of the highlighted item: follows the selected id when items move, falls back to its
 * old position when it's gone. -1 when nothing is selectable.
 */
export const locate = (items: readonly Config[], { id, idx }: Selection): number => {
  if (id !== undefined && items[idx]?.id !== id) {
    const found = items.findIndex((item) => item.id === id);
    if (found !== -1) return resolveIdx(items, found);
  }
  return resolveIdx(items, idx);
};

/** The selection one enabled item up or down from `current`. Stays put at either end. */
export const step = (items: readonly Config[], current: Selection, dir: 1 | -1): Selection => {
  const from = locate(items, current);
  const next = findEnabled(items, from + dir, dir);
  const idx = next === -1 ? from : next;
  return { id: items[idx]?.id, idx, reveal: true };
};
