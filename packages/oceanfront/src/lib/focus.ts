import { InjectionKey, inject, provide } from 'vue'

const FOCUS_GROUP = 'offocusgrp' as unknown as InjectionKey<FocusGroup>

export function provideFocusGroup(grp: FocusGroup | null): void {
  provide(FOCUS_GROUP, grp as any)
}

export function useFocusGroup(): FocusGroup | null {
  return inject(FOCUS_GROUP, null) || null
}

export type FocusGroup = {
  focus(): void
  blur(): void
}
