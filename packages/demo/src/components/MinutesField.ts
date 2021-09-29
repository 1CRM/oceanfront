import { defineFieldType, FieldContext, fieldRender, useRecords } from "oceanfront";
import { computed, h } from "vue";

export default defineFieldType({
    name: "minutes",
    setup(props, _ctx: FieldContext) {
        const recordMgr = useRecords()
        const record = computed(() => {
            return props.record || recordMgr.getCurrentRecord()
        })

        const value = computed(() => {
            const h = parseInt(record.value?.value[props.name + "_hours"]) || 0
            const m = parseInt(record.value?.value[props.name + "_minutes"]) || 0
            console.log(h, m)
            return h * 60 + m
        })

        const onChange = (evt: Event) => {
            if (!record.value) return
            const target = evt.target as
                | (HTMLInputElement | HTMLTextAreaElement)
                | null
            if (!target) return
            const val = target.value
            const hm = parseInt(val)
            if (!isNaN(hm)) {
                record.value.value[props.name + "_hours"] = Math.floor((hm / 60)).toFixed(0)
                record.value.value[props.name + "_minutes"] = (hm % 60).toFixed(0)
            }
        }

        return fieldRender({
            class: {
                'of-text-field': true,
            },
            content: () => {
                return h('input', {
                    type: "number",
                    class: [
                        'of-field-input',
                    ],
                    onchange: onChange,
                    value: value.value,
                });

                /*
          return () => {
              return h(OfField, { type: "number", 'onUpdate:modelValue': update, modelValue: value.value, label: props.label })
          }
          */
            }
        })
    }
})
