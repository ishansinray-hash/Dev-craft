import { Domain } from "./vocab.js";
import { normalize } from "./normalize.js";
import { ITEM_SYNONYMS, COLOR_PATTERNS } from "./vocab.js";

export interface Item {
  description: string;
  quantity: number;
  attributes: Record<string, string | number | boolean>;
}

// Hindi numerals mapping with extended range
const HINDI_NUMERALS: Record<string, number> = {
  "ek": 1, "do": 2, "teen": 3, "char": 4, "paanch": 5,
  "chhe": 6, "saat": 7, "aath": 8, "nau": 9, "das": 10,
  "gyarah": 11, "barah": 12, "tera": 13, "chaudah": 14,
  "pandrah": 15, "solah": 16, "satrah": 17, "athrah": 18,
  "unnis": 19, "bees": 20, "tees": 30, "chalis": 40, "pachas": 50,
};

// Common item vocabularies by domain - expanded
const DOMAIN_ITEMS: Record<Domain, string[]> = {
  tailor: [
    "kurti", "kurta", "shirt", "pant", "jeans", "suit", "dress", "skirt", "blouse",
    "saree", "salwar", "kameez", "fabric", "cloth", "kapda", "pajama", "pyjama",
    "trouser", "top", "dupatta", "dupata", "ghagra", "lehenga", "sherwani",
    "safari suit", "jacket", "coat", "blazer", "churidar", "frock", "t-shirt", "tshirt",
    "choli", "chunni", "odhani", "vest", "waistcoat", "bottom"
  ],
  baker: ["cake", "bread", "cookie", "cupcake", "pastry", "bun", "loaf", "donut", "brownie", "biscuit", "samosa"],
  electrician: ["socket", "switch", "wire", "wiring", "fuse", "breaker", "light", "bulb", "fan", "meter", "cable", "conduit", "panel", "transformer"],
  tiffin: ["meal", "lunch", "dinner", "breakfast", "tiffin", "khana", "food", "sabzi", "rice", "roti", "dal", "curry"],
};

// Common stop words to skip when extracting item names
const STOP_WORDS = new Set([
  "ke", "ka", "ki", "me", "mein", "tak", "se", "ko", "par", "pe", "le", "lo", "aur", "and",
  "or", "ya", "h", "hai", "hain", "ho", "the", "tha", "thi", "chahiye", "chahte", "do",
  "color", "colour", "colors", "colours", "rang", "shade", "chest", "waist", "length", "size",
  "kamar", "lambai", "fit", "slim", "urgent", "urgently", "advance", "diya", "dena", "wali",
  "wala", "wale", "liye", "bhi", "ekdam", "pure", "purely", "fabric", "material", "inch", "in"
]);

// Honorifics and greetings that should not be treated as items
const HONORIFICS = new Set([
  "didi", "bhaiya", "bhai", "ji", "aunty", "uncle", "behen", "beta",
  "sir", "madam", "saab", "sahib", "begum", "mummy", "daddy",
]);

// Extract quantity from text and return the value and the remaining text
function extractQuantity(text: string): [number, string] {
  // First try Hindi numerals at word boundary
  const hindiMatch = text.match(/\b(ek|do|teen|char|paanch|chhe|saat|aath|nau|das|gyarah|barah|tees|chalis|pachas)\s+/i);
  if (hindiMatch) {
    const quantity = HINDI_NUMERALS[hindiMatch[1].toLowerCase()] || 1;
    const remaining = text.replace(hindiMatch[0], "");
    return [quantity, remaining];
  }
  
  // Try Arabic numerals (including at start or middle of text)
  const numberMatch = text.match(/\b(\d+)\s+/);
  if (numberMatch) {
    const quantity = parseInt(numberMatch[1], 10);
    const remaining = text.slice(0, numberMatch.index) + text.slice((numberMatch.index || 0) + numberMatch[0].length);
    return [quantity, remaining.trim()];
  }
  
  return [1, text];
}

// Find best matching canonical item name from vocabulary
function findCanonicalItemName(text: string, domain: Domain): string | null {
  const normalized = text.toLowerCase();
  const itemList = DOMAIN_ITEMS[domain] || [];
  
  // First check synonyms mapping (check longer matches first)
  for (const [canonical, synonyms] of Object.entries(ITEM_SYNONYMS)) {
    for (const synonym of synonyms) {
      const re = new RegExp(`\\b${synonym}\\b`, "i");
      if (re.test(normalized)) {
        return canonical;
      }
    }
  }

  // Then check canonical list
  for (const item of itemList) {
    const re = new RegExp(`\\b${item}\\b`, "i");
    if (re.test(normalized)) {
      return item;
    }
  }
  
  return null;
}

// Extract item description from text
function extractItemDescription(text: string, domain: Domain): string | null {
  const normalized = normalize(text).toLowerCase();
  
  // Try to find canonical item name first
  const canonical = findCanonicalItemName(normalized, domain);
  if (canonical) {
    return canonical;
  }
  
  // If no known item found, try to extract meaningful words
  const words = normalized.split(/\s+/).filter(w => w.length > 0);
  if (words.length > 0) {
    // Return first meaningful word that isn't a stop word, honorific, number, or color keyword
    for (const word of words) {
      if (!STOP_WORDS.has(word) && !HONORIFICS.has(word) && !/^\d+$/.test(word) && !COLOR_PATTERNS[word]) {
        return word;
      }
    }
  }
  
  return null;
}

// Extract attributes from text with enhanced detection
function extractAttributes(text: string, domain: Domain): Record<string, string | number | boolean> {
  const attributes: Record<string, string | number | boolean> = {};
  const normalized = normalize(text).toLowerCase();
  
  // Universal attribute extraction
  // Look for colors (check longest keys first)
  const sortedColors = Object.entries(COLOR_PATTERNS).sort((a, b) => b[0].length - a[0].length);
  for (const [colorKey, colorValue] of sortedColors) {
    const re = new RegExp(`\\b${colorKey}\\b`, "i");
    if (re.test(normalized)) {
      attributes["color"] = colorValue;
      break;
    }
  }
  
  // Domain-specific attribute extraction
  if (domain === "tailor") {
    // Look for measurements: chest, waist, length, etc. (both "chest 42" and "42 chest")
    const chestMatch = normalized.match(/\b(?:chest|size)\s*[:=-]?\s*(\d+)\b/i) ||
                       normalized.match(/\b(\d+)\s*(?:inch|in)?\s*(?:ki\s+|ka\s+)?chest\b/i);
    if (chestMatch) {
      attributes["chest"] = parseInt(chestMatch[1], 10);
    }
    
    const waistMatch = normalized.match(/\b(?:waist|kamar)\s*[:=-]?\s*(\d+)\b/i) ||
                       normalized.match(/\b(\d+)\s*(?:inch|in)?\s*(?:ki\s+|ka\s+)?(?:waist|kamar)\b/i);
    if (waistMatch) {
      attributes["waist"] = parseInt(waistMatch[1], 10);
    }
    
    const lengthMatch = normalized.match(/\b(?:length|lambai)\s*[:=-]?\s*(\d+)\b/i) ||
                        normalized.match(/\b(\d+)\s*(?:inch|in)?\s*(?:ki\s+|ka\s+)?(?:length|lambai)\b/i);
    if (lengthMatch) {
      attributes["length"] = parseInt(lengthMatch[1], 10);
    }
    
    // Look for fit types
    if (/\b(slim|tight|snug|close|fitted)\b/.test(normalized)) attributes["fit"] = "slim";
    if (/\b(loose|relaxed|comfort|baggy)\b/.test(normalized)) attributes["fit"] = "loose";
    if (/\b(regular|normal|standard)\b/.test(normalized)) attributes["fit"] = "regular";
  }
  
  if (domain === "baker") {
    // Look for flavors - expanded list
    const flavors = [
      "chocolate", "vanilla", "strawberry", "red velvet", "carrot", "lemon", "coffee", "mango",
      "elaichi", "pista", "almond", "coconut", "butterscotch", "black forest"
    ];
    for (const flavor of flavors) {
      if (normalized.includes(flavor)) {
        attributes["flavour"] = flavor;
        break;
      }
    }
    
    // Look for size
    const sizeMatch = normalized.match(/\b(small|medium|large|xl|half\s*kg|1\s*kg|2\s*kg)\b/i);
    if (sizeMatch) attributes["size"] = sizeMatch[1];
  }
  
  if (domain === "electrician") {
    // Look for issues and problems
    const issues = [
      "fuse blown", "fuse", "short circuit", "no power", "flickering", "sparking",
      "tripping", "burning", "shock", "overload"
    ];
    for (const issue of issues) {
      if (normalized.includes(issue)) {
        attributes["issue"] = issue;
        break;
      }
    }
    
    // Look for brands - expanded
    const brands = [
      "havells", "anchor", "polycab", "usha", "bajaj", "crompton", "philips",
      "siemens", "godrej", "legrand", "hager", "schneider"
    ];
    for (const brand of brands) {
      if (normalized.includes(brand)) {
        attributes["brand"] = brand;
        break;
      }
    }
  }
  
  return attributes;
}

// Split text into item phrases more intelligently
function splitIntoPhrases(text: string): string[] {
  // First try to split by common separators (aur, and, +, ;, newlines)
  // Commas are kept if part of attribute listings, or split if introducing a distinct garment
  let phrases = text.split(/[\n;+]|\baur\b|\band\b/i);
  
  // Filter and clean phrases
  phrases = phrases
    .map(p => p.trim())
    .filter(p => p.length > 0);
  
  return phrases;
}

// Main extraction function
export function extractItems(message: string, domain: Domain): Item[] {
  const items: Item[] = [];
  const normalized = normalize(message);
  
  // Split into major item phrases
  const itemPhrases = splitIntoPhrases(normalized);
  
  for (const phrase of itemPhrases) {
    if (phrase.length === 0) continue;
    
    // Check if phrase contains comma-separated sub-phrases
    const subPhrases = phrase.split(",").map(s => s.trim()).filter(Boolean);
    
    let currentItem: Item | null = null;
    
    for (const sub of subPhrases) {
      const canonical = findCanonicalItemName(sub, domain);
      const [quantity, remaining] = extractQuantity(sub);
      const attrs = extractAttributes(sub, domain);
      
      if (canonical) {
        // A new canonical garment item is introduced
        currentItem = {
          description: canonical,
          quantity: Math.max(1, quantity),
          attributes: { ...attrs },
        };
        items.push(currentItem);
      } else if (currentItem) {
        // Merge attributes into the active garment item
        Object.assign(currentItem.attributes, attrs);
      } else {
        // Fallback item description
        const fallbackDesc = extractItemDescription(remaining, domain);
        if (fallbackDesc) {
          currentItem = {
            description: fallbackDesc,
            quantity: Math.max(1, quantity),
            attributes: { ...attrs },
          };
          items.push(currentItem);
        }
      }
    }
  }
  
  return items.length > 0 ? items : [];
}
