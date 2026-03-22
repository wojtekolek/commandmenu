# CommandMenu

A headless React hook for building command menus. It handles search, keyboard navigation, shortcuts, and selection — you bring your own UI.

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
] as const satisfies Config[];

const CommandMenu = () => {
  const { menuProps, searchProps, list, selection } = useCommandMenu({ config });

  return (
    <div {...menuProps}>
      <input {...searchProps} placeholder="Search..." />
      <ul>
        {list.map((item) => {
          const isSelected = item.id === selection.id;
          return (
            <li
              key={item.id}
              ref={isSelected ? selection.ref : null}
              onClick={item.onClick}
              onPointerMove={item.onPointerMove}
              style={{ background: isSelected ? "#f0f0f0" : undefined }}
            >
              {item.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

## Grouping

Pass a `groups` array to organize items into sections. Each group references item IDs from your config.

```tsx
import { type Config, type Group, isGroupList, useCommandMenu } from "commandmenu";

const config = [
  { id: "home", label: "Home", onSelect: () => {} },
  { id: "about", label: "About", onSelect: () => {} },
  { id: "new-file", label: "New File", shortcut: "N", onSelect: () => {} },
  { id: "settings", label: "Settings", onSelect: () => {} },
] as const satisfies Config[];

type MyConfig = typeof config;

const groups: Group<MyConfig>[] = [
  { id: "nav", label: "Navigation", items: ["home", "about"] },
  { id: "actions", label: "Actions", items: ["new-file", "settings"] },
];

const CommandMenu = () => {
  const { menuProps, searchProps, list, selection } = useCommandMenu({
    config,
    groups,
  });

  return (
    <div {...menuProps}>
      <input {...searchProps} placeholder="Search..." />
      <ul>
        {isGroupList(list) &&
          list.map((group) => (
            <li key={group.id}>
              <div>{group.label}</div>
              <ul>
                {group.items.map((item) => {
                  const isSelected = item.id === selection.id;
                  return (
                    <li
                      key={item.id}
                      ref={isSelected ? selection.ref : null}
                      onClick={item.onClick}
                      onPointerMove={item.onPointerMove}
                    >
                      {item.label}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
      </ul>
    </div>
  );
}
```

## Nested menus

The hook doesn't impose a nesting model — you control it by swapping the `config` (and optionally `groups`) when an item is selected. Use Backspace on an empty search to go back.

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

  const { menuProps, searchProps, list, selection } = useCommandMenu({
    config: activeConfig,
    onKeyDown: (e) => {
      if (e.key === "Backspace" && (e.target as HTMLInputElement).value === "" && menuStack.length > 0) {
        e.preventDefault();
        goBack();
      }
    },
  });

  return (
    <div {...menuProps}>
      <input {...searchProps} placeholder="Search..." />
      <ul>
        {list.map((item) => (
          <li key={item.id} onClick={item.onClick} onPointerMove={item.onPointerMove}>
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## API

### `useCommandMenu(args)`

#### Arguments

| Prop | Type | Description |
|------|------|-------------|
| `config` | `Config[]` | Menu items (required) |
| `groups` | `Group[]` | Optional grouping of items by ID |
| `asyncResultsGroup` | `AsyncResultsGroup` | Optional async-loaded items |
| `onKeyDown` | `KeyboardEventHandler` | Custom keydown handler |
| `onKeyUp` | `KeyboardEventHandler` | Custom keyup handler |
| `onSearchChange` | `(query: string) => void` | Called when search query changes |

#### Return value

| Prop | Type | Description |
|------|------|-------------|
| `list` | `PreparedItem[] \| PreparedGroup[]` | Items to render (flat or grouped) |
| `selection` | `Selection` | Current selection (`id` and `ref`) |
| `menuProps` | `{ onKeyDown, onKeyUp }` | Spread on the menu container |
| `searchProps` | `{ value, onChange }` | Spread on the search input |
| `searchQuery` | `string` | Current search query |
| `isAsyncLoading` | `boolean` | Whether async results are loading |

### `isGroupList(list)`

Type guard that returns `true` when the list contains `PreparedGroup[]` (i.e., groups were provided).

### Types

```typescript
type Config = {
  id: string;
  label: string;
  icon?: ElementType;
  shortcut?: string;
  description?: string;
  disabled?: boolean;
  onSelect: () => void;
};

type Group<T extends Config[]> = {
  id: string;
  label: string;
  items: T[number]["id"][];
};

type Selection = {
  id: string | undefined;
  ref: RefObject<HTMLLIElement | null>;
};

type PreparedItem = {
  id: string;
  label: string;
  icon?: ElementType;
  shortcut?: string;
  description?: string;
  onClick: (() => void) | undefined;
  onPointerMove: () => void;
};

type PreparedGroup = {
  id: string;
  label: string;
  items: PreparedItem[];
};
```

## License

MIT
