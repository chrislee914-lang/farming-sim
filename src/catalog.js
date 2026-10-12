export const products = [
  {
    id: "rose-atelier",
    name: "Rose Atelier",
    price: 14,
    family: "Floral",
    notes: "Damask rose & geranium leaf",
    badge: "Bestseller",
    balm: "#e7a0ab",
    deep: "#8d3546",
    description:
      "A true rose, not a candy one. Damask petals and geranium leaf melt into cocoa butter so lips feel dressed, never waxy.",
    ingredients:
      "Beeswax, cocoa butter, sunflower oil, castor oil, rose absolute, geranium leaf, vitamin E.",
  },
  {
    id: "honey-meadow",
    name: "Honey Meadow",
    price: 14,
    family: "Floral",
    notes: "Wildflower honey & calendula",
    balm: "#e8b15a",
    deep: "#8a5a22",
    description:
      "Golden and a little sticky-sweet in the best way. Calendula and honey soften winter cracks and leave a warm sheen.",
    ingredients:
      "Beeswax, wildflower honey, calendula-infused oil, shea butter, vanilla bean, vitamin E.",
  },
  {
    id: "mint-after-rain",
    name: "Mint After Rain",
    price: 14,
    family: "Herbal",
    notes: "Peppermint & cucumber peel",
    balm: "#8fcec4",
    deep: "#24685e",
    description:
      "A cool slip of green. Peppermint wakes a tired mouth without the sting of a medicated stick.",
    ingredients:
      "Beeswax, cocoa butter, jojoba, peppermint essential oil, cucumber extract, vitamin E.",
  },
  {
    id: "orchard-vanilla",
    name: "Orchard Vanilla",
    price: 14,
    family: "Herbal",
    notes: "Madagascar vanilla & sweet almond",
    badge: "Everyday",
    balm: "#f0ddc2",
    deep: "#8c6a45",
    description:
      "Creamy, quiet, and faintly edible. The tin that lives in a coat pocket and gets used without thinking.",
    ingredients:
      "Beeswax, sweet almond oil, shea butter, Madagascar vanilla, cocoa butter, vitamin E.",
  },
  {
    id: "blood-orange",
    name: "Blood Orange Grove",
    price: 14,
    family: "Citrus",
    notes: "Blood orange & bergamot",
    balm: "#f0a07a",
    deep: "#a84b2f",
    description:
      "Bright, bitter-peel citrus. Smells like a Saturday market and looks like a slice of late sun.",
    ingredients:
      "Beeswax, apricot kernel oil, blood orange oil, bergamot, candelilla wax, vitamin E.",
  },
  {
    id: "lavender-dusk",
    name: "Lavender Dusk",
    price: 14,
    family: "Herbal",
    notes: "Lavender & chamomile",
    badge: "Evening",
    balm: "#cbb6e6",
    deep: "#5d4a86",
    description:
      "The bedside tin. Soft purple, herbal, and blended to be the last thing you put on before the light goes.",
    ingredients:
      "Beeswax, chamomile-infused oil, lavender essential oil, mango butter, vitamin E.",
  },
]

export const bundles = [
  {
    id: "morning-trio",
    name: "The Morning Trio",
    price: 36,
    compareAt: 42,
    family: "Set",
    notes: "Rose, honey, and vanilla",
    includes: ["rose-atelier", "honey-meadow", "orchard-vanilla"],
    description:
      "Three tins for the start of the day: Rose Atelier, Honey Meadow, and Orchard Vanilla. A six-dollar saving against buying them one by one.",
    ingredients: "Three full-size tins, 0.15 oz each. Wrapped together in paper.",
  },
  {
    id: "garden-six",
    name: "The Garden Six",
    price: 72,
    compareAt: 84,
    family: "Set",
    notes: "Every tin in the atelier",
    badge: "The full garden",
    includes: products.map((product) => product.id),
    description:
      "The whole collection, poured and labeled as a set. Six scents, twelve dollars less than the shelf price.",
    ingredients: "Six full-size tins, 0.15 oz each.",
  },
]

export const catalog = [...products, ...bundles]

export function findItem(id) {
  return catalog.find((item) => item.id === id)
}

export const FAMILIES = ["All", "Floral", "Herbal", "Citrus"]

export const SHIPPING_THRESHOLD = 40
export const SHIPPING_FLAT = 5
