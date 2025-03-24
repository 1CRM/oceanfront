export interface Tab {
  key: number
  value: number
  text: string
  visible: boolean
  overflowButton: boolean
  params?: object | undefined
  icon?: string
  disabled?: boolean
  subMenuItems?: Array<Tab> | undefined
  subMenuSlots?: Array<object> | undefined
  parentKey?: number | undefined
  ariaLabel?: string | undefined
  id?: string
  count?: number
}
