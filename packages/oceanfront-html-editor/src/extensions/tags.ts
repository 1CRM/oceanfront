import { Node, mergeAttributes } from '@tiptap/core'

const Span = Node.create({
  name: 'span',
  group: 'inline',
  inline: true,
  content: 'inline*',

  addAttributes() {
    return {
      id: {
        default: null
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0]
  }
})

const Abbr = Node.create({
  name: 'abbr',
  inline: true,
  group: 'inline',
  content: 'inline*',

  addAttributes() {
    return {
      title: {
        default: null
      },
      contenteditable: {
        default: false
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'abbr'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['abbr', mergeAttributes(HTMLAttributes), 0]
  }
})

const OneCrmArticle = Node.create({
  name: 'oneCrmArticle',
  inline: true,
  group: 'inline',
  content: 'text*',
  selectable: true,

  addAttributes() {
    return {
      id: {
        default: null
      },
      contenteditable: {
        default: false
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'onecrm-article'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['onecrm-article', mergeAttributes(HTMLAttributes), 0]
  }
})

const OneCrmCategory = Node.create({
  name: 'oneCrmCategory',
  inline: true,
  group: 'inline',
  content: 'text*',
  selectable: true,

  addAttributes() {
    return {
      id: {
        default: null
      },
      contenteditable: {
        default: false
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'onecrm-category'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['onecrm-category', mergeAttributes(HTMLAttributes), 0]
  }
})

export { Span, Abbr, OneCrmArticle, OneCrmCategory }
