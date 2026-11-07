import type { ChangeEvent, KeyboardEvent, MouseEvent } from "react";
import { isComposing, isFromSearch, matchShortcut } from "./keyboard";
import { type Span, toGroups } from "./list";
import { revealOption } from "./scroll";
import {
  firstItem,
  INITIAL_SELECTION,
  isAtFirst,
  locate,
  type Selection,
  sameSelection,
  step,
} from "./selection";
import type {
  Config,
  ItemProps,
  ListProps,
  MenuProps,
  PreparedGroup,
  PreparedItem,
  UseCommandMenuArgs,
} from "./types";

/**
 * `encodeURIComponent` keeps ids free of whitespace and unique, but throws on a lone surrogate
 * (say, an id cut through an emoji). Those few are spelled `%uXXXX`, which its own output never
 * contains, so ids stay unique and every other id encodes as it always has.
 */
const encodeId = (id: string) => {
  try {
    return encodeURIComponent(id);
  } catch {
    return Array.from(id, (char) =>
      char.length === 1 && char >= "\uD800" && char <= "\uDFFF"
        ? `%u${char.charCodeAt(0).toString(16).toUpperCase()}`
        : encodeURIComponent(char),
    ).join("");
  }
};

export const optionId = (baseId: string, id: string) => `${baseId}-option-${encodeId(id)}`;

/** Shared by every item: pressing one must not move focus out of the search input. */
const keepFocus = (e: MouseEvent) => e.preventDefault();

/** What the handlers read: the latest committed render's values and callbacks. */
export type Latest<I extends Config> = Pick<
  UseCommandMenuArgs<Config>,
  "onKeyDown" | "onKeyUp" | "onSearchChange"
> & {
  flat: readonly I[];
  query: string;
  shortcuts: Map<string, Config>;
};

/**
 * Everything that lives as long as the menu does, built once: the handlers and props the hook
 * hands out (stable, so spreading them never re-renders anything), the caches that keep items'
 * identities, and `latest`, the committed values the handlers read. No hooks in here.
 */
export const createController = <I extends Config>(
  baseId: string,
  setQuery: (query: string) => void,
  setSelectionState: (selection: Selection) => void,
) => {
  const listId = `${baseId}-list`;
  const latest = {} as Latest<I>;
  // Mirrors the selection state synchronously, so handlers can skip updates that change nothing
  // and several key presses in one batch still build on each other.
  let selection = INITIAL_SELECTION;
  let listElement: HTMLElement | null = null;
  // One `PreparedItem` per item for the life of the menu, so a row that survives a keystroke
  // keeps its identity and a memoized row doesn't re-render. Items must be treated as immutable.
  // Groups are cached the same way, by id, and reused while their rows stay the same.
  const itemCache = new WeakMap<I, PreparedItem<I>>();
  const groupCache = new Map<string, PreparedGroup<I>>();

  const setSelection = (next: Selection) => {
    selection = next;
    setSelectionState(next);
  };

  const current = (): I | undefined => latest.flat[locate(latest.flat, selection)];

  const select = (item: Config | undefined) => {
    if (!item) return;
    item.onSelect();
    const { query, onSearchChange } = latest;
    setQuery("");
    // Already back at the top with nothing typed: resetting again would only re-render.
    if (query || !isAtFirst(selection)) setSelection(firstItem());
    if (query) onSearchChange?.("");
  };

  const hover = (item: I) => {
    // Pointer moves fire constantly; staying on the same item must not even schedule work.
    if (current() === item) return;
    setSelection({ id: item.id, idx: latest.flat.indexOf(item), reveal: false });
  };

  const move = (dir: 1 | -1) => {
    const next = step(latest.flat, selection, dir);
    // Already there (say, at the end of the list) and already in view: nothing to do.
    if (!sameSelection(next, selection)) setSelection(next);
  };

  const prepare = (item: I): PreparedItem<I> => {
    const { onSelect: _onSelect, ...rest } = item;
    const enabled = !item.disabled;
    const itemProps: ItemProps = {
      id: optionId(baseId, item.id),
      role: "option",
      "aria-disabled": enabled ? undefined : true,
      onClick: enabled ? () => select(item) : undefined,
      onMouseDown: keepFocus,
      onPointerMove: enabled ? () => hover(item) : undefined,
    };
    // TS can't follow `PreparedItem`'s distribution over a generic item type.
    return { ...rest, itemProps } as unknown as PreparedItem<I>;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    latest.onKeyDown?.(e);
    if (e.defaultPrevented || isComposing(e)) return;

    if (e.metaKey || e.ctrlKey) {
      // A Cmd/Ctrl combo without a shortcut belongs to the browser or the input.
      const item = e.altKey ? undefined : matchShortcut(latest.shortcuts, e);
      if (!item) return;
      e.preventDefault();
      e.stopPropagation();
      if (!e.repeat) select(item);
      return;
    }

    if (e.altKey || !isFromSearch(e, listId)) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (!e.repeat) select(current());
    }
  };

  const menuProps: MenuProps = { onKeyDown, onKeyUp: (e) => latest.onKeyUp?.(e) };

  const listProps: ListProps = {
    id: listId,
    role: "listbox",
    ref: (element) => {
      listElement = element;
    },
  };

  return {
    listId,
    latest,
    menuProps,
    listProps,

    handleSearch: (e: ChangeEvent<HTMLInputElement>) => {
      const { value } = e.target;
      setQuery(value);
      setSelection(firstItem());
      latest.onSearchChange?.(value);
    },

    /** Scrolls the option with `domId` into view within the list. */
    reveal: (domId: string) => {
      if (listElement) revealOption(listElement, domId);
    },

    /** `flat` as prepared rows, sliced into groups along `spans` when there are any. */
    render: (flat: readonly I[], spans: readonly Span[] | null) => {
      const rows = flat.map((item) => {
        let row = itemCache.get(item);
        if (!row) {
          row = prepare(item);
          itemCache.set(item, row);
        }
        return row;
      });
      return spans ? toGroups(spans, rows, groupCache) : rows;
    },
  };
};
