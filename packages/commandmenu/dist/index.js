"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  useCommandMenu: () => useCommandMenu
});
module.exports = __toCommonJS(index_exports);

// src/useCommandMenu.ts
var import_react = require("react");
function useCommandMenu({
  config,
  groups,
  asyncResultsGroup,
  onKeyDown,
  onKeyUp,
  onSearchChange
}) {
  const selectedRef = (0, import_react.useRef)(null);
  const [query, setQuery] = (0, import_react.useState)("");
  const [selectedIdx, setSelectedIdx] = (0, import_react.useState)(0);
  const filteredConfig = (0, import_react.useMemo)(() => {
    if (!query) return config;
    const q = query.toLowerCase();
    return config.filter((item) => item.label.toLowerCase().includes(q));
  }, [config, query]);
  const shortcuts = (0, import_react.useMemo)(
    () => Object.fromEntries(
      filteredConfig.filter((i) => i.shortcut).map((i) => [i.shortcut, i.onSelect])
    ),
    [filteredConfig]
  );
  const asyncItems = asyncResultsGroup?.items ?? [];
  const allItems = (0, import_react.useMemo)(() => [...filteredConfig, ...asyncItems], [filteredConfig, asyncItems]);
  const maxIdx = Math.max(0, allItems.length - 1);
  const safeIdx = Math.min(selectedIdx, maxIdx);
  (0, import_react.useLayoutEffect)(() => {
    const el = selectedRef.current;
    if (!el) return;
    const isFirst = el.parentNode?.firstElementChild === el;
    (isFirst ? el.parentElement?.previousElementSibling : el)?.scrollIntoView({ block: "nearest" });
  }, []);
  const handleReset = (0, import_react.useCallback)(() => {
    setQuery("");
    setSelectedIdx(0);
  }, []);
  const handleSelect = (0, import_react.useCallback)(
    (onSelect) => () => {
      onSelect?.();
      handleReset();
    },
    [handleReset]
  );
  const handleSearch = (0, import_react.useCallback)(
    (e) => {
      const value = e.target.value;
      setQuery(value);
      setSelectedIdx(0);
      onSearchChange?.(value);
    },
    [onSearchChange]
  );
  const move = (0, import_react.useCallback)(
    (dir) => {
      setSelectedIdx((i) => Math.max(0, Math.min(maxIdx, i + dir)));
    },
    [maxIdx]
  );
  const handleKeyDown = (0, import_react.useCallback)(
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
  const handleKeyUp = (0, import_react.useCallback)(
    (e) => onKeyUp?.(e),
    [onKeyUp]
  );
  const prepared = (0, import_react.useMemo)(
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
  const list = (0, import_react.useMemo)(() => {
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
    menuProps: (0, import_react.useMemo)(
      () => ({ onKeyDown: handleKeyDown, onKeyUp: handleKeyUp }),
      [handleKeyDown, handleKeyUp]
    ),
    searchProps: (0, import_react.useMemo)(() => ({ value: query, onChange: handleSearch }), [query, handleSearch]),
    searchQuery: query,
    isAsyncLoading: asyncResultsGroup?.isLoading ?? false
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  useCommandMenu
});
//# sourceMappingURL=index.js.map