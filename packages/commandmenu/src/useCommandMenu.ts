import {
  type ChangeEventHandler,
  type ElementType,
  type KeyboardEventHandler,
  type PointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"

const DOWN_KEY = "ArrowDown"
const UP_KEY = "ArrowUp"
const ENTER_KEY = "Enter"

export type Config = {
  id: string
  icon?: ElementType
  label: string
  shortcut?: string
  description?: string
  disabled?: boolean
  onSelect: () => void
}

export type Group<TConfig extends Config[]> = {
  id: string
  label: string
  items: TConfig[number]["id"][]
}

type Item = Config & {
  index: number
}

type Direction = typeof UP_KEY | typeof DOWN_KEY

const getFirstOption = (config: Item[]): Item | undefined => config.at(0)

const getNewItem = (config: Item[], directionType: Direction, currentItem?: Item) => {
  const index = currentItem?.index ?? 0
  const maxIndex = config.length - 1

  const newIndex = directionType === UP_KEY ? index - 1 : index + 1
  const isNewIndexValid = directionType === UP_KEY ? newIndex >= 0 : newIndex <= maxIndex
  if (!isNewIndexValid) return currentItem
  const newItem = config.at(newIndex)
  return newItem ?? currentItem
}

const getUniqueId = (id: string) => `${id}_${crypto.randomUUID()}`

const getList = (config: Config[]): Item[] => config.map((itemData, index) => ({ ...itemData, index }))

export type PreparedItem = {
  isSelected: boolean
  ref: RefObject<HTMLLIElement | null> | null
  id: string
  label: string
  shortcut?: string
  icon?: ElementType
  description: string | undefined
  onClick: (() => void) | undefined
  onPointerMove: (event: PointerEvent<HTMLLIElement>) => void
}

export type PreparedGroup = {
  id: string
  label: string
  items: PreparedItem[]
}

export const isGroupList = (config: (PreparedGroup | PreparedItem)[]): config is PreparedGroup[] =>
  (config as PreparedGroup[]).at(0)?.items !== undefined

const getKeyForShortcuts = ({ shiftKey, code }: { code: string; shiftKey: boolean }) => {
  const key = code.replace("Key", "")
  let value = ""
  if (shiftKey) {
    value = value.concat("⇧").concat(" ")
  }

  return value.concat(key)
}

const getShortcuts = (items: Item[]) => {
  const itemsWithShortcut = items
    .filter(({ shortcut }) => shortcut)
    .map(({ shortcut, onSelect }) => [shortcut, onSelect])
  return Object.fromEntries(itemsWithShortcut)
}

const getLocalState = <TConfig extends Config[]>({
  config,
  groups,
}: { config: TConfig; groups?: Group<TConfig>[] }) => {
  if (Array.isArray(groups)) {
    const groupsWithIds = groups.map(({ items, ...restData }) => {
      const newItems = items
        .map((itemId) => {
          const newItem = config.find(({ id }) => itemId === id)!
          if (!newItem) return undefined

          return {
            ...newItem,
            id: getUniqueId(itemId),
          }
        })
        .filter((item) => item !== undefined)

      return {
        ...restData,
        items: newItems,
      }
    })
    const list = groupsWithIds.flatMap(({ items }) => items)
    const preparedList = getList(list)
    const shortcuts = getShortcuts(preparedList)

    return {
      initialConfig: config,
      shortcuts,
      list: preparedList,
      initialList: preparedList,
      groups: groupsWithIds.map(({ items, ...itemData }) => ({
        ...itemData,
        items: items.map(({ id }) => id),
      })),
    }
  }
  const preparedList = getList(config)
  const shortcuts = getShortcuts(preparedList)

  return {
    initialConfig: config,
    shortcuts,
    list: preparedList,
    initialList: preparedList,
    groups: undefined,
  }
}

type UseCommandMenuReturn = {
  menuProps: {
    onKeyDown: KeyboardEventHandler<HTMLDivElement>
  }
  searchProps: {
    value: string
    onChange: ChangeEventHandler<HTMLInputElement>
  }
}

type LocalState<TConfig extends Config[]> = {
  initialConfig: TConfig
  initialList: Item[]
  list: Item[]
  groups?: Group<TConfig>[]
  shortcuts?: Record<string, () => void>
}

type CommonArguments<TConfig extends Config[]> = {
  config: TConfig
  onKeyDown?: KeyboardEventHandler<HTMLElement>
}

export function useCommandMenu<TConfig extends Config[]>(
  args: {
    groups: Group<TConfig>[]
  } & CommonArguments<TConfig>,
): UseCommandMenuReturn & {
  list: PreparedGroup[]
}

export function useCommandMenu<TConfig extends Config[]>(
  args: CommonArguments<TConfig>,
): UseCommandMenuReturn & {
  list: PreparedItem[]
}

export function useCommandMenu<TConfig extends Config[]>({
  config,
  groups,
  onKeyDown,
}: {
  groups?: Group<TConfig>[]
} & CommonArguments<TConfig>): UseCommandMenuReturn & {
  list: (PreparedItem | PreparedGroup)[]
} {
  const state = useRef<LocalState<TConfig>>(getLocalState({ config, groups }))
  const [selectedItem, setSelectedItem] = useState<Item | undefined>(getFirstOption(state.current.list))
  const [searchQuery, setSearchQuery] = useState<string>("")
  const selectedItemRef = useRef<HTMLLIElement>(null)

  const getState = () => state.current
  const setState = useCallback((newState: Partial<LocalState<TConfig>>) => {
    state.current = {
      ...state.current,
      ...newState,
    }
  }, [])

  useEffect(() => {
    const currentState = getState()
    if (JSON.stringify(config) !== JSON.stringify(currentState.initialConfig)) {
      const newState = getLocalState({ config, groups })
      setState(newState)
      setSelectedItem(getFirstOption(newState.list))
      setSearchQuery("")
    }
  }, [config, groups])

  useLayoutEffect(() => {
    const handleScrollSelectedIntoView = () => {
      const item = selectedItemRef.current
      const isFirstElementInGroup = item?.parentNode?.firstElementChild === item

      if (isFirstElementInGroup) {
        const groupLabel = item?.parentElement?.previousElementSibling
        groupLabel?.scrollIntoView({ block: "nearest" })
      } else if (item) {
        item.scrollIntoView({ block: "nearest" })
      }
    }

    if (selectedItem && selectedItemRef.current) {
      handleScrollSelectedIntoView()
    }
  }, [selectedItem])

  const handleSearch: ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      const { value } = event.target
      const { initialList } = getState()
      const filteredList = initialList
        .filter(({ label }) => label.toLocaleLowerCase().includes(value.toLocaleLowerCase()))
        .map((itemData, index) => ({ ...itemData, index }))

      setState({
        list: filteredList,
        shortcuts: getShortcuts(filteredList),
      })
      setSelectedItem(getFirstOption(filteredList))
      setSearchQuery(value)
    },
    [setState],
  )

  const handleResetState = useCallback(() => {
    const { initialList } = getState()
    setSearchQuery("")
    setState({ list: initialList, shortcuts: getShortcuts(initialList) })

    setSelectedItem(getFirstOption(initialList))
  }, [setState])

  const handleSelect = useCallback(
    (onSelect?: () => void) => () => {
      if (typeof onSelect === "function") {
        onSelect()
      } else {
        selectedItemRef.current?.click()
      }
      handleResetState()
    },
    [handleResetState],
  )

  const handleKeyPress = useCallback(
    (type: typeof UP_KEY | typeof DOWN_KEY) => {
      const { list } = getState()
      const nextItem = getNewItem(list, type, selectedItem)

      setSelectedItem(nextItem)
    },
    [selectedItem],
  )

  const handleItemsShortcuts: KeyboardEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      const { shiftKey, ctrlKey, metaKey, code } = event
      const shortcutsMap = getState().shortcuts

      if ((metaKey || ctrlKey) && shortcutsMap) {
        const preparedKey = getKeyForShortcuts({ shiftKey, code })
        const selectHandler = shortcutsMap[preparedKey]

        if (typeof selectHandler === "function") {
          event.preventDefault()
          event.stopPropagation()
          const handler = handleSelect(selectHandler)
          handler()
        }
      }
    },
    [handleSelect],
  )

  const handleListKeyDown: KeyboardEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      handleItemsShortcuts(event)
      onKeyDown?.(event)

      if (!event.defaultPrevented) {
        switch (event.key) {
          case DOWN_KEY: {
            event.preventDefault()
            handleKeyPress(DOWN_KEY)
            break
          }
          case UP_KEY: {
            event.preventDefault()
            handleKeyPress(UP_KEY)
            break
          }
          case ENTER_KEY: {
            // Check if IME composition is finished before triggering onSelect
            if (!event.nativeEvent.isComposing) {
              event.preventDefault()
              handleSelect()()
            }
          }
        }
      }
    },
    [handleItemsShortcuts, handleKeyPress, handleSelect, onKeyDown],
  )

  const menuProps = useMemo(
    () => ({
      onKeyDown: handleListKeyDown,
    }),
    [handleListKeyDown],
  )

  const searchProps = useMemo(
    () => ({
      value: searchQuery,
      onChange: handleSearch,
    }),
    [handleSearch, searchQuery],
  )

  const preparedList = getState().list.map((itemData) => {
    const isSelected = itemData.id === selectedItem?.id

    return {
      isSelected,
      ref: isSelected ? selectedItemRef : null,
      id: itemData.id,
      label: itemData.label,
      icon: itemData.icon,
      shortcut: itemData.shortcut,
      description: itemData.description,
      disabled: itemData.disabled,
      onClick: itemData.disabled ? undefined : handleSelect(itemData.onSelect),
      onPointerMove: () => setSelectedItem(itemData),
    }
  })

  const preparedGroups = useMemo(() => {
    const groupsData = getState().groups

    return Array.isArray(groupsData)
      ? groupsData
          .map(({ id, items, label }) => ({
            id,
            label,
            items: preparedList.filter(({ id }) => items.includes(id)),
          }))
          .filter(({ items }) => items.length)
      : undefined
  }, [preparedList])

  return {
    list: preparedGroups ?? preparedList,
    menuProps,
    searchProps,
  }
}
