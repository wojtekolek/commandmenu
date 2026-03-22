import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AsyncResultsGroup, Config, Group } from "./types";
import { isGroupList, useCommandMenu } from "./useCommandMenu";

const createConfig = (overrides: Partial<Config> & { id: string; label: string }): Config => ({
  onSelect: vi.fn(),
  ...overrides,
});

const makeDefaultConfig = () =>
  [
    createConfig({ id: "copy", label: "Copy", shortcut: "C" }),
    createConfig({ id: "paste", label: "Paste", shortcut: "V" }),
    createConfig({ id: "cut", label: "Cut" }),
    createConfig({ id: "delete", label: "Delete", disabled: true }),
  ] satisfies Config[];

type DefaultConfig = ReturnType<typeof makeDefaultConfig>;

let defaultConfig: DefaultConfig;

beforeEach(() => {
  defaultConfig = makeDefaultConfig();
});

const createKeyboardEvent = (
  key: string,
  options: Partial<{
    metaKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
    code: string;
    isComposing: boolean;
  }> = {},
) => {
  const event = {
    key,
    code: options.code ?? `Key${key.toUpperCase()}`,
    metaKey: options.metaKey ?? false,
    ctrlKey: options.ctrlKey ?? false,
    shiftKey: options.shiftKey ?? false,
    defaultPrevented: false,
    nativeEvent: { isComposing: options.isComposing ?? false },
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  };
  event.preventDefault.mockImplementation(() => {
    event.defaultPrevented = true;
  });
  return event as unknown as React.KeyboardEvent<HTMLDivElement>;
};

describe("isGroupList", () => {
  it("returns true for PreparedGroup[]", () => {
    expect(isGroupList([{ id: "g", label: "G", items: [] }])).toBe(true);
  });

  it("returns false for PreparedItem[]", () => {
    expect(
      isGroupList([{ id: "i", label: "I", onClick: vi.fn(), onPointerMove: vi.fn() }]),
    ).toBe(false);
  });

  it("returns false for empty array", () => {
    expect(isGroupList([])).toBe(false);
  });
});

describe("useCommandMenu", () => {
  describe("flat list (no groups)", () => {
    it("returns all items as PreparedItem[]", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      expect(result.current.list).toHaveLength(4);
      expect(isGroupList(result.current.list)).toBe(false);
      expect(result.current.list[0]).toMatchObject({ id: "copy", label: "Copy" });
    });

    it("strips disabled/onSelect and adds onClick/onPointerMove", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      const item = result.current.list[0];
      expect(item).toHaveProperty("onClick");
      expect(item).toHaveProperty("onPointerMove");
      expect(item).not.toHaveProperty("onSelect");
      expect(item).not.toHaveProperty("disabled");
    });

    it("sets onClick to undefined for disabled items", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      const deleteItem = result.current.list.find((i) => i.id === "delete");
      expect(deleteItem?.onClick).toBeUndefined();
    });

    it("selects the first item by default", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      expect(result.current.selection.id).toBe("copy");
    });
  });

  describe("grouped list", () => {
    const makeGroups = (): Group<DefaultConfig>[] => [
      { id: "clipboard", label: "Clipboard", items: ["copy", "paste", "cut"] },
      { id: "destructive", label: "Destructive", items: ["delete"] },
    ];

    it("returns PreparedGroup[]", () => {
      const { result } = renderHook(() =>
        useCommandMenu({ config: defaultConfig, groups: makeGroups() }),
      );

      expect(isGroupList(result.current.list)).toBe(true);
      expect(result.current.list).toHaveLength(2);
    });

    it("groups items correctly", () => {
      const { result } = renderHook(() =>
        useCommandMenu({ config: defaultConfig, groups: makeGroups() }),
      );

      const list = result.current.list as ReturnType<typeof useCommandMenu<DefaultConfig>>["list"];
      expect(list[0]).toMatchObject({ id: "clipboard", label: "Clipboard" });
      expect(list[0].items).toHaveLength(3);
      expect(list[1]).toMatchObject({ id: "destructive", label: "Destructive" });
      expect(list[1].items).toHaveLength(1);
    });

    it("preserves item order within groups", () => {
      const { result } = renderHook(() =>
        useCommandMenu({ config: defaultConfig, groups: makeGroups() }),
      );

      const list = result.current.list as ReturnType<typeof useCommandMenu<DefaultConfig>>["list"];
      const ids = list[0].items.map((i) => i.id);
      expect(ids).toEqual(["copy", "paste", "cut"]);
    });
  });

  describe("search / filtering", () => {
    it("initializes with empty search query", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      expect(result.current.searchQuery).toBe("");
      expect(result.current.searchProps.value).toBe("");
    });

    it("filters items by search query", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      act(() => {
        result.current.searchProps.onChange({
          target: { value: "cop" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.searchQuery).toBe("cop");
      expect(result.current.list).toHaveLength(1);
      expect(result.current.list[0]).toMatchObject({ id: "copy" });
    });

    it("filtering is case-insensitive", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      act(() => {
        result.current.searchProps.onChange({
          target: { value: "PASTE" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.list).toHaveLength(1);
      expect(result.current.list[0]).toMatchObject({ id: "paste" });
    });

    it("returns empty list when no matches", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      act(() => {
        result.current.searchProps.onChange({
          target: { value: "zzzzz" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.list).toHaveLength(0);
    });

    it("resets selection index on search change", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      act(() => {
        result.current.menuProps.onKeyDown(createKeyboardEvent("ArrowDown"));
      });
      expect(result.current.selection.id).toBe("paste");

      act(() => {
        result.current.searchProps.onChange({
          target: { value: "c" },
        } as React.ChangeEvent<HTMLInputElement>);
      });
      expect(result.current.selection.id).toBe("copy");
    });

    it("calls onSearchChange callback", () => {
      const onSearchChange = vi.fn();
      const { result } = renderHook(() =>
        useCommandMenu({ config: defaultConfig, onSearchChange }),
      );

      act(() => {
        result.current.searchProps.onChange({
          target: { value: "test" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(onSearchChange).toHaveBeenCalledWith("test");
    });

    it("filters groups and hides empty groups", () => {
      const groups: Group<DefaultConfig>[] = [
        { id: "clipboard", label: "Clipboard", items: ["copy", "paste", "cut"] },
        { id: "destructive", label: "Destructive", items: ["delete"] },
      ];
      const { result } = renderHook(() =>
        useCommandMenu({ config: defaultConfig, groups }),
      );

      act(() => {
        result.current.searchProps.onChange({
          target: { value: "cop" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      const list = result.current.list as ReturnType<typeof useCommandMenu<DefaultConfig>>["list"];
      expect(isGroupList(list)).toBe(true);
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe("clipboard");
      expect(list[0].items).toHaveLength(1);
    });
  });

  describe("keyboard navigation", () => {
    it("moves selection down with ArrowDown", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      act(() => {
        result.current.menuProps.onKeyDown(createKeyboardEvent("ArrowDown"));
      });

      expect(result.current.selection.id).toBe("paste");
    });

    it("moves selection up with ArrowUp", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      act(() => {
        result.current.menuProps.onKeyDown(createKeyboardEvent("ArrowDown"));
        result.current.menuProps.onKeyDown(createKeyboardEvent("ArrowDown"));
      });

      act(() => {
        result.current.menuProps.onKeyDown(createKeyboardEvent("ArrowUp"));
      });

      expect(result.current.selection.id).toBe("paste");
    });

    it("clamps selection at the bottom", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.menuProps.onKeyDown(createKeyboardEvent("ArrowDown"));
        }
      });

      expect(result.current.selection.id).toBe("delete");
    });

    it("clamps selection at the top", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      act(() => {
        result.current.menuProps.onKeyDown(createKeyboardEvent("ArrowUp"));
      });

      expect(result.current.selection.id).toBe("copy");
    });

    it("selects item on Enter", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      act(() => {
        result.current.menuProps.onKeyDown(createKeyboardEvent("Enter"));
      });

      expect(defaultConfig[0].onSelect).toHaveBeenCalled();
    });

    it("resets query and selection after Enter", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      act(() => {
        result.current.searchProps.onChange({
          target: { value: "paste" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      act(() => {
        result.current.menuProps.onKeyDown(createKeyboardEvent("Enter"));
      });

      expect(result.current.searchQuery).toBe("");
      expect(result.current.selection.id).toBe("copy");
    });

    it("does not select on Enter during IME composition", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      act(() => {
        result.current.menuProps.onKeyDown(
          createKeyboardEvent("Enter", { isComposing: true }),
        );
      });

      expect(defaultConfig[0].onSelect).not.toHaveBeenCalled();
    });

    it("prevents default on arrow keys and Enter", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      const downEvent = createKeyboardEvent("ArrowDown");
      const upEvent = createKeyboardEvent("ArrowUp");
      const enterEvent = createKeyboardEvent("Enter");

      act(() => {
        result.current.menuProps.onKeyDown(downEvent);
        result.current.menuProps.onKeyDown(upEvent);
        result.current.menuProps.onKeyDown(enterEvent);
      });

      expect(downEvent.preventDefault).toHaveBeenCalled();
      expect(upEvent.preventDefault).toHaveBeenCalled();
      expect(enterEvent.preventDefault).toHaveBeenCalled();
    });

    it("calls custom onKeyDown handler", () => {
      const onKeyDown = vi.fn();
      const { result } = renderHook(() =>
        useCommandMenu({ config: defaultConfig, onKeyDown }),
      );

      const event = createKeyboardEvent("a");
      act(() => {
        result.current.menuProps.onKeyDown(event);
      });

      expect(onKeyDown).toHaveBeenCalledWith(event);
    });

    it("skips navigation when custom onKeyDown calls preventDefault", () => {
      const onKeyDown = vi.fn((e: React.KeyboardEvent) => e.preventDefault());
      const { result } = renderHook(() =>
        useCommandMenu({ config: defaultConfig, onKeyDown }),
      );

      act(() => {
        result.current.menuProps.onKeyDown(createKeyboardEvent("ArrowDown"));
      });

      expect(result.current.selection.id).toBe("copy");
    });

    it("calls custom onKeyUp handler", () => {
      const onKeyUp = vi.fn();
      const { result } = renderHook(() =>
        useCommandMenu({ config: defaultConfig, onKeyUp }),
      );

      const event = createKeyboardEvent("a");
      act(() => {
        result.current.menuProps.onKeyUp(event);
      });

      expect(onKeyUp).toHaveBeenCalledWith(event);
    });
  });

  describe("shortcuts", () => {
    it("triggers shortcut with metaKey", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      const event = createKeyboardEvent("c", { metaKey: true, code: "KeyC" });
      act(() => {
        result.current.menuProps.onKeyDown(event);
      });

      expect(defaultConfig[0].onSelect).toHaveBeenCalled();
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });

    it("triggers shortcut with ctrlKey", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      const event = createKeyboardEvent("v", { ctrlKey: true, code: "KeyV" });
      act(() => {
        result.current.menuProps.onKeyDown(event);
      });

      expect(defaultConfig[1].onSelect).toHaveBeenCalled();
    });

    it("resets query and selection after shortcut", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      act(() => {
        result.current.searchProps.onChange({
          target: { value: "test" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      act(() => {
        result.current.menuProps.onKeyDown(
          createKeyboardEvent("c", { metaKey: true, code: "KeyC" }),
        );
      });

      expect(result.current.searchQuery).toBe("");
      expect(result.current.selection.id).toBe("copy");
    });

    it("does not trigger when no matching shortcut", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      act(() => {
        result.current.menuProps.onKeyDown(
          createKeyboardEvent("x", { metaKey: true, code: "KeyX" }),
        );
      });

      for (const item of defaultConfig) {
        expect(item.onSelect).not.toHaveBeenCalled();
      }
    });
  });

  describe("item interactions", () => {
    it("onClick calls onSelect and resets state", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      // Type something that still matches to verify reset
      act(() => {
        result.current.searchProps.onChange({
          target: { value: "cop" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      act(() => {
        result.current.list[0].onClick?.();
      });

      expect(defaultConfig[0].onSelect).toHaveBeenCalled();
      expect(result.current.searchQuery).toBe("");
    });

    it("onPointerMove updates selection", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      act(() => {
        result.current.list[2].onPointerMove();
      });

      expect(result.current.selection.id).toBe("cut");
    });
  });

  describe("async results", () => {
    it("returns only async group when no local groups defined", () => {
      const asyncResultsGroup: AsyncResultsGroup = {
        id: "search-results",
        label: "Search Results",
        items: [createConfig({ id: "result1", label: "Result 1" })],
        isLoading: false,
      };

      const { result } = renderHook(() =>
        useCommandMenu({ config: defaultConfig, asyncResultsGroup }),
      );

      // Without groups defined, only the async group is returned
      const list = result.current.list;
      expect(isGroupList(list)).toBe(true);
      expect(list).toHaveLength(1);
      expect(list[0]).toMatchObject({ id: "search-results", label: "Search Results" });
    });

    it("returns isAsyncLoading state", () => {
      const asyncResultsGroup: AsyncResultsGroup = {
        id: "search-results",
        label: "Search Results",
        items: [],
        isLoading: true,
      };

      const { result } = renderHook(() =>
        useCommandMenu({ config: defaultConfig, asyncResultsGroup }),
      );

      expect(result.current.isAsyncLoading).toBe(true);
    });

    it("defaults isAsyncLoading to false when no async group", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      expect(result.current.isAsyncLoading).toBe(false);
    });

    it("creates async group in grouped mode", () => {
      const groups: Group<DefaultConfig>[] = [
        { id: "clipboard", label: "Clipboard", items: ["copy", "paste", "cut"] },
      ];
      const asyncResultsGroup: AsyncResultsGroup = {
        id: "async",
        label: "Async",
        items: [createConfig({ id: "async1", label: "Async Item" })],
        isLoading: false,
      };

      const { result } = renderHook(() =>
        useCommandMenu({ config: defaultConfig, groups, asyncResultsGroup }),
      );

      const list = result.current.list as ReturnType<typeof useCommandMenu<DefaultConfig>>["list"];
      expect(isGroupList(list)).toBe(true);
      expect(list).toHaveLength(2);
      expect(list[1]).toMatchObject({ id: "async", label: "Async" });
    });

    it("navigates through local and async items", () => {
      const asyncResultsGroup: AsyncResultsGroup = {
        id: "async",
        label: "Async",
        items: [createConfig({ id: "async1", label: "Async Item" })],
        isLoading: false,
      };

      const { result } = renderHook(() =>
        useCommandMenu({ config: defaultConfig, asyncResultsGroup }),
      );

      // Navigate to async item (5th item, index 4)
      act(() => {
        for (let i = 0; i < 4; i++) {
          result.current.menuProps.onKeyDown(createKeyboardEvent("ArrowDown"));
        }
      });

      expect(result.current.selection.id).toBe("async1");
    });
  });

  describe("selection clamping", () => {
    it("clamps selection when items are filtered out", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      act(() => {
        for (let i = 0; i < 3; i++) {
          result.current.menuProps.onKeyDown(createKeyboardEvent("ArrowDown"));
        }
      });
      expect(result.current.selection.id).toBe("delete");

      act(() => {
        result.current.searchProps.onChange({
          target: { value: "copy" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.selection.id).toBe("copy");
    });
  });

  describe("config updates", () => {
    it("reflects new config on rerender", () => {
      const initialConfig = [createConfig({ id: "a", label: "A" })] satisfies Config[];
      const { result, rerender } = renderHook(
        ({ config }) => useCommandMenu({ config }),
        { initialProps: { config: initialConfig } },
      );

      expect(result.current.list).toHaveLength(1);

      const newConfig = [
        createConfig({ id: "a", label: "A" }),
        createConfig({ id: "b", label: "B" }),
      ] satisfies Config[];

      rerender({ config: newConfig });

      expect(result.current.list).toHaveLength(2);
    });
  });
});
