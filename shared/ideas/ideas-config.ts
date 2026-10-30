import type { ConcernKey } from '../concerns'

// "Ideas to test" (issue #41, feature 1). A short, hand-written list of ingredient FAMILIES that people commonly
// try for each concern. Rules for editing it:
//  - No brands (it would look like an ad) and nothing written by an AI model.
//  - No prescription or drug-like ingredients (retinoids, benzoyl peroxide, antibiotics ...).
//  - `for` is one plain, modest sentence. Say "often used for", never "treats" or "fixes".
export type Idea = { name: string; for: string }
export type ConcernIdeas = { ideas: Idea[]; /** Shown under the ideas when the concern is hard to change with a product. */ note?: string }

export const IDEAS_CONFIG = {
  /** How many of the lowest-scoring concerns get a block. */
  maxConcerns: 3,
  /** How many ideas per concern. */
  maxIdeasPerConcern: 3,
}

export const IDEAS: Record<ConcernKey, ConcernIdeas> = {
  acne: {
    ideas: [
      { name: 'Salicylic acid (BHA)', for: 'Exfoliates inside the pore' },
      { name: 'Niacinamide', for: 'Often used to balance oil and calm skin' },
      { name: 'Azelaic acid', for: 'Often used for breakouts and the marks they leave' },
    ],
  },
  redness: {
    ideas: [
      { name: 'Centella (cica)', for: 'A soothing plant extract in many calming products' },
      { name: 'Azelaic acid', for: 'Often used for redness and uneven tone' },
      { name: 'Panthenol (vitamin B5)', for: 'Supports the skin barrier and comfort' },
    ],
  },
  pore: {
    ideas: [
      { name: 'Niacinamide', for: 'Often used for the look of pores and oil' },
      { name: 'Salicylic acid (BHA)', for: 'Exfoliates inside the pore' },
      { name: 'Clay', for: 'Absorbs surface oil' },
    ],
  },
  texture: {
    ideas: [
      { name: 'Lactic acid (AHA)', for: 'A mild exfoliating acid for smoother skin' },
      { name: 'PHA (gentle acids)', for: 'Exfoliates more gently than other acids' },
      { name: 'Urea', for: 'Softens rough, dry patches' },
    ],
  },
  oiliness: {
    ideas: [
      { name: 'Niacinamide', for: 'Often used to balance oil' },
      { name: 'Zinc PCA', for: 'Used in oil-control products' },
      { name: 'Clay', for: 'Absorbs surface oil' },
    ],
  },
  moisture: {
    ideas: [
      { name: 'Hyaluronic acid', for: "Draws water into the skin's surface" },
      { name: 'Ceramides', for: "Support the skin's moisture barrier" },
      { name: 'Glycerin', for: 'A simple, widely used humectant' },
    ],
  },
  radiance: {
    ideas: [
      { name: 'Vitamin C', for: 'Often used for a brighter look' },
      { name: 'Niacinamide', for: 'Often used for an even-looking tone' },
      { name: 'Lactic acid (AHA)', for: 'A mild exfoliating acid for a fresher surface' },
    ],
  },
  dark_circle_v2: {
    ideas: [
      { name: 'Caffeine', for: 'Common in eye creams for puffiness and tired-looking eyes' },
      { name: 'Vitamin C', for: 'Often used for a brighter look' },
      { name: 'Niacinamide', for: 'Often used for an even-looking tone' },
    ],
    note: 'Dark circles depend a lot on sleep, genetics and shadows, so a product may change them very little.',
  },
}
