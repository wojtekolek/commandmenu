import {
  type ChangeEventHandler,
  type KeyboardEventHandler,
  type MouseEvent,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { buildShortcuts, isComposing, isFromSearch, matchShortcut } from "./keyboard";
import { buildEntries, dropKnownIds, EMPTY, layoutList, toGroups } from "./list";
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
  GroupOf,
  ItemProps,
  ListProps,
  MenuProps,
  PreparedGroup,
  PreparedItem,
  SearchProps,
  UseCommandMenuArgs,
  UseCommandMenuReturn,
} from "./types";

export const isGroupList = <T extends Config>(
  list: readonly (PreparedGroup<T> | PreparedItem<T>)[],
): list is PreparedGroup<T>[] => list.length > 0 && !("itemProps" in list[0]);

const optionId = (baseId: string, id: string) => `${baseId}-option-${encodeURIComponent(id)}`;

/** Shared by every item: pressing one must not move focus out of the search input. */
const keepFocus = (e: MouseEvent) => e.preventDefault();

const prepareItem = <I extends Config>(
  item: I,
  domId: string,
  select: (item: I) => void,
  hover: (item: I) => void,
): PreparedItem<I> => {
  const { onSelect: _onSelect, ...rest } = item;
  const enabled = !item.disabled;
  const itemProps: ItemProps = {
    id: domId,
    role: "option",
    "aria-disabled": enabled ? undefined : true,
    onClick: enabled ? () => select(item) : undefined,
    onMouseDown: keepFocus,
    onPointerMove: enabled ? () => hover(item) : undefined,
  };
  // TS can't follow `PreparedItem`'s distribution over a generic item type.
  return { ...rest, itemProps } as unknown as PreparedItem<I>;
};

/** What the stable handlers read: the latest render's values and callbacks. */
type Latest<T extends Config, A extends Config> = Pick<
  UseCommandMenuArgs<T, A>,
  "onKeyDown" | "onKeyUp" | "onSearchChange"
> & {
  flat: readonly (T | A)[];
  selectedItem: T | A | undefined;
  query: string;
  shortcuts: Map<string, T>;
};

export function useCommandMenu<T extends Config, A extends Config = T>(
  args: UseCommandMenuArgs<T, A> & { groups: readonly GroupOf<NoInfer<T>["id"]>[] },
): UseCommandMenuReturn<PreparedGroup<T | A>[]>;

export function useCommandMenu<T extends Config, A extends Config = T>(
  args: UseCommandMenuArgs<T, A> & { groups?: undefined },
): UseCommandMenuReturn<PreparedItem<T | A>[]>;

// `groups` that may be undefined (say, an optional prop) get the union; `isGroupList` narrows it.
export function useCommandMenu<T extends Config, A extends Config = T>(
  args: UseCommandMenuArgs<T, A>,
): UseCommandMenuReturn<PreparedGroup<T | A>[] | PreparedItem<T | A>[]>;

export function useCommandMenu<T extends Config, A extends Config = T>({
  config,
  groups,
  asyncResultsGroup,
  onKeyDown,
  onKeyUp,
  onSearchChange,
}: UseCommandMenuArgs<T, A>): UseCommandMenuReturn<PreparedGroup<T | A>[] | PreparedItem<T | A>[]> {
  type Item = T | A;

  // State

  const baseId = useId();
  const listId = `${baseId}-list`;
  const [query, setQuery] = useState("");
  const [selection, setSelectionState] = useState(INITIAL_SELECTION);
  // Mirrors `selection` synchronously, so handlers can skip updates that change nothing and
  // several key presses in one batch still build on each other.
  const selectionRef = useRef(selection);
  const listRef = useRef<HTMLElement | null>(null);
  // One mutable box for the stable handlers, written in a layout effect, so it's current before
  // any event can reach the new DOM.
  const [latest] = useState(() => ({}) as Latest<T, A>);
  // One `PreparedItem` per item for the life of the menu, so a row that survives a keystroke
  // keeps its identity and a memoized row doesn't re-render. Items must be treated as immutable.
  // Groups are cached the same way, by id, and reused while their rows stay the same.
  const [itemCache] = useState(() => new WeakMap<Item, PreparedItem<Item>>());
  const [groupCache] = useState(() => new Map<string, PreparedGroup<Item>>());

  // What's on the menu. `entries` and `shortcuts` depend only on `config` and `groups`, so
  // typing never rebuilds them.

  const entries = useMemo(() => buildEntries(config, groups), [config, groups]);
  const shortcuts = useMemo(() => buildShortcuts(entries.map((e) => e.item)), [entries]);

  const results = asyncResultsGroup?.items;
  const resultsId = asyncResultsGroup?.id;
  const resultsLabel = asyncResultsGroup?.label;
  // Returns the shared `EMPTY` for no results, so `items: data ?? []` doesn't rebuild the list.
  const asyncItems = useMemo(() => dropKnownIds(results ?? EMPTY, entries), [results, entries]);

  const { flat, spans } = useMemo(
    () =>
      layoutList({
        entries,
        query,
        grouped: !!groups,
        results: asyncItems,
        resultsId,
        resultsLabel,
      }),
    [entries, query, groups, asyncItems, resultsId, resultsLabel],
  );

  // Selection

  const selectedItem: Item | undefined = flat[locate(flat, selection)];
  const selectedDomId = selectedItem && optionId(baseId, selectedItem.id);

  useLayoutEffect(() => {
    Object.assign(latest, {
      flat,
      selectedItem,
      query,
      shortcuts,
      onKeyDown,
      onKeyUp,
      onSearchChange,
    });
  });

  useLayoutEffect(() => {
    if (selection.reveal && selectedDomId && listRef.current) {
      revealOption(listRef.current, selectedDomId);
    }
  }, [selection, selectedDomId]);

  const setSelection = useCallback((next: Selection) => {
    selectionRef.current = next;
    setSelectionState(next);
  }, []);

  // Handlers. All stable: they read current values from `latest`.

  const select = useCallback(
    (item: Config | undefined) => {
      if (!item) return;
      item.onSelect();
      const { query, onSearchChange } = latest;
      setQuery("");
      // Already back at the top with nothing typed: resetting again would only re-render.
      if (query || !isAtFirst(selectionRef.current)) setSelection(firstItem());
      if (query) onSearchChange?.("");
    },
    [latest, setSelection],
  );

  const hover = useCallback(
    (item: Item) => {
      // Pointer moves fire constantly; staying on the same item must not even schedule work.
      if (latest.selectedItem === item) return;
      setSelection({ id: item.id, idx: latest.flat.indexOf(item), reveal: false });
    },
    [latest, setSelection],
  );

  const move = useCallback(
    (dir: 1 | -1) => {
      const next = step(latest.flat, selectionRef.current, dir);
      // Already there (say, at the end of the list) and already in view: nothing to do.
      if (!sameSelection(next, selectionRef.current)) setSelection(next);
    },
    [latest, setSelection],
  );

  const handleSearch = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (e) => {
      const { value } = e.target;
      setQuery(value);
      setSelection(firstItem());
      latest.onSearchChange?.(value);
    },
    [latest, setSelection],
  );

  const handleKeyDown = useCallback<KeyboardEventHandler<HTMLElement>>(
    (e) => {
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
        if (!e.repeat) select(latest.selectedItem);
      }
    },
    [latest, listId, select, move],
  );

  const handleKeyUp = useCallback<KeyboardEventHandler<HTMLElement>>(
    (e) => latest.onKeyUp?.(e),
    [latest],
  );

  // What gets rendered

  const prepared = useMemo(
    () =>
      flat.map((item) => {
        let prepared = itemCache.get(item);
        if (!prepared) {
          prepared = prepareItem(item, optionId(baseId, item.id), select, hover);
          itemCache.set(item, prepared);
        }
        return prepared;
      }),
    [flat, itemCache, baseId, select, hover],
  );

  const list = useMemo(
    () => (spans ? toGroups(spans, prepared, groupCache) : prepared),
    [spans, prepared, groupCache],
  );

  // Props to spread

  const menuProps = useMemo(
    (): MenuProps => ({ onKeyDown: handleKeyDown, onKeyUp: handleKeyUp }),
    [handleKeyDown, handleKeyUp],
  );

  const searchProps = useMemo(
    (): SearchProps => ({
      value: query,
      onChange: handleSearch,
      role: "combobox",
      "aria-expanded": true,
      "aria-controls": listId,
      "aria-activedescendant": selectedDomId,
      "aria-autocomplete": "list",
      autoComplete: "off",
    }),
    [query, handleSearch, listId, selectedDomId],
  );

  const setListRef = useCallback((element: HTMLElement | null) => {
    listRef.current = element;
  }, []);

  const listProps = useMemo(
    (): ListProps => ({ id: listId, role: "listbox", ref: setListRef }),
    [listId, setListRef],
  );

  return {
    list,
    selectedId: selectedItem?.id,
    menuProps,
    searchProps,
    listProps,
    searchQuery: query,
  };
}
