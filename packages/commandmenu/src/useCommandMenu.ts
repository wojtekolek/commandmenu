import { useId, useLayoutEffect, useMemo, useState } from "react";
import { createController, optionId } from "./controller";
import { buildShortcuts } from "./keyboard";
import { buildEntries, dropKnownIds, EMPTY, layoutList } from "./list";
import { INITIAL_SELECTION, locate } from "./selection";
import type {
  Config,
  GroupOf,
  PreparedGroup,
  PreparedItem,
  SearchProps,
  UseCommandMenuArgs,
  UseCommandMenuReturn,
} from "./types";

export const isGroupList = <T extends Config>(
  list: readonly (PreparedGroup<T> | PreparedItem<T>)[],
): list is PreparedGroup<T>[] => list.length > 0 && !("itemProps" in list[0]);

export function useCommandMenu<T extends Config, A extends Config = T>(
  args: UseCommandMenuArgs<T, A> & { groups: readonly GroupOf<NoInfer<T>["id"]>[] },
): UseCommandMenuReturn<PreparedGroup<T | A>[]>;

export function useCommandMenu<T extends Config, A extends Config = T>(
  args: UseCommandMenuArgs<T, A> & { groups?: undefined },
): UseCommandMenuReturn<PreparedItem<T | A>[]>;

// `groups` that may be undefined (say, an optional prop) get the union; `isGroupList` narrows it.
export function useCommandMenu<T extends Config, A extends Config = T>(
  args: UseCommandMenuArgs<T, A>,
): UseCommandMenuReturn<PreparedGroup<T | A>[] | PreparedItem<T | A>[]>;

export function useCommandMenu<T extends Config, A extends Config = T>({
  config,
  groups,
  asyncResultsGroup,
  onKeyDown,
  onKeyUp,
  onSearchChange,
}: UseCommandMenuArgs<T, A>): UseCommandMenuReturn<PreparedGroup<T | A>[] | PreparedItem<T | A>[]> {
  const baseId = useId();
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState(INITIAL_SELECTION);
  // Handlers, stable props and item caches, built once. They read `latest`, written below.
  const [controller] = useState(() => createController<T | A>(baseId, setQuery, setSelection));
  const { listId, latest } = controller;

  // What's on the menu. `entries` and `shortcuts` depend only on `config` and `groups`, so
  // typing never rebuilds them.

  const { entries, ids } = useMemo(() => buildEntries(config, groups), [config, groups]);
  const shortcuts = useMemo(() => buildShortcuts(entries.map((e) => e.item)), [entries]);

  const results = asyncResultsGroup?.items;
  const resultsId = asyncResultsGroup?.id;
  const resultsLabel = asyncResultsGroup?.label;
  // Returns the shared `EMPTY` for no results, so `items: data ?? []` doesn't rebuild the list.
  const asyncItems = useMemo(() => dropKnownIds(results ?? EMPTY, ids), [results, ids]);

  const { flat, spans } = useMemo(
    () =>
      layoutList({
        entries,
        query,
        grouped: !!groups,
        results: asyncItems,
        resultsId,
        resultsLabel,
      }),
    [entries, query, groups, asyncItems, resultsId, resultsLabel],
  );
  const list = useMemo(() => controller.render(flat, spans), [controller, flat, spans]);

  // Selection

  const selectedItem = flat[locate(flat, selection)];
  const selectedDomId = selectedItem && optionId(baseId, selectedItem.id);

  // A layout effect, so `latest` is current before any event can reach the new DOM.
  useLayoutEffect(() => {
    Object.assign(latest, { flat, query, shortcuts, onKeyDown, onKeyUp, onSearchChange });
  });

  useLayoutEffect(() => {
    if (selection.reveal && selectedDomId) controller.reveal(selectedDomId);
  }, [controller, selection, selectedDomId]);

  const searchProps = useMemo(
    (): SearchProps => ({
      value: query,
      onChange: controller.handleSearch,
      role: "combobox",
      "aria-expanded": true,
      "aria-controls": listId,
      "aria-activedescendant": selectedDomId,
      "aria-autocomplete": "list",
      autoComplete: "off",
    }),
    [controller, query, listId, selectedDomId],
  );

  return {
    list,
    selectedId: selectedItem?.id,
    menuProps: controller.menuProps,
    searchProps,
    listProps: controller.listProps,
    searchQuery: query,
  };
}
