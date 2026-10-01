# CommandMenu

A headless React hook for building command menus. It handles search, keyboard navigation, shortcuts, selection, scrolling and ARIA wiring. You bring your own UI.

Demo: [commandmenu.wojtekolek.com](https://commandmenu.wojtekolek.com/)

## Installation

```bash
npm i commandmenu
# or
yarn add commandmenu
# or
pnpm add commandmenu
```

## Quick start

Define your config and pass it to the hook. Spread the returned props onto your elements.

```tsx
import { type Config, useCommandMenu } from "commandmenu";

const config = [
  {
    id: "docs",
    label: "Documentation",
    description: "Read the docs",
    onSelect: () => console.log("docs"),
  },
  {
    id: "search",
    label: "Search",
    shortcut: "F",
    onSelect: () => console.log("search"),
  },
] as const satisfies readonly Config[];

const CommandMenu = () => {
  const { menuProps, searchProps, listProps, list, selectedId } = useCommandMenu({ config });

  return (
    <div {...menuProps}>
      <input {...searchProps} placeholder="Search..." />
      <ul {...listProps}>
        {list.map((item) => {
          const isSelected = item.id === selectedId;
          return (
            <li
              key={item.id}
              {...item.itemProps}
              aria-selected={isSelected}
              style={{ background: isSelected ? "#f0f0f0" : undefined }}
            >
              {item.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
```

`menuProps` goes on the element that wraps the input and the list. It carries the keyboard handlers. `searchProps` turns the input into an ARIA combobox, `listProps` marks the list as its listbox, and `item.itemProps` marks each row as an option with a stable DOM id. Pressing a row doesn't take focus away from the input, so the keyboard keeps working after a click.

`listProps` carries a `ref` the hook uses to scroll the highlighted option into view. If you need your own ref on the list too, merge the two. Item `id`s must be unique across `config` and async results; if one repeats, only its first occurrence is kept.

### Keyboard

| Key | Action |
|-----|--------|
| `ArrowUp` / `ArrowDown` | Move the highlight, skipping disabled items |
| `Enter` | Select the highlighted item. Held-down repeats are ignored |
| `Cmd`/`Ctrl` + `shortcut` | Select the item with that `shortcut`, from anywhere in the menu |

Arrow keys and Enter are handled only when they're pressed in the search input (or on the menu element itself), so other controls inside the menu, like a button, keep their own keys. Keys pressed during IME composition are left to the IME. That includes the Enter that commits a composition, which Safari reports only as `keyCode` 229. Other Cmd/Ctrl and Alt combinations, like Cmd+ArrowDown, are left to the browser and the input. So are `Home`/`End`, which keep moving the caret.

`shortcut` is matched case-insensitively against the character the key types, then against the physical key. So `"F"` fires on Cmd+F or Ctrl+F, follows layouts like AZERTY, and still works on non-Latin layouts. Digits work too (`"1"`). Prefix a shortcut with `"⇧ "` to require Shift, e.g. `"⇧ S"`. Shortcuts ignore Alt and key repeat, skip disabled items, and only cover items that are on the menu: with `groups`, an item in no group has no shortcut. If two enabled items share a shortcut, the first one wins.

## Custom item fields

`useCommandMenu` is generic over the item type. Any extra field you put on a config item is preserved, fully typed, on the corresponding `PreparedItem`. Only `onSelect` is stripped. A union of item types keeps each variant's fields, so you can narrow on a discriminant. The optional `Config` fields (`description`, `shortcut`, `icon`, `disabled`) stay readable on items that don't set them, which matters for `as const` configs.

```tsx
import type { Config } from "commandmenu";
import type { ElementType } from "react";

type Item = Config & { icon: ElementType; keywords?: string[] };

const config: Item[] = [
  { id: "home", label: "Home", icon: HomeIcon, onSelect: () => {} },
];

const { list } = useCommandMenu({ config });
list[0].icon; // ElementType
```

## Grouping

Pass a `groups` array to organize items into sections. Each group references item IDs from your config. Rendering order and keyboard order both follow the groups. Items that appear in no group are not shown and cannot be selected.

```tsx
import { type Config, type Group, isGroupList, useCommandMenu } from "commandmenu";

const config = [
  { id: "home", label: "Home", onSelect: () => {} },
  { id: "about", label: "About", onSelect: () => {} },
  { id: "new-file", label: "New File", shortcut: "N", onSelect: () => {} },
  { id: "settings", label: "Settings", onSelect: () => {} },
] as const satisfies readonly Config[];

// `Group<typeof config>` restricts `items` to the ids above.
const groups: Group<typeof config>[] = [
  { id: "nav", label: "Navigation", items: ["home", "about"] },
  { id: "actions", label: "Actions", items: ["new-file", "settings"] },
];

const CommandMenu = () => {
  const { menuProps, searchProps, listProps, list, selectedId } = useCommandMenu({
    config,
    groups,
  });

  return (
    <div {...menuProps}>
      <input {...searchProps} placeholder="Search..." />
      <ul {...listProps}>
        {list.map((group) => (
          <li key={group.id} role="presentation">
            <div aria-hidden="true">{group.label}</div>
            <ul role="group" aria-label={group.label}>
              {group.items.map((item) => (
                <li key={item.id} {...item.itemProps} aria-selected={item.id === selectedId}>
                  {item.label}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
};
```

When `groups` is always present, `list` is typed as `PreparedGroup[]`. When it may be `undefined`, `list` is a union and `isGroupList(list)` narrows it.

The `group` role sits on the inner `<ul>`, because a `<li>` can't take it. The visible label is hidden from assistive tech, since the group's `aria-label` already announces it.

The hook scrolls the highlighted option into view after keyboard moves and after the query resets, never on hover. It scrolls only the nearest scrollable ancestor of the option, never the page. A group label above the first option can end up hidden. The scroll honours `scroll-margin` and `scroll-padding`, so give the first option of each group a `scroll-margin-top` equal to the label height, or set `scroll-padding` on the scroll container.

## Minimal re-renders

`list` and every item in it keep their identity for as long as the item is on the menu: while you navigate with the keyboard or the pointer, while the query narrows or widens, and while async results come and go. Only `selectedId` and `searchProps` change when the highlight moves; `menuProps` and `listProps` never do. Wrap your row in `memo` and pass it a boolean. Moving the highlight then re-renders only the two rows it leaves and lands on. Typing re-renders no surviving row at all, only the ones that come back into the list.

```tsx
const Row = memo(({ item, isSelected }: { item: PreparedItem; isSelected: boolean }) => (
  <li {...item.itemProps} aria-selected={isSelected} data-selected={isSelected || undefined}>
    {item.label}
  </li>
));

list.map((item) => <Row key={item.id} item={item} isSelected={item.id === selectedId} />);
```

Some interactions don't render at all:

- hovering the item that's already highlighted
- pressing an arrow key at the end of the list
- selecting an item while the menu is already reset

Groups whose rows didn't change also keep their identity, so a memoized group component skips re-rendering when async results arrive.

Keep `config`, `groups` and `asyncResultsGroup.items` referentially stable (module scope, `useMemo`, state) so the hook can skip work on unrelated renders. Treat items as immutable: the hook prepares each item object once, so to change an item (say, to disable it), pass a new object. Callbacks (`onKeyDown`, `onKeyUp`, `onSearchChange`) can be inline: the hook always calls the latest one without rebuilding anything.

With thousands of items, what's left is the DOM work of mounting and unmounting rows as the query changes. Virtualize the list if that matters to you.

## Nested menus

The hook doesn't impose a nesting model. Swap `config` (and optionally `groups`) when an item is selected. Use Backspace on an empty search to go back. Your `onKeyDown` runs before the built-in handling, so calling `preventDefault()` in it suppresses navigation and shortcuts for that key.

```tsx
import { type Config, useCommandMenu } from "commandmenu";
import { useCallback, useMemo, useState } from "react";

type MenuLevel = { label: string; config: Config[] };

const CommandMenu = () => {
  const [menuStack, setMenuStack] = useState<MenuLevel[]>([]);

  const openSubmenu = useCallback((level: MenuLevel) => {
    setMenuStack((s) => [...s, level]);
  }, []);

  const goBack = useCallback(() => {
    setMenuStack((s) => s.slice(0, -1));
  }, []);

  const rootConfig = useMemo(
    (): Config[] => [
      { id: "home", label: "Home", onSelect: () => console.log("home") },
      {
        id: "settings",
        label: "Settings",
        onSelect: () =>
          openSubmenu({
            label: "Settings",
            config: [
              { id: "theme", label: "Theme", onSelect: () => console.log("theme") },
              { id: "language", label: "Language", onSelect: () => console.log("language") },
            ],
          }),
      },
    ],
    [openSubmenu],
  );

  const currentLevel = menuStack[menuStack.length - 1];
  const activeConfig = currentLevel?.config ?? rootConfig;

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === "Backspace" && (e.target as HTMLInputElement).value === "" && menuStack.length > 0) {
        e.preventDefault();
        goBack();
      }
    },
    [menuStack.length, goBack],
  );

  const { menuProps, searchProps, listProps, list, selectedId } = useCommandMenu({
    config: activeConfig,
    onKeyDown,
  });

  return (
    <div {...menuProps}>
      <input {...searchProps} placeholder="Search..." />
      <ul {...listProps}>
        {list.map((item) => (
          <li key={item.id} {...item.itemProps} aria-selected={item.id === selectedId}>
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
};
```

## Async results

Pass `asyncResultsGroup` to merge remotely fetched items. Use `onSearchChange` to trigger the fetch; it is also called with `""` when the query is reset after a selection. With `groups`, async items render as a trailing group. Without `groups`, they are appended to the flat list.

Async items get their own type parameter, so results with ids outside an `as const` config are accepted, and `list` is typed as a union of both. The highlight follows its item by `id` when results arrive, so new results above it don't move it to a different item. A result whose `id` is already on the menu is dropped. Loading state stays yours: the hook doesn't need it, so render your own spinner from it.

```tsx
const [results, setResults] = useState<Config[]>([]);
const [isLoading, setIsLoading] = useState(false);

const { list } = useCommandMenu({
  config,
  groups,
  asyncResultsGroup: { id: "remote", label: "Results", items: results },
  onSearchChange: (query) => {
    /* debounce, fetch, then setResults / setIsLoading */
  },
});
```

## API

### `useCommandMenu(args)`

#### Arguments

| Prop | Type | Description |
|------|------|-------------|
| `config` | `readonly T[]` | Menu items (required). `T extends Config` |
| `groups` | `readonly Group<T>[]` | Optional grouping of items by ID |
| `asyncResultsGroup` | `AsyncResultsGroup<A>` | Optional async-loaded items. `A extends Config`, defaults to `T` |
| `onKeyDown` | `KeyboardEventHandler` | Runs before built-in handling. `preventDefault()` to suppress it |
| `onKeyUp` | `KeyboardEventHandler` | Called from `menuProps.onKeyUp` |
| `onSearchChange` | `(query: string) => void` | Called when the query changes, including reset to `""` |

#### Return value

| Prop | Type | Description |
|------|------|-------------|
| `list` | `PreparedItem<T \| A>[] \| PreparedGroup<T \| A>[]` | Items to render (flat or grouped) |
| `selectedId` | `string \| undefined` | Highlighted item id, `undefined` when nothing is selectable |
| `menuProps` | `{ onKeyDown, onKeyUp }` | Spread on the wrapper around input and list |
| `searchProps` | `{ value, onChange, role, aria-* , autoComplete }` | Spread on the search input |
| `listProps` | `{ id, role: "listbox", ref }` | Spread on the list element |
| `searchQuery` | `string` | Current search query |

### `isGroupList(list)`

Type guard that returns `true` when the list contains `PreparedGroup[]`.

### Types

```typescript
type Config = {
  id: string;
  label: string;
  shortcut?: string;
  description?: string;
  icon?: ElementType;
  disabled?: boolean;
  onSelect: () => void;
};

// Accepts an item type or a config array type.
type Group<T extends Config | readonly Config[] = Config> = {
  id: string;
  label: string;
  items: readonly Id[]; // Id = T["id"] or T[number]["id"]
};

type AsyncResultsGroup<T extends Config = Config> = {
  id: string;
  label: string;
  items: readonly T[];
};

type ItemProps = {
  id: string;
  role: "option";
  "aria-disabled": true | undefined;
  onClick: (() => void) | undefined;
  onMouseDown: MouseEventHandler<HTMLElement>; // keeps focus in the input
  onPointerMove: (() => void) | undefined;
};

// Distributes over unions: each variant keeps its own fields, minus `onSelect`,
// and the optional `Config` fields stay readable on every item.
type PreparedItem<T extends Config = Config> = T extends unknown
  ? Omit<T, "onSelect"> & Omit<Config, "onSelect" | keyof T> & { itemProps: ItemProps }
  : never;

type PreparedGroup<T extends Config = Config> = {
  id: string;
  label: string;
  items: PreparedItem<T>[];
};
```

## License

[MIT](./LICENSE)
