import type {
  ChangeEventHandler,
  ElementType,
  KeyboardEventHandler,
  MouseEventHandler,
} from "react";

/**
 * Base shape of a menu item. Extend it with any extra fields you need
 * (icons, descriptions, metadata); they are passed through to `PreparedItem` untouched.
 * `id` must be unique across `config` and async results; later duplicates are dropped.
 */
export type Config = {
  id: string;
  label: string;
  /**
   * Key matched while Cmd/Ctrl is held, e.g. `"F"`, `"1"` or `"⇧ S"`. Matched against the
   * character the key types first, then against the physical key, so it follows the
   * user's keyboard layout and still works on non-Latin ones.
   */
  shortcut?: string;
  description?: string;
  icon?: ElementType;
  disabled?: boolean;
  onSelect: () => void;
};

type ItemOf<T> = T extends readonly (infer I extends Config)[] ? I : T;

export type GroupOf<Id extends string> = {
  id: string;
  label: string;
  items: readonly Id[];
};

/** Accepts either an item type or a config array type: `Group<Item>` or `Group<typeof config>`. */
export type Group<T extends Config | readonly Config[] = Config> = GroupOf<ItemOf<T>["id"]>;

export type AsyncResultsGroup<T extends Config = Config> = {
  id: string;
  label: string;
  items: readonly T[];
};

export type ItemProps = {
  id: string;
  role: "option";
  "aria-disabled": true | undefined;
  onClick: (() => void) | undefined;
  /** Keeps focus in the search input when an item is pressed. */
  onMouseDown: MouseEventHandler<HTMLElement>;
  onPointerMove: (() => void) | undefined;
};

/**
 * An item as the hook hands it back: everything from `T` except `onSelect`, plus `itemProps`.
 * Distributes over unions, so each variant keeps its own fields, and the optional `Config`
 * fields stay readable on items that don't set them.
 */
export type PreparedItem<T extends Config = Config> = T extends unknown
  ? Omit<T, "onSelect"> & Omit<Config, "onSelect" | keyof T> & { itemProps: ItemProps }
  : never;

export type PreparedGroup<T extends Config = Config> = {
  id: string;
  label: string;
  items: PreparedItem<T>[];
};

export type MenuProps = {
  onKeyDown: KeyboardEventHandler<HTMLElement>;
  onKeyUp: KeyboardEventHandler<HTMLElement>;
};

export type SearchProps = {
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  role: "combobox";
  "aria-expanded": true;
  "aria-controls": string;
  "aria-activedescendant": string | undefined;
  "aria-autocomplete": "list";
  autoComplete: "off";
};

export type ListProps = {
  id: string;
  role: "listbox";
  /** Lets the hook scroll the highlighted option into view. Merge it if you need your own ref. */
  ref: (element: HTMLElement | null) => void;
};

/**
 * `T` is the config item type. `A` is the async result type; it defaults to `T` and is inferred
 * separately, so results with ids outside an `as const` config are accepted.
 */
export type UseCommandMenuArgs<T extends Config, A extends Config = T> = {
  config: readonly T[];
  groups?: readonly GroupOf<NoInfer<T>["id"]>[];
  asyncResultsGroup?: AsyncResultsGroup<A>;
  onKeyDown?: KeyboardEventHandler<HTMLElement>;
  onKeyUp?: KeyboardEventHandler<HTMLElement>;
  onSearchChange?: (query: string) => void;
};

export type UseCommandMenuReturn<L> = {
  list: L;
  /** `id` of the highlighted item, `undefined` when nothing is selectable. */
  selectedId: string | undefined;
  menuProps: MenuProps;
  searchProps: SearchProps;
  listProps: ListProps;
  searchQuery: string;
};
