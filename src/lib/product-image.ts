// Product cards get a calm water photo. The photo follows the product's position in creation order (oldest first),
// so the first four products always look different and a product keeps its photo when newer ones are added.
const PRODUCT_IMAGES = ['/images/cove.jpg', '/images/wave.jpg', '/images/dusk.jpg', '/images/lake.jpg']

export function productImage(rank: number): string {
  return PRODUCT_IMAGES[rank % PRODUCT_IMAGES.length]
}

/** Position of a product among the user's products, oldest first. */
export function productRank(products: { _id: string; _creationTime: number }[], productId: string): number {
  const ordered = [...products].sort((a, b) => a._creationTime - b._creationTime)
  return Math.max(0, ordered.findIndex((product) => product._id === productId))
}
