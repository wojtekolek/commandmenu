import { ElementType, RefObject, KeyboardEventHandler, ChangeEventHandler } from 'react';

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
type AsyncResultsGroup = {
    id: string;
    label: string;
    items: Config[];
    isLoading: boolean;
};
type PreparedItem = {
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
type PreparedGroup = {
    id: string;
    label: string;
    items: PreparedItem[];
};

type CommonArgs<T extends Config[]> = {
    config: T;
    asyncResultsGroup?: AsyncResultsGroup;
    onKeyDown?: KeyboardEventHandler<HTMLElement>;
    onKeyUp?: KeyboardEventHandler<HTMLElement>;
    onSearchChange?: (query: string) => void;
};
type UseCommandMenuReturn = {
    list: PreparedGroup[] | PreparedItem[];
    menuProps: {
        onKeyDown: KeyboardEventHandler<HTMLDivElement>;
        onKeyUp: KeyboardEventHandler<HTMLDivElement>;
    };
    searchProps: {
        value: string;
        onChange: ChangeEventHandler<HTMLInputElement>;
    };
    searchQuery: string;
    isAsyncLoading: boolean;
};
declare function useCommandMenu<T extends Config[]>(args: {
    groups: Group<T>[];
} & CommonArgs<T>): UseCommandMenuReturn & {
    list: PreparedGroup[];
};
declare function useCommandMenu<T extends Config[]>(args: CommonArgs<T>): UseCommandMenuReturn & {
    list: PreparedItem[];
};

export { type Config, type Group, useCommandMenu };
