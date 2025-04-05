import { useCommandMenu } from "commandmenu"
import type { FunctionComponent } from "react"
import { cn } from "../../../utils/styles"

export const CommandMenu: FunctionComponent = () => {
  const { menuProps, searchProps, list } = useCommandMenu({
    config: [],
    groups: [],
  })

  return (
    <div
      {...menuProps}
      className="mx-auto max-h-[440px] min-h-[240px] max-w-[640px] overflow-hidden border-4 border-primary-100"
    >
      <div className="flex w-full items-center gap-2 border-primary-300 border-b-1 bg-primary-50">
        <input {...searchProps} type="text" placeholder="Czego szukasz?" />

        <kbd className="absolute top-4 right-6 flex items-center justify-center rounded bg-primary-900 p-1 text-primary-300 text-xs">
          Esc
        </kbd>
      </div>

      <ul className="m-0 scroll-p-12 list-none overflow-y-auto overscroll-contain px-3 py-2">
        {list.map(({ id, label, items }) => (
          <li key={id}>
            <div className="px-3 py-1 text-primary-300">{label}</div>

            <ul>
              {items.map(({ icon: Icon, ...itemData }) => (
                // biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
                <li
                  aria-selected={itemData.isSelected}
                  ref={itemData.ref}
                  key={itemData.id}
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-primary-950 focus:bg-primary-300",
                    itemData.isSelected ? "bg-primary-200/30" : "",
                  )}
                  onClick={itemData.onClick}
                  onPointerMove={itemData.onPointerMove}
                >
                  <div className="flex items-center gap-2">
                    {!!Icon && (
                      <div>
                        <Icon className="size-4 text-primary-400" />
                      </div>
                    )}

                    {itemData.label}

                    <p className="text-primary-400 text-xs">{itemData.description}</p>
                  </div>

                  {!!itemData.shortcut && (
                    <kbd className="flex items-center justify-center rounded-lg border-1 border-primary-200/60 bg-primary-200/30 p-1 text-primary-700 text-xs">
                      {itemData.shortcut}
                    </kbd>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  )
}
