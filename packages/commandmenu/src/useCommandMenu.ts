import {
  type ChangeEventHandler,
  type KeyboardEventHandler,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { AsyncResultsGroup, Config, Group, PreparedGroup, PreparedItem } from "./types";

export const isGroupList = (list: (PreparedGroup | PreparedItem)[]): list is PreparedGroup[] =>
  (list as PreparedGroup[])[0]?.items !== undefined;

type CommonArgs<T extends Config[]> = {
  config: T;
  asyncResultsGroup?: AsyncResultsGroup;
  onKeyDown?: KeyboardEventHandler<HTMLElement>;
  onKeyUp?: KeyboardEventHandler<HTMLElement>;
  onSearchChange?: (query: string) => void;
};

type UseCommandMenuReturn = {
  list: PreparedGroup[] | PreparedItem[];
  menuProps: {
    onKeyDown: KeyboardEventHandler<HTMLDivElement>;
    onKeyUp: KeyboardEventHandler<HTMLDivElement>;
  };
  searchProps: { value: string; onChange: ChangeEventHandler<HTMLInputElement> };
  searchQuery: string;
  isAsyncLoading: boolean;
};

export function useCommandMenu<T extends Config[]>(
  args: { groups: Group<T>[] } & CommonArgs<T>,
): UseCommandMenuReturn & { list: PreparedGroup[] };

export function useCommandMenu<T extends Config[]>(
  args: CommonArgs<T>,
): UseCommandMenuReturn & { list: PreparedItem[] };

export function useCommandMenu<T extends Config[]>({
  config,
  groups,
  asyncResultsGroup,
  onKeyDown,
  onKeyUp,
  onSearchChange,
}: { groups?: Group<T>[] } & CommonArgs<T>): UseCommandMenuReturn {
  const selectedRef = useRef<HTMLLIElement>(null);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Filter local items based on query
  const filteredConfig = useMemo(() => {
    if (!query) return config;
    const q = query.toLowerCase();
    return config.filter((item) => item.label.toLowerCase().includes(q)) as T;
  }, [config, query]);

  // Build shortcuts map from filtered items
  const shortcuts = useMemo(
    () =>
      Object.fromEntries(
        filteredConfig.filter((i) => i.shortcut).map((i) => [i.shortcut, i.onSelect]),
      ),
    [filteredConfig],
  );

  // Combine local and async items
  const asyncItems = asyncResultsGroup?.items ?? [];
  const allItems = useMemo(() => [...filteredConfig, ...asyncItems], [filteredConfig, asyncItems]);

  // Clamp selected index
  const maxIdx = Math.max(0, allItems.length - 1);
  const safeIdx = Math.min(selectedIdx, maxIdx);

  // Scroll selected item into view
  useLayoutEffect(() => {
    const el = selectedRef.current;
    if (!el) return;
    const isFirst = el.parentNode?.firstElementChild === el;
    (isFirst ? el.parentElement?.previousElementSibling : el)?.scrollIntoView({ block: "nearest" });
  }, []);

  // H
  const handleReset = useCallback(() => {
    setQuery("");
    setSelectedIdx(0);
  }, []);

  const handleSelect = useCallback(
    (onSelect?: () => void) => () => {
      onSelect?.();
      handleReset();
    },
    [handleReset],
  );

  const handleSearch: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const value = e.target.value;
      setQuery(value);
      setSelectedIdx(0);
      onSearchChange?.(value);
    },
    [onSearchChange],
  );

  const move = useCallback(
    (dir: 1 | -1) => {
      setSelectedIdx((i) => Math.max(0, Math.min(maxIdx, i + dir)));
    },
    [maxIdx],
  );

  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      const { shiftKey, ctrlKey, metaKey, code, key } = e;

      // Handle shortcuts
      if (metaKey || ctrlKey) {
        const shortcutKey = shiftKey ? `⇧ ${code.replace("Key", "")}` : code.replace("Key", "");
        const handler = shortcuts[shortcutKey];
        if (handler) {
          e.preventDefault();
          e.stopPropagation();
          handleSelect(handler)();
          return;
        }
      }

      onKeyDown?.(e);
      if (e.defaultPrevented) return;

      if (key === "ArrowDown") {
        e.preventDefault();
        move(1);
      } else if (key === "ArrowUp") {
        e.preventDefault();
        move(-1);
      } else if (key === "Enter" && !e.nativeEvent.isComposing) {
        e.preventDefault();
        handleSelect(allItems[safeIdx]?.onSelect)();
      }
    },
    [shortcuts, handleSelect, move, onKeyDown, allItems, safeIdx],
  );

  const handleKeyUp: KeyboardEventHandler<HTMLDivElement> = useCallback(
    (e) => onKeyUp?.(e),
    [onKeyUp],
  );

  // Prepare items for render
  const prepared = useMemo(
    (): PreparedItem[] =>
      allItems.map((item, i) => ({
        isSelected: i === safeIdx,
        ref: i === safeIdx ? selectedRef : null,
        id: item.id,
        label: item.label,
        icon: item.icon,
        shortcut: item.shortcut,
        description: item.description,
        onClick: item.disabled ? undefined : handleSelect(item.onSelect),
        onPointerMove: () => setSelectedIdx(i),
      })),
    [allItems, safeIdx, handleSelect],
  );

  // Prepare grouped output
  const list = useMemo(() => {
    if (!groups && !asyncResultsGroup) return prepared;

    const result: PreparedGroup[] = [];
    let offset = 0;

    // Add local groups
    if (groups) {
      for (const g of groups) {
        const items = prepared
          .slice(0, filteredConfig.length)
          .filter((_, i) => g.items.includes(filteredConfig[i]?.id));
        if (items.length) result.push({ id: g.id, label: g.label, items });
      }
      offset = filteredConfig.length;
    }

    // Add async group
    if (asyncResultsGroup && asyncItems.length) {
      const items = prepared.slice(offset);
      if (items.length) {
        result.push({ id: asyncResultsGroup.id, label: asyncResultsGroup.label, items });
      }
    }

    return result.length ? result : prepared;
  }, [groups, asyncResultsGroup, prepared, filteredConfig, asyncItems.length]);

  return {
    list,
    menuProps: useMemo(
      () => ({ onKeyDown: handleKeyDown, onKeyUp: handleKeyUp }),
      [handleKeyDown, handleKeyUp],
    ),
    searchProps: useMemo(() => ({ value: query, onChange: handleSearch }), [query, handleSearch]),
    searchQuery: query,
    isAsyncLoading: asyncResultsGroup?.isLoading ?? false,
  };
}
