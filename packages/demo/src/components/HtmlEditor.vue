<template>
  <div class="container">
    <h1>HTML Editor</h1>
    <of-highlight lang="html" :value="sampleCode" />
    <hr />
    <div class="row">
      <of-field
        v-model="editable"
        label="Editable"
        type="toggle"
        label-position="input"
      />
    </div>
    <br />
    <of-html-editor
      v-model="content"
      @updated="updated"
      :editable="editable"
      label="Message"
    />
    <br />
    <of-html-editor
      v-model="content2"
      @updated="updated"
      :editable="editable"
      label="Lightweight HTML Editor"
      :toolbar-items="[
        'bold',
        'italic',
        'underline',
        'heading-3',
        'code',
        'highlight',
        'add-link',
        'numbered-list',
        'bulleted-list',
        'blockquote',
        'source-mode'
      ]"
      one-row
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'

export default defineComponent({
  setup() {
    const content = ref('<h3><i>Oceanfront is the best UI lib!</i></h3>')
    const content2 = ref('<b>One row lightweight menu</b>')
    const sampleCode = `
<of-html-editor v-model="content" />
<of-html-editor :record="record" name="description" />`

    const editable = ref(true)

    const updated = (val: any) => {
      console.log(val)
    }

    return {
      sampleCode,
      content,
      content2,
      editable,
      updated
    }
  }
})
</script>
