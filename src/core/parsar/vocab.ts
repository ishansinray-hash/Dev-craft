export type Domain = "tailor" | "baker" | "electrician" | "tiffin";

// Regex pattern to detect references to previous orders
// Matches patterns like: pichli baar, last time, pichla order, etc.
export const PRIOR_ORDER = /\b(pichli|pichla|pichle|pichla|last|previous)\s+(baar|time|order|wala|order)\b/i;

// Blocking attributes by domain - attributes that are essential to fulfill an order
// If these attributes are missing from ALL items, needs_clarification should be true
export const BLOCKING: Partial<Record<Domain, string>> = {
  baker: "flavour",
  electrician: "issue",
};

// Extended vocabulary mapping with synonyms
export const ITEM_SYNONYMS: Record<string, string[]> = {
  // Tailor items
  "kurti": ["kurta", "kurti", "kurthy"],
  "shirt": ["shirt", "shir"],
  "pant": ["pant", "pants", "pajama", "trousers"],
  "jeans": ["jeans", "jean"],
  "saree": ["saree", "sari", "saaree"],
  "salwar": ["salwar", "salwal"],
  "dupatta": ["dupatta", "dupata", "scarf"],
  "blouse": ["blouse", "choli"],
  "skirt": ["skirt", "ghagra"],
  "dress": ["dress", "frock"],
  // Baker items
  "cake": ["cake", "pastry"],
  "bread": ["bread", "loaf"],
  "cookie": ["cookie", "biscuit"],
  // General
  "fabric": ["fabric", "cloth", "kapda"],
};

// Color patterns and mapping
export const COLOR_PATTERNS: Record<string, string> = {
  "black": "black",
  "kala": "black",
  "white": "white",
  "safed": "white",
  "red": "red",
  "lal": "red",
  "blue": "blue",
  "neela": "blue",
  "green": "green",
  "hara": "green",
  "yellow": "yellow",
  "peela": "yellow",
  "navy": "navy",
  "gray": "gray",
  "grey": "gray",
  "pink": "pink",
  "gulabi": "pink",
  "purple": "purple",
  "brown": "brown",
  "cream": "cream",
};
