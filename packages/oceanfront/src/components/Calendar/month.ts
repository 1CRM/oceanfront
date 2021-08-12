import { getDayIdentifier, getEventsOfDay, toTimestamp } from "src/lib/calendar";
import { CalendarEvent, InternalEvent, parseEvent, uniqEvent } from "src/lib/calendar/common";
import { addDays, firstMonday, isoWeekNumber, monthGrid, MonthGridCell, MonthGridData } from "src/lib/datetime";
import { useFormats } from "src/lib/formats";
import { defineComponent, h } from "vue";
import Base from './base';
import calendarProps from './props';

export default defineComponent({
    mixins: [Base],
    props: {
        ...calendarProps.internal,
        ...calendarProps.common,
        ...calendarProps.month,
    },
    emits: [
        'click:event',
        'enter:event',
        'leave:event',
        'click:day',
        'click:more',
        'click:week',
    ],
    computed: {
        eventsLimitNumber(): number {
            const limit = parseInt(this.$props.eventsLimit as any as string) || 5
            if (limit < 2) return 2
            return limit
        },
        eventHeightNumber(): number {
            return parseInt(this.$props.eventHeight as unknown as string) || 20
        },

        monthGrid(): MonthGridData {
            return monthGrid(this.day)
        },
        parsedEvents(): InternalEvent[] {
            const events: CalendarEvent[] = this.$props.events || []
            const mgr = useFormats()
            return events.map(e => parseEvent(e, mgr)).filter(e => e !== undefined) as InternalEvent[]
        },
    },
    methods: {
        dayEvents(day: Date): InternalEvent[] {
            return getEventsOfDay(this.parsedEvents, getDayIdentifier(toTimestamp(day)), "ignore")
                .map(e => uniqEvent(e, { category: "", date: day }))
        },
        header() {
            const slot = this.$slots['header']
            return slot?.()
        },
        renderDayNumberOrSlot(day: Date) {
            const slot = this.$slots['day-title']
            const content = slot
                ? slot(day)
                : this.renderDayNumber(day, false)
            return h('div', {
                class: 'day-title', onClick: (event: any) => {
                    this.$emit('click:day', event, day)

                }
            }, content)
        },
        renderMoreLink(count: number, day: Date, top: number) {
            if (count < 1) return null
            const slot = this.$slots['more']
            return h('div', {
                class: 'of-calendar-more', onClick: (event: any) => {
                    this.$emit('click:more', event, day)
                },
                style: {
                    top: "" + top + "px",
                }
            }, slot ? slot(count) : `${count} more`)
        },
        renderRowDayEvent(e: InternalEvent, idx: number) {
            const top = this.eventHeightNumber * idx
            const finalColor = this.$props.eventColor?.(e) ?? e.color
            const eventClass = this.$props.eventClass?.(e) ?? {}
            return h('div',
                {
                    class: { ...eventClass, 'of-calendar-event': true },
                    style: {
                        'background-color': finalColor,
                        top: `${top}px`
                    },
                    onClick: (event: any) => {
                        this.$emit('click:event', event, { ...e, color: finalColor })
                    },
                    onMouseenter: (event: any) => {
                        this.$emit('enter:event', event, e)
                    },
                    onMouseleave: (event: any) => {
                        this.$emit('leave:event', event, e)
                    },
                },
                this.renderSlot('allday-event-content', { event: e }, () => h('strong', e.name))
            )
        },
        renderRowDay(day: MonthGridCell) {
            const dayEvents = this.dayEvents(day.date)
            let limit = this.eventsLimitNumber
            let more = 0
            if (dayEvents.length > limit) {
                limit -= 1
                more = dayEvents.length - limit
            }
            const events = dayEvents.slice(0, limit)
            const dayHeight = events.length + (more ? 1 : 0)
            const style = this.$props.fixedRowHeight ? {} : { '--of-month-day-heigth': '' + (dayHeight * this.eventHeightNumber) + 'px' }
            if (!this.$props.fixedRowHeight) {
                //--of-month-day-heigth
            }
            return h('div', { class: 'of-calendar-month-day', style },
                day.otherMonth && this.hideOtherMonths ? [] :
                    [
                        this.renderDayNumberOrSlot(day.date),
                        h('div', { class: 'events' },
                            [
                                events.map(this.renderRowDayEvent),
                                this.renderMoreLink(more, day.date, events.length * this.eventHeightNumber),
                            ]
                        )
                    ]
            )

        },
        renderRow(rowDays: MonthGridCell[], weekNumber: number) {
            const firstDay = addDays(firstMonday(this.day), weekNumber * 7)
            const wn = isoWeekNumber(firstDay);
            const wnSlot = this.$slots['week-number']
            return h('div', { class: 'of-calendar-month-row' },
                [
                    h('div',
                        {
                            class: 'of-calendar-gutter of-week-number',
                            onClick: (event: any) => {
                                this.$emit('click:week', event, wn, firstDay)
                            }
                        }, wnSlot ? wnSlot(wn) : wn),
                    rowDays.map(this.renderRowDay)
                ]
            )
        },
        renderGrid() {
            const fm = firstMonday(this.day)
            const style = this.fixedRowHeight ? { '--of-month-day-heigth': '' + (this.eventHeightNumber * this.eventsLimitNumber) + 'px' } : {}
            return h('div', { class: 'of-calendar-month-grid', style }, [
                h('div', { class: 'of-calendar-day-titles' }, [
                    h('div', { class: 'of-calendar-gutter' }),
                    Array.from({ length: 7 }, (_, i) => {
                        return h('div', { class: 'of-calendar-category-title' },
                            h('div', { class: 'of-calendar-day-title' },
                                this.renderWeekDay(addDays(fm, i))
                            ))
                    })
                ]),
                this.monthGrid.grid.map(this.renderRow)
            ])
        }
    },
    render() {
        return h('div',
            {
                class: "container",
                style: {
                    "--of-event-height": `${this.eventHeightNumber}px`,
                },
                onSelectStart(e: Event) {
                    e.preventDefault()
                },
            },
            [
                this.header(),
                this.renderGrid(),
            ]
        )
    },
})