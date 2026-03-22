// src/useCommandMenu.ts
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
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
    () => Object.fromEntries(
      filteredConfig.filter((i) => i.shortcut).map((i) => [i.shortcut, i.onSelect])
    ),
    [filteredConfig]
  );
  const asyncItems = asyncResultsGroup?.items ?? [];
  const allItems = useMemo(() => [...filteredConfig, ...asyncItems], [filteredConfig, asyncItems]);
  const maxIdx = Math.max(0, allItems.length - 1);
  const safeIdx = Math.min(selectedIdx, maxIdx);
  useLayoutEffect(() => {
    const el = selectedRef.current;
    if (!el) return;
    const isFirst = el.parentNode?.firstElementChild === el;
    (isFirst ? el.parentElement?.previousElementSibling : el)?.scrollIntoView({ block: "nearest" });
  }, []);
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
      const value = e.target.value;
      setQuery(value);
      setSelectedIdx(0);
      onSearchChange?.(value);
    },
    [onSearchChange]
  );
  const move = useCallback(
    (dir) => {
      setSelectedIdx((i) => Math.max(0, Math.min(maxIdx, i + dir)));
    },
    [maxIdx]
  );
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
        handleSelect(allItems[safeIdx]?.onSelect)();
      }
    },
    [shortcuts, handleSelect, move, onKeyDown, allItems, safeIdx]
  );
  const handleKeyUp = useCallback(
    (e) => onKeyUp?.(e),
    [onKeyUp]
  );
  const prepared = useMemo(
    () => allItems.map((item, i) => ({
      isSelected: i === safeIdx,
      ref: i === safeIdx ? selectedRef : null,
      id: item.id,
      label: item.label,
      icon: item.icon,
      shortcut: item.shortcut,
      description: item.description,
      onClick: item.disabled ? void 0 : handleSelect(item.onSelect),
      onPointerMove: () => setSelectedIdx(i)
    })),
    [allItems, safeIdx, handleSelect]
  );
  const list = useMemo(() => {
    if (!groups && !asyncResultsGroup) return prepared;
    const result = [];
    let offset = 0;
    if (groups) {
      for (const g of groups) {
        const items = prepared.slice(0, filteredConfig.length).filter((_, i) => g.items.includes(filteredConfig[i]?.id));
        if (items.length) result.push({ id: g.id, label: g.label, items });
      }
      offset = filteredConfig.length;
    }
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
      [handleKeyDown, handleKeyUp]
    ),
    searchProps: useMemo(() => ({ value: query, onChange: handleSearch }), [query, handleSearch]),
    searchQuery: query,
    isAsyncLoading: asyncResultsGroup?.isLoading ?? false
  };
}
export {
  useCommandMenu
};
//# sourceMappingURL=index.mjs.map