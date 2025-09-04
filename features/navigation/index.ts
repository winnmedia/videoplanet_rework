// Navigation Feature Public API
export { useNavigation } from './model/useNavigation'
export { NavigationProvider } from './ui/NavigationProvider'
export { useSubMenuKeyboard } from './lib/useSubMenuKeyboard'
export { useFocusTrap } from './lib/useFocusTrap'
export { useReducedMotion } from './lib/useReducedMotion'

export type {
  NavigationState,
  NavigationActions,
  SubMenuKeyboardOptions,
  FocusTrapOptions
} from './model/types'