import type { Dispatch, SetStateAction } from "react"
import type {
  ConfigData,
  ItemConfigData,
  ItemWithNestedListConfigData,
  ItemsGroupConfigData,
  ListData,
  ListGroupData,
  ListItemData,
  SelectedItemData,
} from "./types"

// Type guards
export const isConfigWithGroups = (config: ConfigData): config is ItemsGroupConfigData[] =>
  (config as ItemsGroupConfigData[]).at(0)?.groupItems !== undefined

export const isListDataWithGroups = (config: ListData): config is ListGroupData[] =>
  (config as ListGroupData[]).at(0)?.groupItems !== undefined

// Preapare list
export const prepareListOption = (
  config: Array<ItemConfigData | ItemWithNestedListConfigData>,
  setSelectedItem: Dispatch<SetStateAction<SelectedItemData | undefined>>,
  goToNested: (passedItemId: string) => void,
): ListItemData[] =>
  config.map(({ id, label, icon, description, onSelect, items, placeholder }) => {
    const isConfigWithNestedData = !!items?.length
    return {
      id,
      label,
      icon,
      description,
      onPointerMove: () =>
        setSelectedItem({
          id,
          isConfigWithNestedData,
        }),
      onClick: isConfigWithNestedData ? () => goToNested(id) : onSelect!,
      isGroup: undefined,
      placeholder,
      items: items?.length ? prepareListOption(items, setSelectedItem, goToNested) : undefined,
    }
  })

export const getListData = (
  config: ConfigData,
  setSelectedItem: Dispatch<SetStateAction<SelectedItemData | undefined>>,
  goToNested: (passedItemId: string) => void,
): ListData => {
  if (isConfigWithGroups(config)) {
    return config.map(({ id, label, groupItems }) => ({
      id,
      label,
      isGroup: true,
      groupItems: prepareListOption(groupItems, setSelectedItem, goToNested),
    }))
  }
  return prepareListOption(config, setSelectedItem, goToNested)
}

export const getFlatListData = (listData: ListData): ListItemData[] => {
  if (isConfigWithGroups(listData as unknown as ConfigData)) {
    return listData.flatMap(({ items }) => items!)
  }
  return listData as ListItemData[]
}

export const getFirstOption = (config: ConfigData): SelectedItemData => {
  const INITIAL_INDEX = 0
  if (isConfigWithGroups(config)) {
    const item = config.at(INITIAL_INDEX)?.groupItems.at(INITIAL_INDEX)!
    return {
      id: item.id,
      isConfigWithNestedData: true,
    }
  }

  const item = config.at(INITIAL_INDEX)!
  return {
    id: item.id,
    isConfigWithNestedData: false,
  }
}

// helpers
export const getItemsOrder = (preparedConfig: ListData): SelectedItemData[] => {
  if (isListDataWithGroups(preparedConfig)) {
    return preparedConfig.flatMap(({ groupItems }) =>
      groupItems.flatMap(({ id, items }) => ({
        id,
        isConfigWithNestedData: !!items,
      })),
    )
  }
  return preparedConfig.flatMap(({ id, items }) => ({
    id,
    isConfigWithNestedData: !!items?.length,
  }))
}

type FilteredData = {
  data: ListData
  itemsOrder: SelectedItemData[]
}

export const getFilteredList = (list: ListData, searchValue: string): FilteredData => {
  if (isListDataWithGroups(list)) {
    const fillteredItems = list.map(({ groupItems, ...data }) => ({
      ...data,
      groupItems: groupItems?.filter(({ label }) => label.toLowerCase().includes(searchValue.toLowerCase())),
    }))
    const data = fillteredItems.filter(({ groupItems }) => groupItems?.length)
    return {
      data,
      itemsOrder: getItemsOrder(data),
    }
  }
  const data = list.filter(({ label }) => label.toLowerCase().includes(searchValue.toLowerCase()))
  return {
    data,
    itemsOrder: getItemsOrder(data),
  }
}

export const getPropByPath = (object: Record<string, any>, path: (string | number)[], defaultValue: unknown): any => {
  if (object && path.length) return getPropByPath(object[path.shift()!], path, defaultValue)
  return object === undefined ? defaultValue : object
}

export const findIndexes = (data: ListData, selectedItemId: string) =>
  data.flatMap(({ id, isGroup, groupItems }, index) => {
    if (isGroup && groupItems.length) {
      const itemIndex = groupItems.findIndex(({ id }) => id === selectedItemId)
      return itemIndex > -1 ? [index, itemIndex] : []
    }
    if (id === selectedItemId) {
      return [index]
    }
    return []
  })

export const isGroupItem = (itemToCheck: ListGroupData | ListItemData): itemToCheck is ListGroupData =>
  Array.isArray((itemToCheck as ListGroupData).groupItems)
