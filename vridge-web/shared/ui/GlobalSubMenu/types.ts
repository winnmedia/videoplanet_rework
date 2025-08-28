export interface GlobalSubMenuItem {
  id: string
  name: string
  path: string
  icon?: string
  badge?: number
  isNew?: boolean
}

export interface GlobalSubMenuProps {
  isOpen: boolean
  title: string
  items: GlobalSubMenuItem[]
  activeItemId?: string
  onClose: () => void
  onItemClick: (item: GlobalSubMenuItem) => void
  className?: string
  'data-testid'?: string
}