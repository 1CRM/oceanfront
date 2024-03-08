import { h, VNode } from 'vue'
import { Config, ConfigManager } from './config'
import { readonlyUnref } from './util'

export interface Icon {
  class?: string
  // component?: Component | string
  // props?: VNodeProps
  name?: string
  svg?: SvgIcon
  text?: string
}

export interface SvgIcon {
  effects?: SvgIconEffect[]
  paths: string[]
}

export interface IconMapping {
  [key: string]: Icon | string
}

export interface IconSet {
  name?: string
  requirePrefix?: boolean
  resolve(name: string, prefix?: string): Icon | string | null
}

const ledIcon = [
  'M 2 12 a 10,10 0 1,0 20,0 a 10,10 0 1,0 -20,0',
  'M 4 12 a 8,8 0 1,0 16,0 a 8,8 0 1,0 -16,0'
]

const ledIconSet = {
  name: 'led',
  resolve(name: string, type?: string): Icon | string | null {
    if (name && type) {
      return {
        class: 'of--icon-led of--led-' + name,
        svg: { paths: [...ledIcon] }
      }
    }
    return null
  }
}

class IconManager {
  sets: IconSet[]
  setsNamed: { [name: string]: IconSet }
  effectsNamed: { [name: string]: SvgIconEffect }
  showMissing = false

  constructor() {
    this.sets = []
    this.setsNamed = { [ledIconSet.name]: ledIconSet }
    this.effectsNamed = { [plusEffect.name]: plusEffect }
  }

  resolveIcon(
    name?: string,
    options?: { effect?: string; type?: string }
  ): Icon | null {
    if (typeof name !== 'string') return null
    let result
    const spp = name.indexOf(' ')
    const type = options && options.type
    const pfx = type || (spp !== -1 ? name.substring(0, spp) : null)
    if (pfx && pfx in this.setsNamed) {
      const sfx = type ? name : name.substring(spp + 1)
      result = this.setsNamed[pfx].resolve(sfx, pfx)
    }
    if (!result && !type) {
      for (const set of this.sets) {
        result = set.resolve(name)
        if (result) break
      }
    }
    if (typeof result === 'string') {
      if (result === name) {
        result = null // prevent loop
      } else {
        return this.resolveIcon(result)
      }
    }
    if (!result && this.showMissing) {
      result = { text: 'xx' }
    }
    if (result && result.svg && options?.effect) {
      const effect = this.effectsNamed[options.effect]
      if (effect) {
        if (!result.svg.effects) {
          result.svg.effects = []
        }
        result.svg.effects.push(effect)
      }
    }
    return result || null
  }
}

const configManager = new ConfigManager('oficon', IconManager)

export function registerSvgIconEffect(effect: SvgIconEffect): void {
  if (!effect) return
  const mgr = configManager.extendingManager
  const name = effect.name
  if (name) {
    mgr.effectsNamed[name] = effect
  }
}

export function registerIconSet(set: IconSet): void {
  if (!set) return
  const mgr = configManager.extendingManager
  const name = set.name
  if (name) {
    mgr.setsNamed[name] = set
  }
  if (!set.requirePrefix) {
    mgr.sets.push(set)
  }
}

export function showMissingIcons(flag?: boolean): void {
  if (flag === undefined) flag = true
  configManager.extendingManager.showMissing = flag
}

export function useIcons(config?: Config): IconManager {
  const mgr = configManager.inject(config)
  return readonlyUnref(mgr)
}

const svgAttrs = {
  xmlns: 'http://www.w3.org/2000/svg',
  width: '24px',
  height: '24px',
  role: 'img',
  'aria-hidden': true,
  viewBox: '0 0 24 24'
}

export interface SvgIconEffect {
  name: string
  render(): SvgIconEffectRender
}

interface SvgIconEffectRender {
  nodes?: VNode[]
  mask?: VNode[]
}

const maskCircle = h('circle', {
  cx: '18',
  cy: '18',
  r: '6px',
  fill: 'rgb(50, 50, 50)'
})

const plusEffect = {
  name: 'plus',
  render(): SvgIconEffectRender {
    return {
      mask: [maskCircle],
      nodes: [
        h('rect', {
          x: '17',
          y: '13',
          width: '2px',
          height: '10px',
          rx: '1px'
        }),
        h('rect', {
          x: '13',
          y: '17',
          width: '10px',
          height: '2px',
          rx: '1px'
        })
      ]
    }
  }
}

export const renderSvgIcon = (icon: SvgIcon): VNode => {
  const mask = []
  const nodes = []
  if (icon.effects) {
    for (const eff of icon.effects) {
      const extra = eff.render()
      if (extra.mask) {
        mask.push(h('g', { class: 'm', id: eff.name }, extra.mask))
      }
      if (extra.nodes) {
        nodes.push(h('g', { class: 'o', id: eff.name }, extra.nodes))
      }
    }
  }
  nodes.unshift(
    h(
      'g',
      { class: 'i', mask: mask.length ? 'url(#m)' : undefined },
      icon.paths.map((path, idx) => {
        const alt = idx == icon.paths.length - 2
        const pri = idx == icon.paths.length - 1
        const attrs: Record<string, any> = {
          class: { pri, alt },
          d: path
        }
        if (alt) attrs.opacity = '0.3'
        return h('path', attrs)
      })
    )
  )
  if (mask.length) {
    nodes.unshift(
      h('mask', { id: 'm' }, [
        h('rect', {
          x: '0',
          y: '0',
          width: '100%',
          height: '100%',
          fill: 'white'
        }),
        ...mask
      ])
    )
  }
  return h('svg', svgAttrs, nodes)
}
