import { describe, it, expect } from 'vitest'
import type {
  WorkflowNode,
  WorkflowGroup,
  NodeTypeConfig,
  GroupTypeConfig,
  WorkflowCanvasLabels
} from '../../types/workflow'
import { DEFAULT_LABELS } from '../../constants/labels'
import {
  getNodeCssClass,
  getNodeDisplayLabel,
  getNodeDisplayLabelRight,
  getGroupDisplayLabel,
  getGroupDisplayLabelRight,
  shouldHideGroupAddNode,
  shouldHideGroupAddGroup,
  shouldHideGroupNestedAddNode,
  shouldHideGroupNestedAddGroup,
  shouldHideNodeAddNode,
  shouldHideNodeAddGroup,
  getNodeAddNodeButtonText,
  getNodeAddGroupButtonText,
  getGroupAddNodeButtonText,
  getGroupAddGroupButtonText
} from '../display-helpers'

function makeNode(overrides: Partial<WorkflowNode> = {}): WorkflowNode {
  return {
    id: 'node-1',
    kind: 'action',
    position: { x: 0, y: 0 },
    ...overrides
  }
}

function makeGroup(overrides: Partial<WorkflowGroup> = {}): WorkflowGroup {
  return {
    id: 'group-1',
    kind: 'group',
    position: { x: 0, y: 0 },
    size: { w: 300, h: 200 },
    containedIds: [],
    ...overrides
  }
}

const nodeTypes: NodeTypeConfig = {
  action: {
    type: 'action',
    title: 'Action',
    fields: [],
    cssClass: 'custom-action-class',
    hideAddNode: true,
    hideAddGroup: false,
    addNodeButtonText: '+ step',
    addGroupButtonText: '+ phase'
  },
  trigger: {
    type: 'trigger',
    title: 'Trigger',
    fields: []
  }
}

const groupTypes: GroupTypeConfig = {
  group: {
    type: 'group',
    label: 'Standard Group',
    fields: [],
    hideAddNode: true,
    hideAddGroup: false,
    hideNestedAddNode: true,
    hideNestedAddGroup: false,
    addNodeButtonText: '+ task',
    addGroupButtonText: '+ sub-group'
  },
  phase: {
    type: 'phase',
    label: 'Phase',
    fields: []
  }
}

describe('display-helpers', () => {
  describe('getNodeCssClass', () => {
    it('returns definition override cssClass when set', () => {
      const node = makeNode({ definition: { cssClass: 'my-override' } })
      expect(getNodeCssClass(node, nodeTypes)).toBe('my-override')
    })

    it('returns type-level cssClass when no override', () => {
      const node = makeNode({ kind: 'action' })
      expect(getNodeCssClass(node, nodeTypes)).toBe('custom-action-class')
    })

    it('returns default class when no override and no type cssClass', () => {
      const node = makeNode({ kind: 'trigger' })
      expect(getNodeCssClass(node, nodeTypes)).toBe('workflow-canvas-node--type-trigger')
    })

    it('returns default class for unknown kind', () => {
      const node = makeNode({ kind: 'unknown' })
      expect(getNodeCssClass(node, {})).toBe('workflow-canvas-node--type-unknown')
    })
  })

  describe('getNodeDisplayLabel', () => {
    it('returns definition label when set', () => {
      const node = makeNode({ label: 'Node Label', definition: { label: 'Override' } })
      expect(getNodeDisplayLabel(node)).toBe('Override')
    })

    it('returns node label when no definition override', () => {
      const node = makeNode({ label: 'Node Label' })
      expect(getNodeDisplayLabel(node)).toBe('Node Label')
    })

    it('returns empty string when no labels', () => {
      const node = makeNode()
      expect(getNodeDisplayLabel(node)).toBe('')
    })

    it('skips whitespace-only definition label', () => {
      const node = makeNode({ label: 'Fallback', definition: { label: '   ' } })
      expect(getNodeDisplayLabel(node)).toBe('Fallback')
    })

    it('skips whitespace-only node label', () => {
      const node = makeNode({ label: '   ' })
      expect(getNodeDisplayLabel(node)).toBe('')
    })
  })

  describe('getNodeDisplayLabelRight', () => {
    it('returns definition labelRight when set', () => {
      const node = makeNode({ labelRight: 'Right', definition: { labelRight: 'Override Right' } })
      expect(getNodeDisplayLabelRight(node)).toBe('Override Right')
    })

    it('returns node labelRight when no definition override', () => {
      const node = makeNode({ labelRight: 'Right' })
      expect(getNodeDisplayLabelRight(node)).toBe('Right')
    })

    it('returns empty string when no labels', () => {
      const node = makeNode()
      expect(getNodeDisplayLabelRight(node)).toBe('')
    })

    it('skips whitespace-only values', () => {
      const node = makeNode({ labelRight: '  ', definition: { labelRight: '  ' } })
      expect(getNodeDisplayLabelRight(node)).toBe('')
    })
  })

  describe('getGroupDisplayLabel', () => {
    it('returns definition label when set', () => {
      const group = makeGroup({ definition: { label: 'Def Label' } })
      expect(getGroupDisplayLabel(group, groupTypes)).toBe('Def Label')
    })

    it('returns group label when no definition override', () => {
      const group = makeGroup({ label: 'My Group' })
      expect(getGroupDisplayLabel(group, groupTypes)).toBe('My Group')
    })

    it('returns type label when no instance labels', () => {
      const group = makeGroup({ kind: 'group' })
      expect(getGroupDisplayLabel(group, groupTypes)).toBe('Standard Group')
    })

    it('returns kind as fallback', () => {
      const group = makeGroup({ kind: 'custom' })
      expect(getGroupDisplayLabel(group, {})).toBe('custom')
    })

    it('skips whitespace-only definition label', () => {
      const group = makeGroup({ label: 'Fallback', definition: { label: '  ' } })
      expect(getGroupDisplayLabel(group, groupTypes)).toBe('Fallback')
    })
  })

  describe('getGroupDisplayLabelRight', () => {
    it('returns definition labelRight when set', () => {
      const group = makeGroup({ definition: { labelRight: 'Right Override' } })
      expect(getGroupDisplayLabelRight(group)).toBe('Right Override')
    })

    it('returns group labelRight when no definition override', () => {
      const group = makeGroup({ labelRight: 'Right' })
      expect(getGroupDisplayLabelRight(group)).toBe('Right')
    })

    it('returns empty string when no labels', () => {
      const group = makeGroup()
      expect(getGroupDisplayLabelRight(group)).toBe('')
    })
  })

  describe('shouldHideGroupAddNode', () => {
    it('returns instance value when set', () => {
      const group = makeGroup({ hideAddNode: false })
      expect(shouldHideGroupAddNode(group, groupTypes)).toBe(false)
    })

    it('returns type-level value when no instance value', () => {
      const group = makeGroup({ kind: 'group' })
      expect(shouldHideGroupAddNode(group, groupTypes)).toBe(true)
    })

    it('returns false when nothing set', () => {
      const group = makeGroup({ kind: 'phase' })
      expect(shouldHideGroupAddNode(group, groupTypes)).toBe(false)
    })
  })

  describe('shouldHideGroupAddGroup', () => {
    it('returns instance value when set', () => {
      const group = makeGroup({ hideAddGroup: true })
      expect(shouldHideGroupAddGroup(group, groupTypes)).toBe(true)
    })

    it('returns type-level value when no instance value', () => {
      const group = makeGroup({ kind: 'group' })
      expect(shouldHideGroupAddGroup(group, groupTypes)).toBe(false)
    })

    it('returns false when nothing set', () => {
      const group = makeGroup({ kind: 'phase' })
      expect(shouldHideGroupAddGroup(group, groupTypes)).toBe(false)
    })
  })

  describe('shouldHideGroupNestedAddNode', () => {
    it('returns instance value when set', () => {
      const group = makeGroup({ hideNestedAddNode: false })
      expect(shouldHideGroupNestedAddNode(group, groupTypes)).toBe(false)
    })

    it('returns type-level value when no instance value', () => {
      const group = makeGroup({ kind: 'group' })
      expect(shouldHideGroupNestedAddNode(group, groupTypes)).toBe(true)
    })

    it('returns false when nothing set', () => {
      const group = makeGroup({ kind: 'phase' })
      expect(shouldHideGroupNestedAddNode(group, groupTypes)).toBe(false)
    })
  })

  describe('shouldHideGroupNestedAddGroup', () => {
    it('returns instance value when set', () => {
      const group = makeGroup({ hideNestedAddGroup: true })
      expect(shouldHideGroupNestedAddGroup(group, groupTypes)).toBe(true)
    })

    it('returns type-level value when no instance value', () => {
      const group = makeGroup({ kind: 'group' })
      expect(shouldHideGroupNestedAddGroup(group, groupTypes)).toBe(false)
    })

    it('returns false when nothing set', () => {
      const group = makeGroup({ kind: 'phase' })
      expect(shouldHideGroupNestedAddGroup(group, groupTypes)).toBe(false)
    })
  })

  describe('shouldHideNodeAddNode', () => {
    it('returns instance value when set', () => {
      const node = makeNode({ hideAddNode: false })
      expect(shouldHideNodeAddNode(node, nodeTypes)).toBe(false)
    })

    it('returns type-level value when no instance value', () => {
      const node = makeNode({ kind: 'action' })
      expect(shouldHideNodeAddNode(node, nodeTypes)).toBe(true)
    })

    it('returns false when nothing set', () => {
      const node = makeNode({ kind: 'trigger' })
      expect(shouldHideNodeAddNode(node, nodeTypes)).toBe(false)
    })
  })

  describe('shouldHideNodeAddGroup', () => {
    it('returns instance value when set', () => {
      const node = makeNode({ hideAddGroup: true })
      expect(shouldHideNodeAddGroup(node, nodeTypes)).toBe(true)
    })

    it('returns type-level value when no instance value', () => {
      const node = makeNode({ kind: 'action' })
      expect(shouldHideNodeAddGroup(node, nodeTypes)).toBe(false)
    })

    it('returns false when nothing set', () => {
      const node = makeNode({ kind: 'trigger' })
      expect(shouldHideNodeAddGroup(node, nodeTypes)).toBe(false)
    })
  })

  describe('getNodeAddNodeButtonText', () => {
    it('returns type config text when available', () => {
      const node = makeNode({ kind: 'action' })
      expect(getNodeAddNodeButtonText(node, nodeTypes, DEFAULT_LABELS)).toBe('+ step')
    })

    it('returns fallback text when no type config', () => {
      const node = makeNode({ kind: 'trigger' })
      expect(getNodeAddNodeButtonText(node, nodeTypes, DEFAULT_LABELS)).toBe(
        DEFAULT_LABELS.addNodeButtonTextFallback
      )
    })
  })

  describe('getNodeAddGroupButtonText', () => {
    it('returns type config text when available', () => {
      const node = makeNode({ kind: 'action' })
      expect(getNodeAddGroupButtonText(node, nodeTypes, DEFAULT_LABELS)).toBe('+ phase')
    })

    it('returns fallback text when no type config', () => {
      const node = makeNode({ kind: 'trigger' })
      expect(getNodeAddGroupButtonText(node, nodeTypes, DEFAULT_LABELS)).toBe(
        DEFAULT_LABELS.addGroupButtonTextFallback
      )
    })
  })

  describe('getGroupAddNodeButtonText', () => {
    it('returns type config text when available', () => {
      const group = makeGroup({ kind: 'group' })
      expect(getGroupAddNodeButtonText(group, groupTypes, DEFAULT_LABELS)).toBe('+ task')
    })

    it('returns fallback text when no type config', () => {
      const group = makeGroup({ kind: 'phase' })
      expect(getGroupAddNodeButtonText(group, groupTypes, DEFAULT_LABELS)).toBe(
        DEFAULT_LABELS.addNodeButtonTextFallback
      )
    })
  })

  describe('getGroupAddGroupButtonText', () => {
    it('returns type config text when available', () => {
      const group = makeGroup({ kind: 'group' })
      expect(getGroupAddGroupButtonText(group, groupTypes, DEFAULT_LABELS)).toBe('+ sub-group')
    })

    it('returns fallback text when no type config', () => {
      const group = makeGroup({ kind: 'phase' })
      expect(getGroupAddGroupButtonText(group, groupTypes, DEFAULT_LABELS)).toBe(
        DEFAULT_LABELS.addGroupButtonTextFallback
      )
    })
  })
})
