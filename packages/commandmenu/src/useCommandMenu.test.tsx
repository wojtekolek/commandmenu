import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { memo } from "react";
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import type { AsyncResultsGroup, Config, Group, PreparedGroup, PreparedItem } from "./types";
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
    createConfig({ id: "delete", label: "Delete", disabled: true, shortcut: "X" }),
  ] satisfies Config[];

type DefaultConfig = ReturnType<typeof makeDefaultConfig>;

let defaultConfig: DefaultConfig;

beforeEach(() => {
  defaultConfig = makeDefaultConfig();
});

afterEach(cleanup);

const keyEvent = (
  key: string,
  options: Partial<{
    metaKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    repeat: boolean;
    keyCode: number;
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
    altKey: options.altKey ?? false,
    repeat: options.repeat ?? false,
    keyCode: options.keyCode ?? 0,
    defaultPrevented: false,
    nativeEvent: { isComposing: options.isComposing ?? false },
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  };
  event.preventDefault.mockImplementation(() => {
    event.defaultPrevented = true;
  });
  return event as unknown as React.KeyboardEvent<HTMLElement>;
};

const changeEvent = (value: string) =>
  ({ target: { value } }) as React.ChangeEvent<HTMLInputElement>;

const ids = (list: readonly PreparedItem[]) => list.map((i) => i.id);

describe("isGroupList", () => {
  it("returns true for PreparedGroup[]", () => {
    expect(isGroupList([{ id: "g", label: "G", items: [] }])).toBe(true);
  });

  it("returns false for PreparedItem[]", () => {
    const item: PreparedItem = {
      id: "i",
      label: "I",
      itemProps: {
        id: "x",
        role: "option",
        "aria-disabled": undefined,
        onClick: vi.fn(),
        onMouseDown: vi.fn(),
        onPointerMove: vi.fn(),
      },
    };
    expect(isGroupList([item])).toBe(false);
  });

  it("returns false for items that carry their own `items` field", () => {
    const config = [{ id: "a", label: "A", items: ["x"], onSelect: vi.fn() }];
    const { result } = renderHook(() => useCommandMenu({ config }));

    expect(isGroupList(result.current.list)).toBe(false);
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

    it("strips onSelect, keeps disabled, adds itemProps", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      const item = result.current.list[3];
      expect(item).not.toHaveProperty("onSelect");
      expect(item.disabled).toBe(true);
      expect(item.itemProps).toMatchObject({ role: "option", "aria-disabled": true });
      expect(item.itemProps.onClick).toBeUndefined();
      expect(item.itemProps.onPointerMove).toBeUndefined();
    });

    it("preserves extra fields with their types", () => {
      const config = [
        { id: "a", label: "A", meta: { weight: 1 }, onSelect: vi.fn() },
      ] satisfies (Config & { meta: { weight: number } })[];
      const { result } = renderHook(() => useCommandMenu({ config }));

      const weight: number = result.current.list[0].meta.weight;
      expect(weight).toBe(1);
    });

    it("selects the first enabled item by default", () => {
      const config = [
        createConfig({ id: "off", label: "Off", disabled: true }),
        createConfig({ id: "on", label: "On" }),
      ];
      const { result } = renderHook(() => useCommandMenu({ config }));

      expect(result.current.selectedId).toBe("on");
    });

    it("has no selection when every item is disabled", () => {
      const config = [createConfig({ id: "off", label: "Off", disabled: true })];
      const { result } = renderHook(() => useCommandMenu({ config }));

      expect(result.current.selectedId).toBeUndefined();
      expect(result.current.searchProps["aria-activedescendant"]).toBeUndefined();
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
      expect(result.current.list[0]).toMatchObject({ id: "clipboard", label: "Clipboard" });
      expect(ids(result.current.list[0].items)).toEqual(["copy", "paste", "cut"]);
      expect(ids(result.current.list[1].items)).toEqual(["delete"]);
    });

    it("navigates in rendered order when groups reorder items", () => {
      const groups: Group<DefaultConfig>[] = [
        { id: "g1", label: "G1", items: ["cut", "copy"] },
        { id: "g2", label: "G2", items: ["paste"] },
      ];
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig, groups }));

      expect(result.current.selectedId).toBe("cut");
      act(() => result.current.menuProps.onKeyDown(keyEvent("ArrowDown")));
      expect(result.current.selectedId).toBe("copy");
      act(() => result.current.menuProps.onKeyDown(keyEvent("ArrowDown")));
      expect(result.current.selectedId).toBe("paste");
    });

    it("ignores config items that belong to no group", () => {
      const groups: Group<DefaultConfig>[] = [{ id: "g", label: "G", items: ["copy"] }];
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig, groups }));

      act(() => result.current.menuProps.onKeyDown(keyEvent("ArrowDown")));
      expect(result.current.selectedId).toBe("copy");
      act(() => result.current.menuProps.onKeyDown(keyEvent("Enter")));
      expect(defaultConfig[0].onSelect).toHaveBeenCalled();
      expect(defaultConfig[1].onSelect).not.toHaveBeenCalled();
    });

    it("returns an empty grouped list when no group has items", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig, groups: [] }));

      expect(result.current.list).toEqual([]);
      expect(result.current.selectedId).toBeUndefined();
    });

    it("accepts groups typed by item or by config array", () => {
      const config = [
        { id: "a", label: "A", onSelect: vi.fn() },
        { id: "b", label: "B", onSelect: vi.fn() },
      ] as const satisfies readonly Config[];
      const byArray: Group<typeof config>[] = [{ id: "g", label: "G", items: ["a"] }];
      const byItem: Group<(typeof config)[number]>[] = [{ id: "g", label: "G", items: ["b"] }];

      const { result: r1 } = renderHook(() => useCommandMenu({ config, groups: byArray }));
      const { result: r2 } = renderHook(() => useCommandMenu({ config, groups: byItem }));

      expect(r1.current.selectedId).toBe("a");
      expect(r2.current.selectedId).toBe("b");
    });
  });

  describe("search / filtering", () => {
    it("initializes with empty search query", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      expect(result.current.searchQuery).toBe("");
      expect(result.current.searchProps.value).toBe("");
    });

    it("filters items by search query, case-insensitive", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      act(() => result.current.searchProps.onChange(changeEvent("PASTE")));

      expect(result.current.searchQuery).toBe("PASTE");
      expect(ids(result.current.list)).toEqual(["paste"]);
    });

    it("returns empty list when no matches", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      act(() => result.current.searchProps.onChange(changeEvent("zzzzz")));

      expect(result.current.list).toHaveLength(0);
      expect(result.current.selectedId).toBeUndefined();
    });

    it("resets selection on search change", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      act(() => result.current.menuProps.onKeyDown(keyEvent("ArrowDown")));
      expect(result.current.selectedId).toBe("paste");

      act(() => result.current.searchProps.onChange(changeEvent("c")));
      expect(result.current.selectedId).toBe("copy");
    });

    it("calls onSearchChange on typing and on reset", () => {
      const onSearchChange = vi.fn();
      const { result } = renderHook(() =>
        useCommandMenu({ config: defaultConfig, onSearchChange }),
      );

      act(() => result.current.searchProps.onChange(changeEvent("cop")));
      expect(onSearchChange).toHaveBeenLastCalledWith("cop");

      act(() => result.current.list[0].itemProps.onClick?.());
      expect(onSearchChange).toHaveBeenLastCalledWith("");
      expect(onSearchChange).toHaveBeenCalledTimes(2);
    });

    it("does not call onSearchChange on reset when query was already empty", () => {
      const onSearchChange = vi.fn();
      const { result } = renderHook(() =>
        useCommandMenu({ config: defaultConfig, onSearchChange }),
      );

      act(() => result.current.list[0].itemProps.onClick?.());
      expect(onSearchChange).not.toHaveBeenCalled();
    });

    it("filters groups and hides empty groups", () => {
      const groups: Group<DefaultConfig>[] = [
        { id: "clipboard", label: "Clipboard", items: ["copy", "paste", "cut"] },
        { id: "destructive", label: "Destructive", items: ["delete"] },
      ];
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig, groups }));

      act(() => result.current.searchProps.onChange(changeEvent("cop")));

      expect(result.current.list).toHaveLength(1);
      expect(result.current.list[0].id).toBe("clipboard");
      expect(ids(result.current.list[0].items)).toEqual(["copy"]);
    });
  });

  describe("keyboard navigation", () => {
    it("moves selection with ArrowDown / ArrowUp", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      act(() => result.current.menuProps.onKeyDown(keyEvent("ArrowDown")));
      expect(result.current.selectedId).toBe("paste");

      act(() => result.current.menuProps.onKeyDown(keyEvent("ArrowDown")));
      expect(result.current.selectedId).toBe("cut");

      act(() => result.current.menuProps.onKeyDown(keyEvent("ArrowUp")));
      expect(result.current.selectedId).toBe("paste");
    });

    it("skips disabled items and clamps at both ends", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      act(() => {
        for (let i = 0; i < 10; i++) result.current.menuProps.onKeyDown(keyEvent("ArrowDown"));
      });
      expect(result.current.selectedId).toBe("cut");

      act(() => {
        for (let i = 0; i < 10; i++) result.current.menuProps.onKeyDown(keyEvent("ArrowUp"));
      });
      expect(result.current.selectedId).toBe("copy");
    });

    it("moves correctly right after the list shrinks", () => {
      const make = (n: number) =>
        Array.from({ length: n }, (_, i) => createConfig({ id: `i${i}`, label: `I${i}` }));
      const { result, rerender } = renderHook(({ config }) => useCommandMenu({ config }), {
        initialProps: { config: make(6) },
      });

      act(() => {
        for (let i = 0; i < 5; i++) result.current.menuProps.onKeyDown(keyEvent("ArrowDown"));
      });
      expect(result.current.selectedId).toBe("i5");

      rerender({ config: make(3) });
      expect(result.current.selectedId).toBe("i2");

      act(() => result.current.menuProps.onKeyDown(keyEvent("ArrowUp")));
      expect(result.current.selectedId).toBe("i1");
    });

    it("selects item on Enter and resets", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      act(() => result.current.searchProps.onChange(changeEvent("paste")));
      act(() => result.current.menuProps.onKeyDown(keyEvent("Enter")));

      expect(defaultConfig[1].onSelect).toHaveBeenCalled();
      expect(result.current.searchQuery).toBe("");
      expect(result.current.selectedId).toBe("copy");
    });

    it("selects nothing on Enter when every item is disabled", () => {
      const config = [createConfig({ id: "off", label: "Off", disabled: true })];
      const { result } = renderHook(() => useCommandMenu({ config }));

      act(() => result.current.menuProps.onKeyDown(keyEvent("Enter")));

      expect(config[0].onSelect).not.toHaveBeenCalled();
    });

    it("moves off an item that becomes disabled, so Enter can't select it", () => {
      const make = (disabled: boolean) => [
        createConfig({ id: "a", label: "A" }),
        createConfig({ id: "b", label: "B", disabled }),
        createConfig({ id: "c", label: "C" }),
      ];
      const { result, rerender } = renderHook(({ config }) => useCommandMenu({ config }), {
        initialProps: { config: make(false) },
      });

      act(() => result.current.menuProps.onKeyDown(keyEvent("ArrowDown")));
      expect(result.current.selectedId).toBe("b");

      const next = make(true);
      rerender({ config: next });
      expect(result.current.selectedId).toBe("c");

      act(() => result.current.menuProps.onKeyDown(keyEvent("Enter")));
      expect(next[1].onSelect).not.toHaveBeenCalled();
      expect(next[2].onSelect).toHaveBeenCalled();
    });

    it("keeps the query when Enter is pressed with no results", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      act(() => result.current.searchProps.onChange(changeEvent("zzz")));
      act(() => result.current.menuProps.onKeyDown(keyEvent("Enter")));

      expect(result.current.searchQuery).toBe("zzz");
    });

    it("leaves keys to the IME during composition", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      const composing = keyEvent("ArrowDown", { isComposing: true });
      act(() => result.current.menuProps.onKeyDown(composing));
      act(() => result.current.menuProps.onKeyDown(keyEvent("Enter", { isComposing: true })));

      expect(result.current.selectedId).toBe("copy");
      expect(composing.preventDefault).not.toHaveBeenCalled();
      expect(defaultConfig[0].onSelect).not.toHaveBeenCalled();
    });

    it("ignores the Enter that commits a Safari composition (keyCode 229)", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      act(() => result.current.menuProps.onKeyDown(keyEvent("Enter", { keyCode: 229 })));

      expect(defaultConfig[0].onSelect).not.toHaveBeenCalled();
    });

    it("does not repeat a selection while Enter is held", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      act(() => result.current.menuProps.onKeyDown(keyEvent("ArrowDown")));
      act(() => result.current.menuProps.onKeyDown(keyEvent("Enter")));
      const held = keyEvent("Enter", { repeat: true });
      act(() => result.current.menuProps.onKeyDown(held));

      expect(defaultConfig[1].onSelect).toHaveBeenCalledTimes(1);
      expect(defaultConfig[0].onSelect).not.toHaveBeenCalled();
      expect(held.preventDefault).toHaveBeenCalled();
    });

    it("leaves Cmd/Ctrl and Alt combos without a shortcut to the browser", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      const events = [
        keyEvent("ArrowDown", { metaKey: true }),
        keyEvent("Enter", { ctrlKey: true }),
        keyEvent("ArrowDown", { altKey: true }),
      ];
      act(() => {
        for (const e of events) result.current.menuProps.onKeyDown(e);
      });

      expect(result.current.selectedId).toBe("copy");
      for (const item of defaultConfig) expect(item.onSelect).not.toHaveBeenCalled();
      for (const e of events) expect(e.preventDefault).not.toHaveBeenCalled();
    });

    it("prevents default on arrow keys and Enter", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      const events = [keyEvent("ArrowDown"), keyEvent("ArrowUp"), keyEvent("Enter")];
      act(() => {
        for (const e of events) result.current.menuProps.onKeyDown(e);
      });

      for (const e of events) expect(e.preventDefault).toHaveBeenCalled();
    });

    it("calls custom onKeyDown before built-in handling", () => {
      let preventedBefore: boolean | undefined;
      const onKeyDown = vi.fn((e: React.KeyboardEvent) => {
        preventedBefore = e.defaultPrevented;
      });
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig, onKeyDown }));

      const event = keyEvent("ArrowDown");
      act(() => result.current.menuProps.onKeyDown(event));

      expect(onKeyDown).toHaveBeenCalledWith(event);
      expect(preventedBefore).toBe(false);
      expect(event.defaultPrevented).toBe(true);
    });

    it("skips navigation and shortcuts when custom onKeyDown calls preventDefault", () => {
      const onKeyDown = vi.fn((e: React.KeyboardEvent) => e.preventDefault());
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig, onKeyDown }));

      act(() => result.current.menuProps.onKeyDown(keyEvent("ArrowDown")));
      expect(result.current.selectedId).toBe("copy");

      act(() => result.current.menuProps.onKeyDown(keyEvent("c", { metaKey: true })));
      expect(defaultConfig[0].onSelect).not.toHaveBeenCalled();
    });

    it("forwards onKeyUp to the latest handler", () => {
      const first = vi.fn();
      const second = vi.fn();
      const { result, rerender } = renderHook(
        ({ onKeyUp }) => useCommandMenu({ config: defaultConfig, onKeyUp }),
        { initialProps: { onKeyUp: first } },
      );
      const { menuProps } = result.current;

      rerender({ onKeyUp: second });
      const event = keyEvent("a");
      result.current.menuProps.onKeyUp(event);

      expect(result.current.menuProps).toBe(menuProps);
      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledWith(event);
    });
  });

  describe("shortcuts", () => {
    it("triggers shortcut with metaKey or ctrlKey", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      const meta = keyEvent("c", { metaKey: true });
      act(() => result.current.menuProps.onKeyDown(meta));
      expect(defaultConfig[0].onSelect).toHaveBeenCalled();
      expect(meta.preventDefault).toHaveBeenCalled();
      expect(meta.stopPropagation).toHaveBeenCalled();

      act(() => result.current.menuProps.onKeyDown(keyEvent("v", { ctrlKey: true })));
      expect(defaultConfig[1].onSelect).toHaveBeenCalled();
    });

    it("matches shift shortcuts", () => {
      const config = [createConfig({ id: "s", label: "S", shortcut: "⇧ S" })];
      const { result } = renderHook(() => useCommandMenu({ config }));

      act(() =>
        result.current.menuProps.onKeyDown(keyEvent("S", { metaKey: true, shiftKey: true })),
      );

      expect(config[0].onSelect).toHaveBeenCalled();
    });

    it("resets query and selection after shortcut", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      act(() => result.current.searchProps.onChange(changeEvent("test")));
      act(() => result.current.menuProps.onKeyDown(keyEvent("c", { metaKey: true })));

      expect(result.current.searchQuery).toBe("");
      expect(result.current.selectedId).toBe("copy");
    });

    it("ignores shortcuts of disabled items", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      const event = keyEvent("x", { metaKey: true });
      act(() => result.current.menuProps.onKeyDown(event));

      expect(defaultConfig[3].onSelect).not.toHaveBeenCalled();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("first item wins on duplicate shortcuts", () => {
      const config = [
        createConfig({ id: "a", label: "A", shortcut: "K" }),
        createConfig({ id: "b", label: "B", shortcut: "K" }),
      ];
      const { result } = renderHook(() => useCommandMenu({ config }));

      act(() => result.current.menuProps.onKeyDown(keyEvent("k", { metaKey: true })));

      expect(config[0].onSelect).toHaveBeenCalled();
      expect(config[1].onSelect).not.toHaveBeenCalled();
    });

    it("lets a later enabled item use a shortcut a disabled one also has", () => {
      const config = [
        createConfig({ id: "a", label: "A", shortcut: "K", disabled: true }),
        createConfig({ id: "b", label: "B", shortcut: "K" }),
      ];
      const { result } = renderHook(() => useCommandMenu({ config }));

      act(() => result.current.menuProps.onKeyDown(keyEvent("k", { metaKey: true })));

      expect(config[1].onSelect).toHaveBeenCalled();
    });

    it("matches digits, through Shift too", () => {
      const config = [
        createConfig({ id: "one", label: "One", shortcut: "1" }),
        createConfig({ id: "bang", label: "Bang", shortcut: "⇧ 1" }),
      ];
      const { result } = renderHook(() => useCommandMenu({ config }));

      act(() =>
        result.current.menuProps.onKeyDown(keyEvent("1", { metaKey: true, code: "Digit1" })),
      );
      act(() =>
        result.current.menuProps.onKeyDown(
          keyEvent("!", { metaKey: true, shiftKey: true, code: "Digit1" }),
        ),
      );

      expect(config[0].onSelect).toHaveBeenCalledTimes(1);
      expect(config[1].onSelect).toHaveBeenCalledTimes(1);
    });

    it("follows the keyboard layout, falling back to the physical key", () => {
      const config = [
        createConfig({ id: "a", label: "A", shortcut: "A" }),
        createConfig({ id: "q", label: "Q", shortcut: "Q" }),
      ];
      const { result } = renderHook(() => useCommandMenu({ config }));

      // AZERTY: the key labelled A sits where QWERTY has Q.
      act(() => result.current.menuProps.onKeyDown(keyEvent("a", { metaKey: true, code: "KeyQ" })));
      expect(config[0].onSelect).toHaveBeenCalledTimes(1);
      expect(config[1].onSelect).not.toHaveBeenCalled();

      // Cyrillic: the key types "ф", so only its physical position can match.
      act(() => result.current.menuProps.onKeyDown(keyEvent("ф", { metaKey: true, code: "KeyA" })));
      expect(config[0].onSelect).toHaveBeenCalledTimes(2);
    });

    it("matches shortcuts case-insensitively", () => {
      const config = [createConfig({ id: "s", label: "S", shortcut: "⇧ s" })];
      const { result } = renderHook(() => useCommandMenu({ config }));

      act(() =>
        result.current.menuProps.onKeyDown(keyEvent("S", { metaKey: true, shiftKey: true })),
      );

      expect(config[0].onSelect).toHaveBeenCalled();
    });

    it("ignores Alt and does not repeat while held", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      act(() => result.current.menuProps.onKeyDown(keyEvent("c", { metaKey: true, altKey: true })));
      expect(defaultConfig[0].onSelect).not.toHaveBeenCalled();

      const held = keyEvent("c", { metaKey: true, repeat: true });
      act(() => result.current.menuProps.onKeyDown(held));
      expect(defaultConfig[0].onSelect).not.toHaveBeenCalled();
      expect(held.preventDefault).toHaveBeenCalled();
    });

    it("skips items that belong to no group", () => {
      const groups: Group<DefaultConfig>[] = [{ id: "g", label: "G", items: ["paste"] }];
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig, groups }));

      act(() => result.current.menuProps.onKeyDown(keyEvent("c", { metaKey: true })));
      act(() => result.current.menuProps.onKeyDown(keyEvent("v", { metaKey: true })));

      expect(defaultConfig[0].onSelect).not.toHaveBeenCalled();
      expect(defaultConfig[1].onSelect).toHaveBeenCalled();
    });

    it("does not trigger when no matching shortcut", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      act(() => result.current.menuProps.onKeyDown(keyEvent("q", { metaKey: true })));

      for (const item of defaultConfig) expect(item.onSelect).not.toHaveBeenCalled();
    });
  });

  describe("item interactions", () => {
    it("onClick calls onSelect and resets state", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      act(() => result.current.searchProps.onChange(changeEvent("cop")));
      act(() => result.current.list[0].itemProps.onClick?.());

      expect(defaultConfig[0].onSelect).toHaveBeenCalled();
      expect(result.current.searchQuery).toBe("");
    });

    it("onPointerMove updates selection", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));

      act(() => result.current.list[2].itemProps.onPointerMove?.());

      expect(result.current.selectedId).toBe("cut");
    });

    it("does not render again for pointer moves over the highlighted item", () => {
      let renders = 0;
      const { result } = renderHook(() => {
        renders++;
        return useCommandMenu({ config: defaultConfig });
      });

      act(() => result.current.list[2].itemProps.onPointerMove?.());
      const after = renders;
      act(() => {
        for (let i = 0; i < 10; i++) result.current.list[2].itemProps.onPointerMove?.();
      });
      act(() => result.current.list[0].itemProps.onPointerMove?.());
      act(() => result.current.list[0].itemProps.onPointerMove?.());

      expect(renders - after).toBe(1);
    });
  });

  describe("async results", () => {
    const asyncGroup = (items: Config[]): AsyncResultsGroup => ({
      id: "async",
      label: "Async",
      items,
    });

    it("appends async items to the flat list when no groups are defined", () => {
      const asyncResultsGroup = asyncGroup([createConfig({ id: "r1", label: "Result 1" })]);
      const { result } = renderHook(() =>
        useCommandMenu({ config: defaultConfig, asyncResultsGroup }),
      );

      expect(isGroupList(result.current.list)).toBe(false);
      expect(ids(result.current.list)).toEqual(["copy", "paste", "cut", "delete", "r1"]);
    });

    it("adds an async group after local groups", () => {
      const groups: Group<DefaultConfig>[] = [
        { id: "clipboard", label: "Clipboard", items: ["copy", "paste", "cut"] },
      ];
      const asyncResultsGroup = asyncGroup([createConfig({ id: "async1", label: "Async Item" })]);
      const { result } = renderHook(() =>
        useCommandMenu({ config: defaultConfig, groups, asyncResultsGroup }),
      );

      expect(result.current.list).toHaveLength(2);
      expect(result.current.list[1]).toMatchObject({ id: "async", label: "Async" });
      expect(ids(result.current.list[1].items)).toEqual(["async1"]);
    });

    it("omits the async group while it has no items", () => {
      const { result } = renderHook(() =>
        useCommandMenu({
          config: defaultConfig,
          groups: [{ id: "g", label: "G", items: ["copy"] }],
          asyncResultsGroup: asyncGroup([]),
        }),
      );

      expect(result.current.list).toHaveLength(1);
    });

    it("accepts results whose ids are outside an `as const` config", () => {
      const config = [
        { id: "a", label: "A", onSelect: vi.fn() },
      ] as const satisfies readonly Config[];
      const groups: Group<typeof config>[] = [{ id: "g", label: "G", items: ["a"] }];
      const results: Config[] = [createConfig({ id: "remote", label: "Remote" })];
      const { result } = renderHook(() =>
        useCommandMenu({
          config,
          groups,
          asyncResultsGroup: { id: "r", label: "R", items: results },
        }),
      );

      expectTypeOf(result.current.list[0].items[0].id).toEqualTypeOf<string>();
      expect(ids(result.current.list[1].items)).toEqual(["remote"]);
    });

    it("keeps the highlight on the same result when results move", () => {
      const { result, rerender } = renderHook(
        ({ items }) =>
          useCommandMenu({
            config: [createConfig({ id: "a", label: "A" })],
            asyncResultsGroup: asyncGroup(items),
          }),
        {
          initialProps: {
            items: ["x", "y", "z"].map((id) => createConfig({ id, label: id })),
          },
        },
      );

      act(() => result.current.menuProps.onKeyDown(keyEvent("ArrowDown")));
      act(() => result.current.menuProps.onKeyDown(keyEvent("ArrowDown")));
      expect(result.current.selectedId).toBe("y");

      rerender({ items: ["new", "x", "y", "z"].map((id) => createConfig({ id, label: id })) });
      expect(result.current.selectedId).toBe("y");
    });

    it("drops results whose id is already on the menu", () => {
      const asyncResultsGroup = asyncGroup([
        createConfig({ id: "copy", label: "Remote copy" }),
        createConfig({ id: "r1", label: "Result 1" }),
      ]);
      const { result } = renderHook(() =>
        useCommandMenu({ config: defaultConfig, asyncResultsGroup }),
      );

      expect(ids(result.current.list)).toEqual(["copy", "paste", "cut", "delete", "r1"]);
      expect(result.current.list[0].label).toBe("Copy");
    });

    it("navigates through local and async items", () => {
      const asyncResultsGroup = asyncGroup([createConfig({ id: "async1", label: "Async Item" })]);
      const { result } = renderHook(() =>
        useCommandMenu({ config: defaultConfig, asyncResultsGroup }),
      );

      act(() => {
        for (let i = 0; i < 4; i++) result.current.menuProps.onKeyDown(keyEvent("ArrowDown"));
      });

      expect(result.current.selectedId).toBe("async1");
    });
  });

  describe("duplicate ids", () => {
    it("shows an item listed in two groups only in the first", () => {
      const groups: Group<DefaultConfig>[] = [
        { id: "g1", label: "G1", items: ["copy", "paste"] },
        { id: "g2", label: "G2", items: ["copy", "cut"] },
      ];
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig, groups }));

      expect(ids(result.current.list[0].items)).toEqual(["copy", "paste"]);
      expect(ids(result.current.list[1].items)).toEqual(["cut"]);

      act(() => {
        for (let i = 0; i < 5; i++) result.current.menuProps.onKeyDown(keyEvent("ArrowDown"));
      });
      expect(result.current.selectedId).toBe("cut");
    });
  });

  describe("render cost", () => {
    const makeMany = (n: number) =>
      Array.from({ length: n }, (_, i) =>
        createConfig({ id: `i${i}`, label: `${i % 2 ? "odd" : "even"} item ${i}` }),
      );

    // A consumer with memoized rows, counting how often the menu and its rows render.
    const renderCounted = (props: { config: Config[]; groups?: Group[]; async?: Config[] }) => {
      const counts = { menu: 0, rows: 0 };
      const Row = memo(({ item, isSelected }: { item: PreparedItem; isSelected: boolean }) => {
        counts.rows++;
        return (
          // biome-ignore lint/a11y/useAriaPropsSupportedByRole: `role="option"` comes from itemProps
          <li {...item.itemProps} aria-selected={isSelected}>
            {item.label}
          </li>
        );
      });
      const Menu = ({ config, groups, async }: typeof props) => {
        counts.menu++;
        const { list, listProps, menuProps, searchProps, selectedId } = useCommandMenu({
          config,
          groups,
          asyncResultsGroup: async && { id: "r", label: "R", items: async },
          onSearchChange: vi.fn(),
        });
        const row = (item: PreparedItem) => (
          <Row key={item.id} item={item} isSelected={item.id === selectedId} />
        );
        return (
          <div {...menuProps}>
            <input {...searchProps} />
            <ul {...listProps}>
              {isGroupList(list)
                ? list.map((g) => (
                    <li key={g.id} role="presentation">
                      {/* biome-ignore lint/a11y/useSemanticElements: a <fieldset> can't sit inside a listbox */}
                      <ul role="group" aria-label={g.label}>
                        {g.items.map(row)}
                      </ul>
                    </li>
                  ))
                : list.map(row)}
            </ul>
          </div>
        );
      };
      const ui = render(<Menu {...props} />);
      const reset = () => {
        counts.menu = 0;
        counts.rows = 0;
      };
      return { counts, reset, ui, Menu, input: screen.getByRole("combobox") };
    };

    it("re-renders only the two rows whose highlight changes on arrow keys", () => {
      const { counts, reset, input } = renderCounted({ config: makeMany(50) });
      reset();

      fireEvent.keyDown(input, { key: "ArrowDown" });

      expect(counts).toEqual({ menu: 1, rows: 2 });
    });

    it("does not render at all for an arrow key at the end of the list", () => {
      const { counts, reset, input } = renderCounted({ config: makeMany(3) });
      for (let i = 0; i < 2; i++) fireEvent.keyDown(input, { key: "ArrowDown" });
      reset();

      fireEvent.keyDown(input, { key: "ArrowDown" });

      expect(counts).toEqual({ menu: 0, rows: 0 });
    });

    it("re-renders no surviving row while a query narrows", () => {
      const { counts, reset, input } = renderCounted({ config: makeMany(50) });
      fireEvent.change(input, { target: { value: "e" } });
      reset();

      fireEvent.change(input, { target: { value: "ev" } });
      fireEvent.change(input, { target: { value: "eve" } });

      expect(counts).toEqual({ menu: 2, rows: 0 });
    });

    it("renders only rows that reappear when a query widens", () => {
      const { counts, reset, input } = renderCounted({ config: makeMany(50) });
      fireEvent.change(input, { target: { value: "odd" } });
      reset();

      fireEvent.change(input, { target: { value: "" } });

      // The 25 even rows mount; the 25 odd ones are untouched, bar the first, which loses the highlight.
      expect(counts).toEqual({ menu: 1, rows: 26 });
    });

    it("renders only the new row when async results grow", () => {
      const config = makeMany(20);
      const first = [createConfig({ id: "r1", label: "R1" })];
      const { counts, reset, ui, Menu } = renderCounted({ config, async: first });
      reset();

      ui.rerender(
        <Menu config={config} async={[...first, createConfig({ id: "r2", label: "R2" })]} />,
      );

      expect(counts).toEqual({ menu: 1, rows: 1 });
    });

    it("keeps unchanged groups when async results arrive", () => {
      const config = makeMany(4);
      const groups: Group[] = [
        { id: "a", label: "A", items: ["i0", "i1"] },
        { id: "b", label: "B", items: ["i2", "i3"] },
      ];
      const { result, rerender } = renderHook(
        ({ items }) =>
          useCommandMenu({
            config,
            groups,
            asyncResultsGroup: { id: "r", label: "R", items },
          }),
        { initialProps: { items: [] as Config[] } },
      );
      const [a, b] = result.current.list;

      rerender({ items: [createConfig({ id: "r1", label: "R1" })] });

      expect(result.current.list[0]).toBe(a);
      expect(result.current.list[1]).toBe(b);
      expect(result.current.list).toHaveLength(3);
    });

    it("does not re-render the menu for a selection that changes nothing in it", () => {
      const { counts, reset } = renderCounted({ config: makeMany(5) });
      reset();

      fireEvent.click(screen.getAllByRole("option")[0]);

      expect(counts).toEqual({ menu: 0, rows: 0 });
    });

    it("keeps each item's identity across queries", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));
      const paste = result.current.list[1];

      act(() => result.current.searchProps.onChange(changeEvent("pa")));
      expect(result.current.list[0]).toBe(paste);

      act(() => result.current.searchProps.onChange(changeEvent("")));
      expect(result.current.list[1]).toBe(paste);
    });
  });

  describe("referential stability", () => {
    it("keeps list and menuProps identity with inline callbacks", () => {
      const { result } = renderHook(() =>
        useCommandMenu({
          config: defaultConfig,
          onSearchChange: vi.fn(),
          onKeyDown: vi.fn(),
          onKeyUp: vi.fn(),
        }),
      );
      const { list, menuProps } = result.current;

      act(() => result.current.menuProps.onKeyDown(keyEvent("ArrowDown")));
      act(() => result.current.list[2].itemProps.onPointerMove?.());

      expect(result.current.list).toBe(list);
      expect(result.current.menuProps).toBe(menuProps);
    });

    it("calls the latest onSearchChange", () => {
      const first = vi.fn();
      const second = vi.fn();
      const { result, rerender } = renderHook(
        ({ onSearchChange }) => useCommandMenu({ config: defaultConfig, onSearchChange }),
        { initialProps: { onSearchChange: first } },
      );

      rerender({ onSearchChange: second });
      act(() => result.current.searchProps.onChange(changeEvent("c")));

      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledWith("c");
    });

    it("keeps list identity when async items are an inline empty array", () => {
      const groups: Group<DefaultConfig>[] = [{ id: "g", label: "G", items: ["copy"] }];
      const { result, rerender } = renderHook(() =>
        useCommandMenu({
          config: defaultConfig,
          groups,
          asyncResultsGroup: { id: "async", label: "Async", items: [] },
        }),
      );
      const { list } = result.current;

      rerender();

      expect(result.current.list).toBe(list);
    });

    it("keeps list and listProps identity across arrow navigation", () => {
      const { result } = renderHook(() => useCommandMenu({ config: defaultConfig }));
      const { list, listProps } = result.current;

      act(() => result.current.menuProps.onKeyDown(keyEvent("ArrowDown")));

      expect(result.current.list).toBe(list);
      expect(result.current.listProps).toBe(listProps);
    });

    it("keeps list identity when asyncResultsGroup is recreated with the same contents", () => {
      const items = [createConfig({ id: "x", label: "X" })];
      const { result, rerender } = renderHook(() =>
        useCommandMenu({
          config: defaultConfig,
          asyncResultsGroup: { id: "async", label: "Async", items },
        }),
      );
      const { list } = result.current;

      rerender();

      expect(result.current.list).toBe(list);
    });

    it("keeps list identity when config is unchanged on rerender", () => {
      const { result, rerender } = renderHook(() => useCommandMenu({ config: defaultConfig }));
      const { list, menuProps } = result.current;

      rerender();

      expect(result.current.list).toBe(list);
      expect(result.current.menuProps).toBe(menuProps);
    });
  });

  describe("config updates", () => {
    it("reflects new config on rerender", () => {
      const { result, rerender } = renderHook(({ config }) => useCommandMenu({ config }), {
        initialProps: { config: [createConfig({ id: "a", label: "A" })] },
      });

      expect(result.current.list).toHaveLength(1);

      rerender({
        config: [createConfig({ id: "a", label: "A" }), createConfig({ id: "b", label: "B" })],
      });

      expect(result.current.list).toHaveLength(2);
    });
  });

  describe("DOM integration", () => {
    const Menu = ({ config, extra }: { config: Config[]; extra?: React.ReactNode }) => {
      const { list, listProps, menuProps, searchProps, selectedId } = useCommandMenu({ config });
      return (
        <div {...menuProps}>
          <input {...searchProps} />
          {extra}
          <ul {...listProps}>
            {list.map((item) => (
              // biome-ignore lint/a11y/useAriaPropsSupportedByRole: `role="option"` comes from itemProps
              <li key={item.id} {...item.itemProps} aria-selected={item.id === selectedId}>
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      );
    };

    const ROW = 40;
    const VIEW = 100;

    // jsdom has no layout: give the listbox a 100px viewport over 40px rows.
    const mockLayout = (listbox: HTMLElement) => {
      let scrollTop = 0;
      const rect = (top: number, height: number) =>
        ({ top, bottom: top + height, height, left: 0, right: 0, width: 0 }) as DOMRect;
      listbox.style.setProperty("overflow-y", "auto");
      Object.defineProperties(listbox, {
        scrollTop: {
          get: () => scrollTop,
          set: (v: number) => (scrollTop = v),
          configurable: true,
        },
        clientHeight: { value: VIEW, configurable: true },
        scrollHeight: { get: () => listbox.children.length * ROW, configurable: true },
        getBoundingClientRect: { value: () => rect(0, VIEW), configurable: true },
      });
      Array.from(listbox.children).forEach((option, i) => {
        Object.defineProperty(option, "getBoundingClientRect", {
          value: () => rect(i * ROW - scrollTop, ROW),
          configurable: true,
        });
      });
      return () => scrollTop;
    };

    const manyItems = () =>
      Array.from({ length: 8 }, (_, i) => createConfig({ id: `item ${i}`, label: `Item ${i}` }));

    it("wires combobox, listbox and option ARIA attributes", () => {
      render(<Menu config={defaultConfig} />);

      const input = screen.getByRole("combobox");
      const listbox = screen.getByRole("listbox");
      const options = screen.getAllByRole("option");

      expect(input.getAttribute("aria-controls")).toBe(listbox.id);
      expect(input.getAttribute("aria-activedescendant")).toBe(options[0].id);
      expect(input.getAttribute("aria-autocomplete")).toBe("list");
      expect(options[0].getAttribute("aria-selected")).toBe("true");
      expect(options[3].getAttribute("aria-disabled")).toBe("true");
    });

    it("gives options DOM ids that are unique and free of whitespace", () => {
      render(
        <Menu
          config={[
            createConfig({ id: "list", label: "List" }),
            createConfig({ id: "with space", label: "Spaced" }),
          ]}
        />,
      );

      const listbox = screen.getByRole("listbox");
      const options = screen.getAllByRole("option");

      expect(options[0].id).not.toBe(listbox.id);
      expect(options[1].id).not.toMatch(/\s/);
      fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });
      expect(
        document.getElementById(
          screen.getByRole("combobox").getAttribute("aria-activedescendant") ?? "",
        ),
      ).toBe(options[1]);
    });

    it("keeps focus in the input when an item is pressed", () => {
      render(<Menu config={defaultConfig} />);

      const notPrevented = fireEvent.mouseDown(screen.getAllByRole("option")[1]);

      expect(notPrevented).toBe(false);
    });

    it("leaves keys pressed in other controls inside the menu alone", () => {
      const onClick = vi.fn();
      render(
        <Menu
          config={defaultConfig}
          extra={
            <button type="button" onClick={onClick}>
              Other
            </button>
          }
        />,
      );
      const button = screen.getByRole("button");

      const arrowNotPrevented = fireEvent.keyDown(button, { key: "ArrowDown" });
      const enterNotPrevented = fireEvent.keyDown(button, { key: "Enter" });

      expect(arrowNotPrevented).toBe(true);
      expect(enterNotPrevented).toBe(true);
      expect(defaultConfig[0].onSelect).not.toHaveBeenCalled();
      expect(screen.getAllByRole("option")[0].getAttribute("aria-selected")).toBe("true");
    });

    it("scrolls the list to keyboard moves only, never the page", () => {
      const scrollIntoView = vi.fn();
      const original = Element.prototype.scrollIntoView;
      Element.prototype.scrollIntoView = scrollIntoView;
      try {
        render(<Menu config={manyItems()} />);
        const input = screen.getByRole("combobox");
        const scrollTop = mockLayout(screen.getByRole("listbox"));

        for (let i = 0; i < 3; i++) fireEvent.keyDown(input, { key: "ArrowDown" });
        // Row 3 spans 120–160px; the 100px viewport must scroll by 60px to show it.
        expect(scrollTop()).toBe(60);

        fireEvent.pointerMove(screen.getAllByRole("option")[1]);
        expect(input.getAttribute("aria-activedescendant")).toBe(
          screen.getAllByRole("option")[1].id,
        );
        expect(scrollTop()).toBe(60);

        fireEvent.change(input, { target: { value: "item" } });
        expect(scrollTop()).toBe(0);
        expect(scrollIntoView).not.toHaveBeenCalled();
      } finally {
        Element.prototype.scrollIntoView = original;
      }
    });

    it("does not scroll on mount", () => {
      render(<Menu config={manyItems()} />);
      const scrollTop = mockLayout(screen.getByRole("listbox"));

      expect(scrollTop()).toBe(0);
    });

    it("scrolls inside a shadow root", () => {
      const host = document.createElement("div");
      document.body.append(host);
      const container = document.createElement("div");
      host.attachShadow({ mode: "open" }).append(container);
      // jsdom ignores inline styles when computing style inside a shadow tree; browsers don't.
      const computed = vi
        .spyOn(window, "getComputedStyle")
        .mockImplementation(
          (element) =>
            ({ overflowY: (element as HTMLElement).style.overflowY }) as CSSStyleDeclaration,
        );
      try {
        const { getByRole } = render(<Menu config={manyItems()} />, { container });
        const scrollTop = mockLayout(getByRole("listbox"));

        for (let i = 0; i < 3; i++) fireEvent.keyDown(getByRole("combobox"), { key: "ArrowDown" });

        expect(scrollTop()).toBe(60);
      } finally {
        computed.mockRestore();
        host.remove();
      }
    });
  });

  describe("types", () => {
    it("keeps each item's own fields and the optional Config ones", () => {
      const config = [
        { id: "docs", label: "Docs", description: "Read the docs", onSelect: vi.fn() },
        { id: "search", label: "Search", shortcut: "F", onSelect: vi.fn() },
      ] as const satisfies readonly Config[];
      const { result } = renderHook(() => useCommandMenu({ config }));
      const item = result.current.list[0];

      expectTypeOf(item.id).toEqualTypeOf<"docs" | "search">();
      expectTypeOf(item.description).toEqualTypeOf<"Read the docs" | string | undefined>();
      expectTypeOf(item.shortcut).toEqualTypeOf<string | undefined>();
      expectTypeOf(item.disabled).toEqualTypeOf<boolean | undefined>();
      expectTypeOf(item).not.toHaveProperty("onSelect");
      expect(item.description).toBe("Read the docs");
    });

    it("keeps the variants of a discriminated union", () => {
      type Nav = Config & { kind: "nav"; href: string };
      type Action = Config & { kind: "action"; run: number };
      const config: (Nav | Action)[] = [
        { kind: "nav", id: "n", label: "N", href: "/n", onSelect: vi.fn() },
        { kind: "action", id: "a", label: "A", run: 1, onSelect: vi.fn() },
      ];
      const { result } = renderHook(() => useCommandMenu({ config }));
      const item = result.current.list[0];

      if (item.kind === "nav") expectTypeOf(item.href).toEqualTypeOf<string>();
      else expectTypeOf(item.run).toEqualTypeOf<number>();
      expect(item.kind === "nav" && item.href).toBe("/n");
    });

    it("rejects group ids that aren't in an `as const` config", () => {
      const config = [
        { id: "a", label: "A", onSelect: vi.fn() },
      ] as const satisfies readonly Config[];
      // @ts-expect-error "b" is not an id in config
      const groups: Group<typeof config>[] = [{ id: "g", label: "G", items: ["b"] }];

      expect(groups).toHaveLength(1);
    });

    it("types list by whether groups are given", () => {
      const groups: Group<DefaultConfig>[] = [{ id: "g", label: "G", items: ["copy"] }];
      const { result: grouped } = renderHook(() =>
        useCommandMenu({ config: defaultConfig, groups }),
      );
      const { result: flat } = renderHook(() => useCommandMenu({ config: defaultConfig }));
      const { result: maybe } = renderHook(() =>
        useCommandMenu({ config: defaultConfig, groups: Math.random() > 2 ? groups : undefined }),
      );

      expectTypeOf(grouped.current.list).toEqualTypeOf<PreparedGroup<Config>[]>();
      expectTypeOf(flat.current.list).toEqualTypeOf<PreparedItem<Config>[]>();
      expectTypeOf(maybe.current.list).toEqualTypeOf<
        PreparedGroup<Config>[] | PreparedItem<Config>[]
      >();
    });
  });
});
