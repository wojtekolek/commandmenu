# commandmenu

## 0.6.0

### Minor Changes

- 4af0944: Rework the hook around a single ordered item list and add ARIA wiring.

  Breaking:

  - Items now expose `itemProps` (`id`, `role`, `aria-disabled`, `onClick`, `onMouseDown`, `onPointerMove`) instead of top-level `onClick`/`onPointerMove`. Spread it onto the item element.
  - `selection` is replaced by `selectedId`. Scrolling needs no ref wiring from you: `listProps` now carries a `ref`, which the hook uses.
  - `Group<T>` now accepts either an item type or a config array type.
  - Without `groups`, async results are appended to the flat list instead of replacing it with a single group.
  - `PreparedItem` keeps `disabled` so you can style it.
  - Arrow keys and Enter are handled only when pressed in the search input (or on the menu element itself). Other controls inside the menu keep their own keys.
  - Cmd/Ctrl and Alt combinations that match no shortcut are left to the browser. For example, Cmd+ArrowDown no longer moves the highlight.
  - Shortcuts match the character the key types first, then the physical key.
  - Item ids must be unique. An id repeated across groups or async results now appears only once, at its first occurrence.
  - `menuProps.onKeyUp` is always a function and calls your latest `onKeyUp`.
  - `isAsyncLoading` is removed, and `AsyncResultsGroup` no longer takes `isLoading`. Both only handed back the value you passed in; keep the loading state in your own component.

  Fixes:

  - Keyboard order now follows the rendered (grouped) order. Items missing from every group are no longer navigable and their shortcuts don't fire.
  - Enter and shortcuts no longer trigger disabled items. Arrow keys skip disabled items. A disabled item no longer hides a later enabled item that has the same shortcut.
  - ArrowUp works right after the list shrinks.
  - The highlight follows its item by id, so async results arriving above it no longer move it to a different item.
  - Pressing an item no longer moves focus out of the search input, so the keyboard keeps working after a click.
  - Scrolling happens after keyboard moves and query resets, never on hover. It scrolls only the nearest scrollable container, never the page, and works inside shadow roots and iframes. It honours `scroll-margin` and `scroll-padding`.
  - IME:
    - Keys pressed during composition are ignored.
    - So is the Enter that commits a composition, which Safari reports only as keyCode 229.
  - Held-down Enter and shortcuts no longer select repeatedly.
  - Shortcuts work with digits, with non-QWERTY and non-Latin layouts, and case-insensitively. Alt combinations don't trigger them.
  - `onSearchChange("")` fires when the query is reset after a selection.
  - Consumer `onKeyDown` runs before shortcut matching, so it can intercept.
  - Inline `onKeyDown`, `onKeyUp` and `onSearchChange` no longer rebuild the list. `menuProps` and `listProps` keep their identity across renders.
  - `list` no longer rebuilds when `asyncResultsGroup` is recreated around the same `items` array, or around a fresh empty one.
  - Option DOM ids can't collide with the listbox id, and stay valid for item ids that contain spaces.
  - `isGroupList` is no longer fooled by items that carry their own `items` field.
  - Types:
    - `PreparedItem` distributes over unions, so discriminated item types keep each variant's fields.
    - `as const` configs keep the optional `Config` fields readable.
    - Async results get their own type parameter, so they work together with an `as const` config and typed `groups`.
  - The published package now includes the README and the LICENSE.

  Performance:

  - Each item is prepared once and keeps its identity while the query changes. Typing no longer re-renders memoized rows that stay in the list; widening the query renders only the rows that come back.
  - Async results arriving render only the new rows. Groups whose rows didn't change keep their identity.
  - Labels are lowercased once per config instead of on every keystroke, and the display order is computed once per `config`/`groups` rather than per keystroke.
  - These interactions no longer render at all:
    - hovering the highlighted item, which before cost an extra render after a change
    - pressing an arrow key at the end of the list
    - selecting while the menu is already reset
  - The first keystroke renders once instead of twice.

  Added:

  - `useCommandMenu<T>` is generic over the item type. Extra fields on items are preserved in `PreparedItem<T>`.
  - `searchProps` carries combobox ARIA attributes, `listProps` carries `role="listbox"`, its `id` and a `ref`.
  - `sideEffects: false` and per-format type entries in `exports`.
