import type { PreparedItem, Selection } from "commandmenu";
import { isGroupList, useCommandMenu } from "commandmenu";
import { type FunctionComponent, type KeyboardEvent, useCallback, useMemo, useState } from "react";
import { cn } from "../../../utils/styles";
import { ChevronRightIcon, SearchIcon } from "./icons";
import { createRootConfig, type MenuLevel, ROOT_GROUPS, SUBMENU_IDS } from "./menuConfig";
import { useToast } from "./useToast";

const renderItem = (item: PreparedItem, selection: Selection) => {
  const { icon: ItemIcon, ...rest } = item;
  const isSelected = rest.id === selection.id;

  return (
    <li
      ref={isSelected ? selection.ref : null}
      key={rest.id}
      className={cn(
        "flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 text-sm transition-colors",
        isSelected ? "bg-primary-100 text-primary-900" : "text-primary-700 hover:bg-primary-50",
      )}
      onClick={rest.onClick}
      onPointerMove={rest.onPointerMove}
    >
      <div className="flex items-center gap-3">
        {!!ItemIcon && (
          <ItemIcon
            className={cn("size-4 shrink-0", isSelected ? "text-primary-600" : "text-primary-400")}
          />
        )}
        <span>{rest.label}</span>
        {!!rest.description && <span className="text-primary-400 text-xs">{rest.description}</span>}
      </div>
      <div className="flex items-center gap-2">
        {!!rest.shortcut && (
          <kbd className="flex shrink-0 items-center gap-0.5 rounded border border-primary-200 bg-primary-50 px-1.5 py-0.5 font-mono text-[10px] text-primary-400">
            {rest.shortcut}
          </kbd>
        )}
        {SUBMENU_IDS.has(rest.id) && <ChevronRightIcon className="size-3.5 text-primary-400" />}
      </div>
    </li>
  );
};

export const CommandMenu: FunctionComponent = () => {
  const [menuStack, setMenuStack] = useState<MenuLevel[]>([]);
  const { toast, show: showToast } = useToast();

  const leaf = useCallback((label: string) => () => showToast(label), [showToast]);

  const openSubmenu = useCallback((level: MenuLevel) => {
    setMenuStack((s) => [...s, level]);
  }, []);

  const goBack = useCallback(() => {
    setMenuStack((s) => s.slice(0, -1));
  }, []);

  const rootConfig = useMemo(() => createRootConfig(leaf, openSubmenu), [leaf, openSubmenu]);

  const currentLevel = menuStack[menuStack.length - 1];
  const activeConfig = currentLevel?.config ?? rootConfig;
  const activeGroups = currentLevel ? currentLevel.groups : ROOT_GROUPS;

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (
        e.key === "Backspace" &&
        (e.target as HTMLInputElement).value === "" &&
        menuStack.length > 0
      ) {
        e.preventDefault();
        goBack();
      }
    },
    [menuStack.length, goBack],
  );

  const hookArgs = activeGroups
    ? { config: activeConfig, groups: activeGroups, onKeyDown }
    : { config: activeConfig, onKeyDown };

  const { menuProps, searchProps, list, selection } = useCommandMenu(hookArgs);

  const breadcrumbs = menuStack.map((level) => level.label);

  return (
    <>
      <div
        {...menuProps}
        className="mx-auto flex max-h-110 min-h-[240px] w-full max-w-[640px] flex-col overflow-hidden rounded-xl border border-primary-200 bg-white shadow-lg"
      >
        <div className="relative flex w-full items-center border-primary-200 border-b bg-primary-50/50 px-4 py-3">
          {breadcrumbs.length > 0 && (
            <div className="mr-2 flex shrink-0 items-center gap-1">
              {breadcrumbs.map((crumb) => (
                <span
                  key={crumb}
                  className="flex items-center gap-1 rounded bg-primary-100 px-1.5 py-0.5 text-[11px] text-primary-500"
                >
                  {crumb}
                  <ChevronRightIcon className="size-3" />
                </span>
              ))}
            </div>
          )}

          <SearchIcon className="mr-3 size-4 shrink-0 text-primary-400" />

          <input
            {...searchProps}
            type="text"
            placeholder="Type a command or search..."
            className="w-full bg-transparent text-primary-900 text-sm outline-none placeholder:text-primary-400"
          />

          <kbd className="ml-2 flex shrink-0 items-center justify-center rounded border border-primary-200 bg-primary-100 px-1.5 py-0.5 font-mono text-[10px] text-primary-500">
            Esc
          </kbd>
        </div>

        <ul className="m-0 scroll-p-2 list-none overflow-y-auto overscroll-contain p-2">
          {list.length === 0 && (
            <li className="flex flex-col items-center justify-center gap-1 py-10 text-primary-400">
              <SearchIcon className="mb-1 size-8 text-primary-300" strokeWidth={1.5} />
              <span className="font-medium text-sm">No results found</span>
              <span className="text-xs">Try a different search term</span>
            </li>
          )}
          {isGroupList(list)
            ? list.map(({ id, label, items }) => (
                <li key={id}>
                  <div className="px-2 pt-2 pb-1 font-medium text-[11px] text-primary-400 uppercase tracking-wider">
                    {label}
                  </div>
                  <ul className="m-0 list-none p-0">
                    {items.map((item) => renderItem(item, selection))}
                  </ul>
                </li>
              ))
            : list.map((item) => renderItem(item, selection))}
        </ul>
      </div>

      {toast && (
        <div className="fixed right-4 bottom-4 left-4 z-50 mx-auto max-w-sm animate-toast-in rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 text-primary-800 text-sm shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
};
