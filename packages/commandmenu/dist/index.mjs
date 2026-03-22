// src/useCommandMenu.ts
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
var EMPTY_ITEMS = [];
var isGroupList = (list) => list[0]?.items !== void 0;
function useCommandMenu({
  config,
  groups,
  asyncResultsGroup,
  onKeyDown,
  onKeyUp,
  onSearchChange
}) {
  const selectedRef = useRef(null);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const filteredConfig = useMemo(() => {
    if (!query) return config;
    const q = query.toLowerCase();
    return config.filter((item) => item.label.toLowerCase().includes(q));
  }, [config, query]);
  const shortcuts = useMemo(
    () => Object.fromEntries(config.filter((i) => i.shortcut).map((i) => [i.shortcut, i.onSelect])),
    [config]
  );
  const asyncItems = asyncResultsGroup?.items ?? EMPTY_ITEMS;
  const allItems = useMemo(() => [...filteredConfig, ...asyncItems], [filteredConfig, asyncItems]);
  const maxIdx = Math.max(0, allItems.length - 1);
  const safeIdx = Math.min(selectedIdx, maxIdx);
  const currentRef = useRef({ allItems, safeIdx, maxIdx });
  currentRef.current = { allItems, safeIdx, maxIdx };
  useLayoutEffect(() => {
    const el = selectedRef.current;
    if (!el) return;
    const isFirst = el.parentNode?.firstElementChild === el;
    (isFirst ? el.parentElement?.previousElementSibling : el)?.scrollIntoView({ block: "nearest" });
  }, [safeIdx]);
  const handleReset = useCallback(() => {
    setQuery("");
    setSelectedIdx(0);
  }, []);
  const handleSelect = useCallback(
    (onSelect) => () => {
      onSelect?.();
      handleReset();
    },
    [handleReset]
  );
  const handleSearch = useCallback(
    (e) => {
      setQuery(e.target.value);
      setSelectedIdx(0);
      onSearchChange?.(e.target.value);
    },
    [onSearchChange]
  );
  const move = useCallback((dir) => {
    setSelectedIdx((i) => {
      const max = currentRef.current.maxIdx;
      return Math.max(0, Math.min(max, i + dir));
    });
  }, []);
  const handleKeyDown = useCallback(
    (e) => {
      const { shiftKey, ctrlKey, metaKey, code, key } = e;
      if (metaKey || ctrlKey) {
        const shortcutKey = shiftKey ? `\u21E7 ${code.replace("Key", "")}` : code.replace("Key", "");
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
        const { allItems: items, safeIdx: idx } = currentRef.current;
        handleSelect(items[idx]?.onSelect)();
      }
    },
    [shortcuts, handleSelect, move, onKeyDown]
  );
  const handleKeyUp = useCallback(
    (e) => onKeyUp?.(e),
    [onKeyUp]
  );
  const prepared = useMemo(
    () => allItems.map(({ onSelect, disabled, ...rest }, i) => ({
      ...rest,
      onClick: disabled ? void 0 : handleSelect(onSelect),
      onPointerMove: () => setSelectedIdx(i)
    })),
    [allItems, handleSelect]
  );
  const list = useMemo(() => {
    if (!groups && !asyncResultsGroup) return prepared;
    const itemById = new Map(prepared.map((p) => [p.id, p]));
    const filteredIds = new Set(filteredConfig.map((c) => c.id));
    const result = [];
    if (groups) {
      for (const g of groups) {
        const items = g.items.filter((id) => filteredIds.has(id)).map((id) => itemById.get(id));
        if (items.length) result.push({ id: g.id, label: g.label, items });
      }
    }
    if (asyncResultsGroup && asyncItems.length) {
      const items = asyncItems.map((a) => itemById.get(a.id)).filter(Boolean);
      if (items.length) {
        result.push({ id: asyncResultsGroup.id, label: asyncResultsGroup.label, items });
      }
    }
    return result.length ? result : prepared;
  }, [groups, asyncResultsGroup, prepared, filteredConfig, asyncItems]);
  const selection = useMemo(
    () => ({ id: allItems[safeIdx]?.id, ref: selectedRef }),
    [allItems, safeIdx]
  );
  return {
    list,
    selection,
    menuProps: useMemo(
      () => ({ onKeyDown: handleKeyDown, onKeyUp: handleKeyUp }),
      [handleKeyDown, handleKeyUp]
    ),
    searchProps: useMemo(() => ({ value: query, onChange: handleSearch }), [query, handleSearch]),
    searchQuery: query,
    isAsyncLoading: asyncResultsGroup?.isLoading ?? false
  };
}
export {
  isGroupList,
  useCommandMenu
};
//# sourceMappingURL=index.mjs.map