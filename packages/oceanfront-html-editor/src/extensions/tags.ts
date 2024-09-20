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
const Select = Node.create({
  name: 'select',
  inline: false,
  group: 'block',
  content: 'option+',

  addAttributes() {
    return {
      id: {
        default: null
      },
      name: {
        default: null
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'select'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['select', mergeAttributes(HTMLAttributes), 0]
  }
})

const Option = Node.create({
  name: 'option',
  inline: true,
  content: 'inline*',

  addAttributes() {
    return {
      value: {
        default: null
      },
      selected: {
        default: false
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'option'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['option', mergeAttributes(HTMLAttributes), 0]
  }
})

const Checkbox = Node.create({
  name: 'checkbox',
  inline: true,
  group: 'inline',
  content: 'inline*',

  addAttributes() {
    return {
      id: {
        default: null
      },
      name: {
        default: null
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'input[type="checkbox"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['input', mergeAttributes({ type: 'checkbox' }, HTMLAttributes)]
  }
})
const InputText = Node.create({
  name: 'inputText',
  inline: true,
  group: 'inline',
  content: 'inline*',

  addAttributes() {
    return {
      id: {
        default: null
      },
      name: {
        default: null
      },
      placeholder: {
        default: ''
      },
      value: {
        default: ''
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'input[type="text"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['input', mergeAttributes({ type: 'text' }, HTMLAttributes)]
  }
})

const InputButton = Node.create({
  name: 'inputButton',
  inline: true,
  group: 'inline',
  content: 'inline*',

  addAttributes() {
    return {
      id: {
        default: null
      },
      name: {
        default: null
      },
      value: {
        default: ''
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'input[type="button"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['input', mergeAttributes({ type: 'button' }, HTMLAttributes)]
  }
})

export {
  Span,
  Abbr,
  OneCrmArticle,
  OneCrmCategory,
  Select,
  Option,
  Checkbox,
  InputText,
  InputButton
}
