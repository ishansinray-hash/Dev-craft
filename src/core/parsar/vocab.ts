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
  "kurta": ["kurta", "kurti", "kurthy", "kurtas", "kurtis"],
  "shirt": ["shirt", "shir", "shirts", "tshirt", "t-shirt", "t-shirts", "tshirts"],
  "pant": ["pant", "pants", "pajama", "pajamas", "pyjama", "pyjamas", "churidar", "trouser", "trousers", "bottom", "bottoms"],
  "jeans": ["jeans", "jean"],
  "saree": ["saree", "sari", "saaree", "saris", "sarees"],
  "salwar": ["salwar", "salwal", "salwars"],
  "dupatta": ["dupatta", "dupata", "scarf", "chunni", "odhani"],
  "blouse": ["blouse", "choli", "blouses"],
  "skirt": ["skirt", "ghagra", "skirts", "lehenga"],
  "dress": ["dress", "frock", "dresses", "frocks", "gown", "gowns"],
  "suit": ["suit", "suits", "safari suit", "safari suits", "sherwani", "bandhgala", "blazer", "coat", "waistcoat", "vest"],
  // Baker items
  "cake": ["cake", "pastry"],
  "bread": ["bread", "loaf"],
  "cookie": ["cookie", "biscuit"],
  // General
  "fabric": ["fabric", "cloth", "kapda", "than"],
};

// Color patterns and mapping (sorted/checked by key length)
export const COLOR_PATTERNS: Record<string, string> = {
  // Orange and rich variations
  "burnt orange": "orange",
  "light orange": "orange",
  "dark orange": "orange",
  "bright orange": "orange",
  "deep orange": "orange",
  "neon orange": "orange",
  "royal orange": "orange",
  "haldi orange": "orange",
  "orange colour": "orange",
  "orange color": "orange",
  "orange rang": "orange",
  "orange": "orange",
  "narangi": "orange",
  "naranji": "orange",
  "santri": "orange",
  "santara": "orange",
  "suntra": "orange",
  "santare": "orange",
  "kesari": "orange",
  "kesariya": "orange",
  "kesri": "orange",
  "keshari": "orange",
  "bhagwa": "orange",
  "bhagva": "orange",
  "gerua": "orange",
  "geru": "orange",
  "geruwan": "orange",
  "saffron": "orange",
  "tangerine": "orange",
  "amber": "orange",
  "apricot": "orange",
  "marigold": "orange",
  "zarda": "orange",
  "rust": "orange",
  "peach": "peach",
  "coral": "coral",

  // Blues and darks
  "navy blue": "navy blue",
  "royal blue": "royal blue",
  "sky blue": "sky blue",
  "light blue": "light blue",
  "dark blue": "dark blue",
  "blue": "blue",
  "neela": "blue",
  "nila": "blue",
  "navy": "navy",
  "cyan": "cyan",
  "firozi": "cyan",
  "firoza": "cyan",
  "turquoise": "turquoise",
  "teal": "teal",
  "indigo": "indigo",

  // Neutrals & Blacks
  "charcoal grey": "charcoal",
  "charcoal gray": "charcoal",
  "charcoal": "charcoal",
  "jet black": "black",
  "off white": "off white",
  "cream": "cream",
  "black": "black",
  "kala": "black",
  "kaala": "black",
  "white": "white",
  "safed": "white",
  "chitta": "white",
  "gray": "gray",
  "grey": "gray",
  "silver": "silver",
  "beige": "beige",
  "tan": "tan",
  "khaki": "khaki",

  // Reds and pinks
  "dark red": "red",
  "light red": "red",
  "blood red": "red",
  "crimson": "red",
  "red": "red",
  "lal": "red",
  "laal": "red",
  "baby pink": "pink",
  "hot pink": "pink",
  "pink": "pink",
  "gulabi": "pink",
  "rani pink": "magenta",
  "rani": "magenta",
  "magenta": "magenta",
  "maroon": "maroon",
  "marun": "maroon",
  "burgundy": "burgundy",
  "wine": "wine",

  // Greens
  "bottle green": "dark green",
  "dark green": "green",
  "light green": "green",
  "parrot green": "green",
  "olive green": "olive",
  "olive": "olive",
  "green": "green",
  "hara": "green",
  "mehendi": "green",
  "mehndi": "green",

  // Yellows and Golds
  "mustard yellow": "mustard",
  "mustard": "mustard",
  "bright yellow": "yellow",
  "light yellow": "yellow",
  "yellow": "yellow",
  "peela": "yellow",
  "pila": "yellow",
  "haldi": "yellow",
  "gold": "gold",
  "golden": "gold",
  "sunhera": "gold",

  // Purples
  "purple": "purple",
  "jamuni": "purple",
  "violet": "violet",
  "lavender": "lavender",
  "brown": "brown",
  "bhura": "brown",
  "badami": "beige",
};
