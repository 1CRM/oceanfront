<template>
  <div class="of-code of--highlight">
    <div class="hljs" v-html="result"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import hljs from 'highlight.js/lib/core'
import hljs_css from 'highlight.js/lib/languages/css'
import hljs_json from 'highlight.js/lib/languages/json'
import hljs_xml from 'highlight.js/lib/languages/xml'

hljs.registerLanguage('css', hljs_css)
hljs.registerLanguage('json', hljs_json)
hljs.registerLanguage('xml', hljs_xml)

const formatLines = (text: string) => {
  if (text) {
    const lines = text.trim().split(/\r?\n/)
    const lines_indent = lines.map((line) => {
      const m = line.match(/^([ \t]*)(.*)$/)
      let [ws, code] = [m![1], m![2]]
      const wslen = ws.length
      return `<div style="padding-left: ${
        wslen + 2
      }ch; text-indent: -2ch">${code}</div>`
    })
    return lines_indent.join('\n')
  }
}

export default defineComponent({
  name: 'OfHighlight',
  props: {
    lang: String,
    value: String
  },
  setup(props, _ctx) {
    const result = computed(() =>
      props.lang && props.value
        ? formatLines(
            hljs.highlight(props.value, { language: props.lang }).value
          )
        : undefined
    )
    return {
      result
    }
  }
})
</script>

<style lang="scss">
html:not(.-of-theme-dark) {
  pre code.hljs {
    display: block;
    overflow-x: auto;
    padding: 1em;
  }
  code.hljs {
    padding: 3px 5px;
  }
  .hljs {
    color: #24292e;
    background: none;
  }
  .hljs-doctag,
  .hljs-keyword,
  .hljs-meta .hljs-keyword,
  .hljs-template-tag,
  .hljs-template-variable,
  .hljs-type,
  .hljs-variable.language_ {
    color: #d73a49;
  }
  .hljs-title,
  .hljs-title.class_,
  .hljs-title.class_.inherited__,
  .hljs-title.function_ {
    color: #6f42c1;
  }
  .hljs-attr,
  .hljs-attribute,
  .hljs-literal,
  .hljs-meta,
  .hljs-number,
  .hljs-operator,
  .hljs-selector-attr,
  .hljs-selector-class,
  .hljs-selector-id,
  .hljs-variable {
    color: #005cc5;
  }
  .hljs-meta .hljs-string,
  .hljs-regexp,
  .hljs-string {
    color: #032f62;
  }
  .hljs-built_in,
  .hljs-symbol {
    color: #e36209;
  }
  .hljs-code,
  .hljs-comment,
  .hljs-formula {
    color: #6a737d;
  }
  .hljs-name,
  .hljs-quote,
  .hljs-selector-pseudo,
  .hljs-selector-tag {
    color: #22863a;
  }
  .hljs-subst {
    color: #24292e;
  }
  .hljs-section {
    color: #005cc5;
    font-weight: 700;
  }
  .hljs-bullet {
    color: #735c0f;
  }
  .hljs-emphasis {
    color: #24292e;
    font-style: italic;
  }
  .hljs-strong {
    color: #24292e;
    font-weight: 700;
  }
  .hljs-addition {
    color: #22863a;
    background-color: #f0fff4;
  }
  .hljs-deletion {
    color: #b31d28;
    background-color: #ffeef0;
  }
}
html.-of-theme-dark {
  pre code.hljs {
    display: block;
    overflow-x: auto;
    padding: 1em;
  }
  code.hljs {
    padding: 3px 5px;
  }
  .hljs {
    color: #c9d1d9;
    background: none;
  }
  .hljs-doctag,
  .hljs-keyword,
  .hljs-meta .hljs-keyword,
  .hljs-template-tag,
  .hljs-template-variable,
  .hljs-type,
  .hljs-variable.language_ {
    color: #ff7b72;
  }
  .hljs-title,
  .hljs-title.class_,
  .hljs-title.class_.inherited__,
  .hljs-title.function_ {
    color: #d2a8ff;
  }
  .hljs-attr,
  .hljs-attribute,
  .hljs-literal,
  .hljs-meta,
  .hljs-number,
  .hljs-operator,
  .hljs-selector-attr,
  .hljs-selector-class,
  .hljs-selector-id,
  .hljs-variable {
    color: #79c0ff;
  }
  .hljs-meta .hljs-string,
  .hljs-regexp,
  .hljs-string {
    color: #a5d6ff;
  }
  .hljs-built_in,
  .hljs-symbol {
    color: #ffa657;
  }
  .hljs-code,
  .hljs-comment,
  .hljs-formula {
    color: #8b949e;
  }
  .hljs-name,
  .hljs-quote,
  .hljs-selector-pseudo,
  .hljs-selector-tag {
    color: #7ee787;
  }
  .hljs-subst {
    color: #c9d1d9;
  }
  .hljs-section {
    color: #1f6feb;
    font-weight: 700;
  }
  .hljs-bullet {
    color: #f2cc60;
  }
  .hljs-emphasis {
    color: #c9d1d9;
    font-style: italic;
  }
  .hljs-strong {
    color: #c9d1d9;
    font-weight: 700;
  }
  .hljs-addition {
    color: #aff5b4;
    background-color: #033a16;
  }
  .hljs-deletion {
    color: #ffdcd7;
    background-color: #67060c;
  }
}
</style>
