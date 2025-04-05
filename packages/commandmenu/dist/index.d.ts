import { ElementType, KeyboardEventHandler, ChangeEventHandler, RefObject, PointerEvent, ReactNode, MouseEvent } from 'react';

type Config = {
    id: string;
    icon?: ElementType;
    label: string;
    shortcut?: string;
    description?: string;
    disabled?: boolean;
    onSelect: () => void;
};
type Group<TConfig extends Config[]> = {
    id: string;
    label: string;
    items: TConfig[number]["id"][];
};
type PreparedItem = {
    isSelected: boolean;
    ref: RefObject<HTMLLIElement | null> | null;
    id: string;
    label: string;
    shortcut?: string;
    icon?: ElementType;
    description: string | undefined;
    onClick: (() => void) | undefined;
    onPointerMove: (event: PointerEvent<HTMLLIElement>) => void;
};
type PreparedGroup = {
    id: string;
    label: string;
    items: PreparedItem[];
};
type UseCommandMenuReturn = {
    menuProps: {
        onKeyDown: KeyboardEventHandler<HTMLDivElement>;
    };
    searchProps: {
        value: string;
        onChange: ChangeEventHandler<HTMLInputElement>;
    };
};
type CommonArguments<TConfig extends Config[]> = {
    config: TConfig;
    onKeyDown?: KeyboardEventHandler<HTMLElement>;
};
declare function useCommandMenu<TConfig extends Config[]>(args: {
    groups: Group<TConfig>[];
} & CommonArguments<TConfig>): UseCommandMenuReturn & {
    list: PreparedGroup[];
};
declare function useCommandMenu<TConfig extends Config[]>(args: CommonArguments<TConfig>): UseCommandMenuReturn & {
    list: PreparedItem[];
};

type ItemCommonConfigData = {
    id: string;
    icon?: ReactNode;
    label: string;
    description?: string;
};
type ItemConfigData = ItemCommonConfigData & {
    placeholder?: never;
    items?: never;
    onSelect: (event: MouseEvent<HTMLLIElement>) => void;
};
type ItemWithNestedListConfigData = ItemCommonConfigData & {
    onSelect?: never;
    placeholder: string;
    items: Array<ItemWithNestedListConfigData | ItemConfigData>;
};
type ItemsGroupConfigData = {
    id: string;
    label: string;
    groupItems: Array<ItemConfigData | ItemWithNestedListConfigData>;
};
type ConfigData = ItemsGroupConfigData[] | ItemConfigData[] | ItemWithNestedListConfigData[];
type ListItemData = {
    id: string;
    label: string;
    icon?: ReactNode;
    description?: string;
    onPointerMove: () => void;
    onClick: (event: MouseEvent<HTMLLIElement>) => void;
    items?: ListItemData[];
    isGroup?: never;
    groupItems?: never;
};
type ListGroupData = {
    id: string;
    label: string;
    isGroup: boolean;
    groupItems: ListItemData[];
    items?: never;
    icon?: never;
    description?: never;
};

declare const isGroupItem: (itemToCheck: ListGroupData | ListItemData) => itemToCheck is ListGroupData;

export { type ConfigData, type ItemConfigData, type ItemsGroupConfigData, type ListItemData, isGroupItem, useCommandMenu };
