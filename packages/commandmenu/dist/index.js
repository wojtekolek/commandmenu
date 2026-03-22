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
  isGroupList: () => isGroupList,
  useCommandMenu: () => useCommandMenu
});
module.exports = __toCommonJS(index_exports);

// src/useCommandMenu.ts
var import_react = require("react");
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
  const selectedRef = (0, import_react.useRef)(null);
  const [query, setQuery] = (0, import_react.useState)("");
  const [selectedIdx, setSelectedIdx] = (0, import_react.useState)(0);
  const filteredConfig = (0, import_react.useMemo)(() => {
    if (!query) return config;
    const q = query.toLowerCase();
    return config.filter((item) => item.label.toLowerCase().includes(q));
  }, [config, query]);
  const shortcuts = (0, import_react.useMemo)(
    () => Object.fromEntries(config.filter((i) => i.shortcut).map((i) => [i.shortcut, i.onSelect])),
    [config]
  );
  const asyncItems = asyncResultsGroup?.items ?? EMPTY_ITEMS;
  const allItems = (0, import_react.useMemo)(() => [...filteredConfig, ...asyncItems], [filteredConfig, asyncItems]);
  const maxIdx = Math.max(0, allItems.length - 1);
  const safeIdx = Math.min(selectedIdx, maxIdx);
  const currentRef = (0, import_react.useRef)({ allItems, safeIdx, maxIdx });
  currentRef.current = { allItems, safeIdx, maxIdx };
  (0, import_react.useLayoutEffect)(() => {
    const el = selectedRef.current;
    if (!el) return;
    const isFirst = el.parentNode?.firstElementChild === el;
    (isFirst ? el.parentElement?.previousElementSibling : el)?.scrollIntoView({ block: "nearest" });
  }, [safeIdx]);
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
      setQuery(e.target.value);
      setSelectedIdx(0);
      onSearchChange?.(e.target.value);
    },
    [onSearchChange]
  );
  const move = (0, import_react.useCallback)((dir) => {
    setSelectedIdx((i) => {
      const max = currentRef.current.maxIdx;
      return Math.max(0, Math.min(max, i + dir));
    });
  }, []);
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
        const { allItems: items, safeIdx: idx } = currentRef.current;
        handleSelect(items[idx]?.onSelect)();
      }
    },
    [shortcuts, handleSelect, move, onKeyDown]
  );
  const handleKeyUp = (0, import_react.useCallback)(
    (e) => onKeyUp?.(e),
    [onKeyUp]
  );
  const prepared = (0, import_react.useMemo)(
    () => allItems.map(({ onSelect, disabled, ...rest }, i) => ({
      ...rest,
      onClick: disabled ? void 0 : handleSelect(onSelect),
      onPointerMove: () => setSelectedIdx(i)
    })),
    [allItems, handleSelect]
  );
  const list = (0, import_react.useMemo)(() => {
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
  const selection = (0, import_react.useMemo)(
    () => ({ id: allItems[safeIdx]?.id, ref: selectedRef }),
    [allItems, safeIdx]
  );
  return {
    list,
    selection,
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
  isGroupList,
  useCommandMenu
});
//# sourceMappingURL=index.js.map