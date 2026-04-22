/**
 * Screen reader strings derived from {@link FormRecord.value} keys.
 *
 * Canvas-level (not prefixed by entity id):
 * - `workflow-canvas-ariaLabel` — overrides `labels.canvasAriaLabel` when non-empty
 * - `workflow-canvas-fullWidthToggle` — full-width control name
 * - `workflow-canvas-panelClose` — configuration panel close control
 *
 * Per entity `{entityId}-title` and `{entityId}-description` are combined for regions
 * and placeholders. Optional `{entityId}-tileMenu` names the tile overflow menu.
 */

export function readRecordTrimmed(recordValue: Record<string, any>, key: string): string {
  const raw = recordValue[key]
  if (raw === undefined || raw === null) return ''
  return String(raw).trim()
}

/** Non-empty title and description fields for an entity, space-separated. */
export function entityRecordPrimaryText(
  recordValue: Record<string, any>,
  entityId: string
): string {
  const title = readRecordTrimmed(recordValue, `${entityId}-title`)
  const desc = readRecordTrimmed(recordValue, `${entityId}-description`)
  return [title, desc].filter(Boolean).join(' ')
}

/** Accessible name for a node or group region: record text, else the entity id. */
export function entityAccessibilityLabel(
  recordValue: Record<string, any>,
  entityId: string
): string {
  return entityRecordPrimaryText(recordValue, entityId) || entityId
}

/** Optional label when only record-backed text should be exposed (e.g. icon-only controls). */
export function entityRecordPrimaryTextOptional(
  recordValue: Record<string, any>,
  entityId: string
): string | undefined {
  const t = entityRecordPrimaryText(recordValue, entityId)
  return t || undefined
}
