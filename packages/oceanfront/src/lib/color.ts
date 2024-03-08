export const hexToRgb = function (
  color: string
): { r: number; g: number; b: number; a?: number } | null {
  if (!color) {
    throw new TypeError('Invalid color value')
  }
  color = color.toLowerCase().replace(/\s/g, '')
  if (color === 'transparent') {
    return { r: 0, g: 0, b: 0, a: 0 }
  }
  const cmatch = color.match(/^#([0-9a-f]{3,8})$/)
  if (cmatch) {
    let hex = cmatch[1]
    if (hex.length <= 4) {
      hex =
        hex[0] +
        hex[0] +
        hex[1] +
        hex[1] +
        hex[2] +
        hex[2] +
        (hex[3] !== undefined ? hex[3] + hex[3] : 'ff')
    } else if (hex.length === 5) {
      hex += hex[4] + 'ff'
    } else if (hex.length === 6) {
      hex += 'ff'
    } else if (hex.length === 7) {
      hex += hex[6]
    }
    const cval = parseInt(hex, 16)
    return {
      r: (cval >> 24) & 255,
      g: (cval >> 16) & 255,
      b: (cval >> 8) & 255,
      a: (cval & 255) / 255
    }
  }
  const rgbm = color.match(/^rgba?\((\d+),(\d+),(\d+)(?:,(\d+\.?\d*|\.\d+))\)$/)
  if (rgbm) {
    return {
      r: parseInt(rgbm[1] || '255', 10),
      g: parseInt(rgbm[2] || '255', 10),
      b: parseInt(rgbm[3] || '255', 10),
      a: rgbm[4] !== undefined ? parseFloat(rgbm[4]) : 1
    }
  }
  return null
}

const hexp = (val: number): string => {
  const v = val.toString(16)
  return v.length == 1 ? '0' + v : v
}

export const rgbToHex = function (color: {
  r: number
  g: number
  b: number
  a?: number
}): string {
  const a = color.a
  return (
    '#' +
    hexp(color.r) +
    hexp(color.g) +
    hexp(color.b) +
    (a !== undefined && a !== 1 ? hexp(Math.round(a * 255)) : '')
  )
}

let colorCtx: CanvasRenderingContext2D
export const loadColor = function (
  color: string
): { r: number; g: number; b: number; a?: number } | null {
  if (!color) return null
  const found = hexToRgb(color)
  if (found) {
    return found
  }
  // try converting html color name or HSL(a)
  color = color.toLowerCase().replace(/\s/, '')
  if (!colorCtx)
    colorCtx = document
      .createElement('canvas')
      .getContext('2d') as CanvasRenderingContext2D
  else {
    // reset any previous input
    colorCtx.fillStyle = '#000'
  }
  colorCtx.fillStyle = color
  const fstyle = colorCtx.fillStyle
  if (fstyle === '#000000' && color !== 'black') {
    // probable invalid color (FIXME for hsl(0,0,0))
    throw new TypeError('Invalid color value')
  }
  return hexToRgb(fstyle)
}

export const rgbToHsv = function (color: {
  r: number
  g: number
  b: number
  a?: number
}): {
  h: number
  s: number
  v: number
  a?: number
} {
  const r = Math.max(0, Math.min(255, color.r))
  const g = Math.max(0, Math.min(255, color.g))
  const b = Math.max(0, Math.min(255, color.b))
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)

  const d = max - min
  const ret = { h: 0, s: max === 0 ? 0 : d / max, v: max / 255, a: color.a }

  if (d !== 0) {
    let h
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    ret.h = Math.round(h * 60)
  }
  return ret
}

export const hsvToRgb = function (color: {
  h: number
  s: number
  v: number
  a?: number
}): {
  r: number
  g: number
  b: number
  a?: number
} {
  const h = Math.max(0, Math.min(360, color.h)) / 60
  const s = Math.max(0, Math.min(1, color.s))
  const v = Math.max(0, Math.min(1, color.v))

  let ret
  if (s === 0) {
    ret = { r: v, g: v, b: v, a: color.a }
  } else {
    const i = Math.floor(h)
    const f = h - i
    const p = v * (1 - s)
    const q = v * (1 - s * f)
    const t = v * (1 - s * (1 - f))

    if (i === 0) ret = { r: v, g: t, b: p }
    else if (i === 1) ret = { r: q, g: v, b: p }
    else if (i === 2) ret = { r: p, g: v, b: t }
    else if (i === 3) ret = { r: p, g: q, b: v }
    else if (i === 4) ret = { r: t, g: p, b: v }
    else ret = { r: v, g: p, b: q }
  }

  ret.r = Math.round(ret.r * 255)
  ret.g = Math.round(ret.g * 255)
  ret.b = Math.round(ret.b * 255)
  ret.a = color.a
  return ret
}

export const hslToRgb = function (color: {
  h: number
  s: number
  l: number
  a?: number
}): {
  r: number
  g: number
  b: number
  a?: number
} {
  const ret = { r: 0, g: 0, b: 0, a: color.a }

  const k = (n: number) => (n + color.h / 30) % 12
  const a = color.s * Math.min(color.l, 1 - color.l)
  const f = (n: number) =>
    color.l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))

  ret.r = 255 * f(0)
  ret.g = 255 * f(8)
  ret.b = 255 * f(4)
  ret.a = color.a

  return ret
}

export const hsvToHsl = function (color: {
  h: number
  s: number
  v: number
  a?: number
}): {
  h: number
  s: number
  l: number
  a?: number
} {
  const v = color.v
  const l = v - (v * color.s) / 2
  const m = Math.min(l, 1 - l)
  return { h: color.h, s: m ? (v - l) / m : 0, l, a: color.a }
}
