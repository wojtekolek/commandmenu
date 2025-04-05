// src/useCommandMenu.ts
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
var DOWN_KEY = "ArrowDown";
var UP_KEY = "ArrowUp";
var ENTER_KEY = "Enter";
var getFirstOption = (config) => config.at(0);
var getNewItem = (config, directionType, currentItem) => {
  const index = currentItem?.index ?? 0;
  const maxIndex = config.length - 1;
  const newIndex = directionType === UP_KEY ? index - 1 : index + 1;
  const isNewIndexValid = directionType === UP_KEY ? newIndex >= 0 : newIndex <= maxIndex;
  if (!isNewIndexValid) return currentItem;
  const newItem = config.at(newIndex);
  return newItem ?? currentItem;
};
var getUniqueId = (id) => `${id}_${crypto.randomUUID()}`;
var getList = (config) => config.map((itemData, index) => ({ ...itemData, index }));
var getKeyForShortcuts = ({ shiftKey, code }) => {
  const key = code.replace("Key", "");
  let value = "";
  if (shiftKey) {
    value = value.concat("\u21E7").concat(" ");
  }
  return value.concat(key);
};
var getShortcuts = (items) => {
  const itemsWithShortcut = items.filter(({ shortcut }) => shortcut).map(({ shortcut, onSelect }) => [shortcut, onSelect]);
  return Object.fromEntries(itemsWithShortcut);
};
var getLocalState = ({
  config,
  groups
}) => {
  if (Array.isArray(groups)) {
    const groupsWithIds = groups.map(({ items, ...restData }) => {
      const newItems = items.map((itemId) => {
        const newItem = config.find(({ id }) => itemId === id);
        if (!newItem) return void 0;
        return {
          ...newItem,
          id: getUniqueId(itemId)
        };
      }).filter((item) => item !== void 0);
      return {
        ...restData,
        items: newItems
      };
    });
    const list = groupsWithIds.flatMap(({ items }) => items);
    const preparedList2 = getList(list);
    const shortcuts2 = getShortcuts(preparedList2);
    return {
      initialConfig: config,
      shortcuts: shortcuts2,
      list: preparedList2,
      initialList: preparedList2,
      groups: groupsWithIds.map(({ items, ...itemData }) => ({
        ...itemData,
        items: items.map(({ id }) => id)
      }))
    };
  }
  const preparedList = getList(config);
  const shortcuts = getShortcuts(preparedList);
  return {
    initialConfig: config,
    shortcuts,
    list: preparedList,
    initialList: preparedList,
    groups: void 0
  };
};
function useCommandMenu({
  config,
  groups,
  onKeyDown
}) {
  const state = useRef(getLocalState({ config, groups }));
  const [selectedItem, setSelectedItem] = useState(getFirstOption(state.current.list));
  const [searchQuery, setSearchQuery] = useState("");
  const selectedItemRef = useRef(null);
  const getState = () => state.current;
  const setState = useCallback((newState) => {
    state.current = {
      ...state.current,
      ...newState
    };
  }, []);
  useEffect(() => {
    const currentState = getState();
    if (JSON.stringify(config) !== JSON.stringify(currentState.initialConfig)) {
      const newState = getLocalState({ config, groups });
      setState(newState);
      setSelectedItem(getFirstOption(newState.list));
      setSearchQuery("");
    }
  }, [config, groups]);
  useLayoutEffect(() => {
    const handleScrollSelectedIntoView = () => {
      const item = selectedItemRef.current;
      const isFirstElementInGroup = item?.parentNode?.firstElementChild === item;
      if (isFirstElementInGroup) {
        const groupLabel = item?.parentElement?.previousElementSibling;
        groupLabel?.scrollIntoView({ block: "nearest" });
      } else if (item) {
        item.scrollIntoView({ block: "nearest" });
      }
    };
    if (selectedItem && selectedItemRef.current) {
      handleScrollSelectedIntoView();
    }
  }, [selectedItem]);
  const handleSearch = useCallback(
    (event) => {
      const { value } = event.target;
      const { initialList } = getState();
      const filteredList = initialList.filter(({ label }) => label.toLocaleLowerCase().includes(value.toLocaleLowerCase())).map((itemData, index) => ({ ...itemData, index }));
      setState({
        list: filteredList,
        shortcuts: getShortcuts(filteredList)
      });
      setSelectedItem(getFirstOption(filteredList));
      setSearchQuery(value);
    },
    [setState]
  );
  const handleResetState = useCallback(() => {
    const { initialList } = getState();
    setSearchQuery("");
    setState({ list: initialList, shortcuts: getShortcuts(initialList) });
    setSelectedItem(getFirstOption(initialList));
  }, [setState]);
  const handleSelect = useCallback(
    (onSelect) => () => {
      if (typeof onSelect === "function") {
        onSelect();
      } else {
        selectedItemRef.current?.click();
      }
      handleResetState();
    },
    [handleResetState]
  );
  const handleKeyPress = useCallback(
    (type) => {
      const { list } = getState();
      const nextItem = getNewItem(list, type, selectedItem);
      setSelectedItem(nextItem);
    },
    [selectedItem]
  );
  const handleItemsShortcuts = useCallback(
    (event) => {
      const { shiftKey, ctrlKey, metaKey, code } = event;
      const shortcutsMap = getState().shortcuts;
      if ((metaKey || ctrlKey) && shortcutsMap) {
        const preparedKey = getKeyForShortcuts({ shiftKey, code });
        const selectHandler = shortcutsMap[preparedKey];
        if (typeof selectHandler === "function") {
          event.preventDefault();
          event.stopPropagation();
          const handler = handleSelect(selectHandler);
          handler();
        }
      }
    },
    [handleSelect]
  );
  const handleListKeyDown = useCallback(
    (event) => {
      handleItemsShortcuts(event);
      onKeyDown?.(event);
      if (!event.defaultPrevented) {
        switch (event.key) {
          case DOWN_KEY: {
            event.preventDefault();
            handleKeyPress(DOWN_KEY);
            break;
          }
          case UP_KEY: {
            event.preventDefault();
            handleKeyPress(UP_KEY);
            break;
          }
          case ENTER_KEY: {
            if (!event.nativeEvent.isComposing) {
              event.preventDefault();
              handleSelect()();
            }
          }
        }
      }
    },
    [handleItemsShortcuts, handleKeyPress, handleSelect, onKeyDown]
  );
  const menuProps = useMemo(
    () => ({
      onKeyDown: handleListKeyDown
    }),
    [handleListKeyDown]
  );
  const searchProps = useMemo(
    () => ({
      value: searchQuery,
      onChange: handleSearch
    }),
    [handleSearch, searchQuery]
  );
  const preparedList = getState().list.map((itemData) => {
    const isSelected = itemData.id === selectedItem?.id;
    return {
      isSelected,
      ref: isSelected ? selectedItemRef : null,
      id: itemData.id,
      label: itemData.label,
      icon: itemData.icon,
      shortcut: itemData.shortcut,
      description: itemData.description,
      disabled: itemData.disabled,
      onClick: itemData.disabled ? void 0 : handleSelect(itemData.onSelect),
      onPointerMove: () => setSelectedItem(itemData)
    };
  });
  const preparedGroups = useMemo(() => {
    const groupsData = getState().groups;
    return Array.isArray(groupsData) ? groupsData.map(({ id, items, label }) => ({
      id,
      label,
      items: preparedList.filter(({ id: id2 }) => items.includes(id2))
    })).filter(({ items }) => items.length) : void 0;
  }, [preparedList]);
  return {
    list: preparedGroups ?? preparedList,
    menuProps,
    searchProps
  };
}

// src/utils.ts
var isGroupItem = (itemToCheck) => Array.isArray(itemToCheck.groupItems);
export {
  isGroupItem,
  useCommandMenu
};
//# sourceMappingURL=index.mjs.map