// The skin concerns we request from YouCam and let users target with a product.
// Keys are YouCam's `type` names (see docs/youcam-api-notes.md). The list is the only place to change it:
// the scan backend requests exactly these, and the product form offers exactly these.
// Cost per photo depends on how many are requested (see unitsPerPhoto in scan/scan-config.ts).
export const CONCERNS = {
  acne: { label: 'Acne', hint: 'Pimples and breakouts' },
  redness: { label: 'Redness', hint: 'Red or irritated skin' },
  pore: { label: 'Pores', hint: 'Visible pores' },
  texture: { label: 'Texture', hint: 'Roughness and bumpiness' },
  oiliness: { label: 'Oiliness', hint: 'Shine and excess oil' },
  moisture: { label: 'Moisture', hint: 'How hydrated the skin looks' },
  radiance: { label: 'Radiance', hint: 'Glow and brightness' },
  dark_circle_v2: { label: 'Dark circles', hint: 'Darkness under the eyes' },
} as const

export type ConcernKey = keyof typeof CONCERNS

export const CONCERN_KEYS = Object.keys(CONCERNS) as ConcernKey[]

export function isConcernKey(value: string): value is ConcernKey {
  return Object.hasOwn(CONCERNS, value)
}
