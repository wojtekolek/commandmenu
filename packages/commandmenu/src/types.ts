import type { ChangeEventHandler, KeyboardEventHandler, MouseEvent, ReactNode, RefObject } from "react"

// Config
type ItemCommonConfigData = {
  id: string
  icon?: ReactNode
  label: string
  description?: string
}

export type ItemConfigData = ItemCommonConfigData & {
  placeholder?: never
  items?: never
  onSelect: (event: MouseEvent<HTMLLIElement>) => void
}

export type ItemWithNestedListConfigData = ItemCommonConfigData & {
  onSelect?: never
  placeholder: string
  items: Array<ItemWithNestedListConfigData | ItemConfigData>
}

export type ItemsGroupConfigData = {
  id: string
  label: string
  groupItems: Array<ItemConfigData | ItemWithNestedListConfigData>
}

export type ConfigData = ItemsGroupConfigData[] | ItemConfigData[] | ItemWithNestedListConfigData[]

// Prepared list
export type SelectedItemData = {
  id: string
  isConfigWithNestedData: boolean
}

export type ListItemData = {
  id: string
  label: string
  icon?: ReactNode
  description?: string
  onPointerMove: () => void
  onClick: (event: MouseEvent<HTMLLIElement>) => void
  items?: ListItemData[]
  isGroup?: never
  groupItems?: never
}

export type ListGroupData = {
  id: string
  label: string
  isGroup: boolean
  groupItems: ListItemData[]
  items?: never
  icon?: never
  description?: never
}

export type ListData = ListGroupData[] | ListItemData[]

// Return types
export type MenuProps = {
  ref: RefObject<HTMLDivElement>
  onKeyDown: KeyboardEventHandler<HTMLDivElement>
}

export type SearchProps = {
  autoFocus: boolean
  placeholder: string
  value?: string
  ref: RefObject<HTMLInputElement>
  onChange: ChangeEventHandler<HTMLInputElement>
}
