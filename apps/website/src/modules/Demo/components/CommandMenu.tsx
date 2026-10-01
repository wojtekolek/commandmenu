import type { PreparedItem } from "commandmenu";
import { isGroupList, useCommandMenu } from "commandmenu";
import { motion } from "framer-motion";
import {
  type FunctionComponent,
  type KeyboardEvent,
  memo,
  type ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react";
import { ChevronRightIcon, CornerDownLeftIcon, SearchIcon } from "../../../components/icons";
import { cn } from "../../../utils/styles";
import {
  createRootConfig,
  type MenuItem,
  type MenuLevel,
  ROOT_GROUPS,
  SUBMENU_IDS,
} from "./menuConfig";
import { showToast } from "./Toaster";

const Kbd: FunctionComponent<{ children: ReactNode }> = ({ children }) => (
  <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-primary-200 bg-primary-50 px-1 font-default text-[10px] text-primary-600 shadow-[0_1px_0_rgb(41_41_41/0.06)]">
    {children}
  </kbd>
);

type ItemProps = { item: PreparedItem<MenuItem>; isSelected: boolean };

// Memoized: `item` keeps its identity across arrow navigation, so only the two
// rows whose `isSelected` flips actually re-render. The highlight is one shared
// layout element, after the menu on wojtekolek.com: it glides from the row it
// leaves to the row it lands on rather than each row lighting up on its own.
const Item = memo(({ item, isSelected }: ItemProps) => {
  const { icon: ItemIcon, id, label, description, shortcut, itemProps } = item;

  return (
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: `role="option"` comes from itemProps
    <li
      {...itemProps}
      aria-selected={isSelected}
      className={cn(
        "relative flex cursor-pointer items-center justify-between gap-4 rounded-xl px-3 py-2.5 text-sm transition-colors duration-200",
        // Keep the group label visible when the first item of a group scrolls into view.
        "first:scroll-mt-9",
        isSelected ? "text-primary-950" : "text-primary-700",
      )}
    >
      {isSelected && (
        <motion.span
          layoutId="command-highlight"
          aria-hidden="true"
          className="absolute inset-0 rounded-xl bg-primary-950/5 shadow-[inset_0_0_0_1px_rgb(41_41_41/0.04)]"
          transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
        />
      )}

      <div className="relative flex min-w-0 items-center gap-3">
        <ItemIcon
          className={cn(
            "size-4 shrink-0 transition-colors duration-200",
            isSelected ? "text-primary-900" : "text-primary-400",
          )}
        />
        <span className="truncate">{label}</span>
        <span className="hidden truncate text-primary-600 text-xs sm:inline">{description}</span>
      </div>

      <div className="relative flex shrink-0 items-center gap-1">
        {!!shortcut && (
          <>
            <Kbd>⌘</Kbd>
            {shortcut.split(" ").map((key) => (
              <Kbd key={key}>{key}</Kbd>
            ))}
          </>
        )}
        {SUBMENU_IDS.has(id) && <ChevronRightIcon className="ml-1 size-3.5 text-primary-400" />}
      </div>
    </li>
  );
});

const leaf = (label: string) => () => showToast(label);

// Static pieces, hoisted: React skips an element it has already rendered, so these never
// re-render with the menu.
const searchIcon = <SearchIcon className="size-4 shrink-0 text-primary-400" />;

const emptyState = (
  <li
    role="presentation"
    className="flex h-full flex-col items-center justify-center gap-1 text-primary-600"
  >
    <SearchIcon className="mb-2 size-7 text-primary-300" strokeWidth={1.5} />
    <span className="font-medium text-primary-700 text-sm">No results</span>
    <span className="text-xs">Try a different search term</span>
  </li>
);

const Breadcrumbs = memo(({ stack }: { stack: MenuLevel[] }) =>
  stack.map(({ label }) => (
    <span
      key={label}
      className="flex shrink-0 items-center gap-1 rounded-full bg-primary-950/5 py-1 pr-1.5 pl-2.5 font-medium text-[11px] text-primary-600"
    >
      {label}
      <ChevronRightIcon className="size-3" />
    </span>
  )),
);

// Only changes when the menu goes in or out of a submenu.
const HintBar = memo(({ isNested }: { isNested: boolean }) => (
  <div
    aria-hidden="true"
    className="hidden items-center justify-between gap-4 border-primary-100 border-t bg-primary-50/60 px-4 py-2.5 text-[11px] text-primary-600 sm:flex"
  >
    <div className="flex items-center gap-4">
      <span className="flex items-center gap-1.5">
        <Kbd>↑</Kbd>
        <Kbd>↓</Kbd>
        Navigate
      </span>
      <span className="flex items-center gap-1.5">
        <Kbd>
          <CornerDownLeftIcon className="size-3" />
        </Kbd>
        Select
      </span>
    </div>
    {isNested ? (
      <span className="flex items-center gap-1.5">
        <Kbd>Esc</Kbd>
        Back
      </span>
    ) : (
      <span className="flex items-center gap-1.5">
        <Kbd>⌘</Kbd>
        <Kbd>⇧</Kbd>
        <Kbd>S</Kbd>
        Settings
      </span>
    )}
  </div>
));

export const CommandMenu: FunctionComponent = () => {
  const [menuStack, setMenuStack] = useState<MenuLevel[]>([]);

  const openSubmenu = useCallback((level: MenuLevel) => {
    setMenuStack((s) => [...s, level]);
  }, []);

  const goBack = useCallback(() => {
    setMenuStack((s) => s.slice(0, -1));
  }, []);

  const rootConfig = useMemo(() => createRootConfig(leaf, openSubmenu), [openSubmenu]);

  const currentLevel = menuStack[menuStack.length - 1];
  const activeConfig = currentLevel?.config ?? rootConfig;
  const activeGroups = currentLevel ? currentLevel.groups : ROOT_GROUPS;
  const isNested = menuStack.length > 0;

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (!isNested) return;
      const isEmptyBackspace = e.key === "Backspace" && (e.target as HTMLInputElement).value === "";
      if (e.key === "Escape" || isEmptyBackspace) {
        e.preventDefault();
        goBack();
      }
    },
    [isNested, goBack],
  );

  const { menuProps, searchProps, listProps, list, selectedId } = useCommandMenu({
    config: activeConfig,
    groups: activeGroups,
    onKeyDown,
  });

  const renderItem = (item: PreparedItem<MenuItem>) => (
    <Item key={item.id} item={item} isSelected={item.id === selectedId} />
  );

  return (
    <div
      {...menuProps}
      className="flex h-[26rem] w-full flex-col overflow-hidden rounded-[20px] border border-primary-200 bg-primary-0 shadow-[0_1px_2px_rgb(41_41_41/0.06)]"
    >
      <div className="flex items-center gap-3 border-primary-100 border-b px-5 py-4">
        {searchIcon}
        <Breadcrumbs stack={menuStack} />

        <input
          {...searchProps}
          type="text"
          aria-label="Search commands"
          placeholder={
            isNested ? `Search ${currentLevel.label.toLowerCase()}…` : "Type a command or search…"
          }
          className="w-full min-w-0 bg-transparent text-[15px] text-primary-950 outline-none placeholder:text-primary-400"
        />
      </div>

      <motion.ul
        {...listProps}
        layoutScroll
        className="m-0 min-h-0 flex-1 scroll-p-2 list-none overflow-y-auto overscroll-contain p-2"
      >
        {list.length === 0 && emptyState}
        {isGroupList(list)
          ? list.map(({ id, label, items }) => (
              // The `group` role goes on the inner list (an <li> can't take it); its
              // aria-label announces the section, so the visible label is hidden.
              <li key={id} role="presentation">
                <div
                  aria-hidden="true"
                  className="px-3 pt-3 pb-1.5 text-[11px] text-primary-600 uppercase tracking-[0.2em]"
                >
                  {label}
                </div>
                {/* biome-ignore lint/a11y/useSemanticElements: a <fieldset> can't sit inside a listbox */}
                <ul role="group" aria-label={label} className="m-0 list-none p-0">
                  {items.map(renderItem)}
                </ul>
              </li>
            ))
          : list.map(renderItem)}
      </motion.ul>

      <HintBar isNested={isNested} />
    </div>
  );
};
