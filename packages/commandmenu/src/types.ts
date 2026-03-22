import type { ElementType, RefObject } from "react";

export type Config = {
  id: string;
  icon?: ElementType;
  label: string;
  shortcut?: string;
  description?: string;
  disabled?: boolean;
  onSelect: () => void;
};

export type Group<TConfig extends Config[]> = {
  id: string;
  label: string;
  items: TConfig[number]["id"][];
};

export type AsyncResultsGroup = {
  id: string;
  label: string;
  items: Config[];
  isLoading: boolean;
};

export type PreparedItem = {
  isSelected: boolean;
  ref: RefObject<HTMLLIElement | null> | null;
  id: string;
  label: string;
  shortcut?: string;
  icon?: ElementType;
  description?: string;
  onClick: (() => void) | undefined;
  onPointerMove: () => void;
};

export type PreparedGroup = {
  id: string;
  label: string;
  items: PreparedItem[];
};
