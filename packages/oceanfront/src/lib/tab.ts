import type { VNode } from 'vue'

export type Tab = {
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
  /**
   * Optional trailing content (string or VNode), e.g. a create-record button.
   * When focusable, this is an intentional ARIA exception to the tabs pattern
   * (nested interactive content inside role="tab") — see Tabs.vue.
   */
  postfix?: string | VNode
}
