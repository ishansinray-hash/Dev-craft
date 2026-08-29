import { Domain } from "./vocab.js";
import { normalize } from "./normalize.js";

export interface Item {
  description: string;
  quantity: number;
  attributes: Record<string, string | number | boolean>;
}

// Hindi numerals mapping
const HINDI_NUMERALS: Record<string, number> = {
  "ek": 1, "do": 2, "teen": 3, "char": 4, "paanch": 5,
  "chhe": 6, "saat": 7, "aath": 8, "nau": 9, "das": 10,
  "gyarah": 11, "barah": 12, "tera": 13, "chaudah": 14,
  "pandrah": 15, "solah": 16, "satrah": 17, "athrah": 18,
  "unnis": 19, "bees": 20,
};

// Common item vocabularies by domain
const DOMAIN_ITEMS: Record<Domain, string[]> = {
  tailor: ["kurta", "shirt", "pant", "suit", "dress", "skirt", "blouse", "saree", "salwar", "kameez", "fabric", "cloth", "kapda", "pajama", "trouser", "top", "dupatta"],
  baker: ["cake", "bread", "cookie", "cupcake", "pastry", "cake", "bun", "loaf", "donut", "brownie"],
  electrician: ["socket", "switch", "wire", "wiring", "fuse", "breaker", "light", "bulb", "fan", "meter", "cable", "conduit"],
  tiffin: ["meal", "lunch", "dinner", "breakfast", "tiffin", "khana", "food", "sabzi", "rice", "roti", "dal"],
};

// Extract quantity from text and return the value and the remaining text
function extractQuantity(text: string): [number, string] {
  // Try to match patterns like "2 kurta", "teen pajama", etc.
  
  // First try Hindi numerals
  const hindiMatch = text.match(/\b(ek|do|teen|char|paanch|chhe|saat|aath|nau|das|gyarah|barah)\s+/i);
  if (hindiMatch) {
    const quantity = HINDI_NUMERALS[hindiMatch[1].toLowerCase()] || 1;
    const remaining = text.replace(hindiMatch[0], "");
    return [quantity, remaining];
  }
  
  // Try Arabic numerals
  const numberMatch = text.match(/^(\d+)\s+/);
  if (numberMatch) {
    const quantity = parseInt(numberMatch[1], 10);
    const remaining = text.replace(numberMatch[0], "");
    return [quantity, remaining];
  }
  
  return [1, text];
}

// Extract item description from text
function extractItemDescription(text: string, domain: Domain): string | null {
  const normalized = normalize(text).toLowerCase();
  const itemList = DOMAIN_ITEMS[domain] || [];
  
  // Look for exact or partial matches of known items in the domain
  for (const item of itemList) {
    if (normalized.includes(item)) {
      return item;
    }
  }
  
  // If no known item found, try to extract the first few words as item description
  const words = normalized.split(/\s+/);
  if (words.length > 0) {
    // Return first 1-2 words as item description if they're not common modifiers
    for (let i = 0; i < Math.min(2, words.length); i++) {
      const word = words[i];
      // Skip common prepositions and particles
      if (!["ke", "ka", "ki", "me", "mein", "tak", "se", "ko", "par", "pe", "le", "lo"].includes(word)) {
        return word;
      }
    }
  }
  
  return null;
}

// Extract attributes from text (simplified)
function extractAttributes(text: string, domain: Domain): Record<string, string | number | boolean> {
  const attributes: Record<string, string | number | boolean> = {};
  const normalized = normalize(text).toLowerCase();
  
  // Domain-specific attribute extraction
  if (domain === "tailor") {
    // Look for measurements: chest, waist, length, etc.
    const chestMatch = normalized.match(/chest\s+(\d+)/i);
    if (chestMatch) attributes["chest"] = parseInt(chestMatch[1], 10);
    
    const waistMatch = normalized.match(/waist\s+(\d+)/i);
    if (waistMatch) attributes["waist"] = parseInt(waistMatch[1], 10);
    
    const lengthMatch = normalized.match(/length\s+(\d+)/i);
    if (lengthMatch) attributes["length"] = parseInt(lengthMatch[1], 10);
    
    // Look for colors
    const colors = ["black", "white", "red", "blue", "green", "yellow", "navy", "dark", "light", "pink", "purple"];
    for (const color of colors) {
      if (normalized.includes(color)) {
        attributes["color"] = color;
        break;
      }
    }
  }
  
  if (domain === "baker") {
    // Look for flavors
    const flavors = ["chocolate", "vanilla", "strawberry", "red velvet", "carrot", "lemon", "coffee", "mango"];
    for (const flavor of flavors) {
      if (normalized.includes(flavor)) {
        attributes["flavour"] = flavor;
        break;
      }
    }
  }
  
  if (domain === "electrician") {
    // Look for issues and brands
    const issues = ["fuse blown", "short circuit", "no power", "flickering", "sparking"];
    for (const issue of issues) {
      if (normalized.includes(issue)) {
        attributes["issue"] = issue;
        break;
      }
    }
    
    const brands = ["havells", "anchor", "polycab", "usha", "bajaj", "crompton"];
    for (const brand of brands) {
      if (normalized.includes(brand)) {
        attributes["brand"] = brand;
        break;
      }
    }
  }
  
  return attributes;
}

// Main extraction function
export function extractItems(message: string, domain: Domain): Item[] {
  const items: Item[] = [];
  const normalized = normalize(message);
  
  // Split by common separators (commas, "aur" (and), etc.)
  const itemPhrases = normalized.split(/[,;]|aur|and/i).filter(s => s.trim().length > 0);
  
  for (const phrase of itemPhrases) {
    const trimmed = phrase.trim();
    if (trimmed.length === 0) continue;
    
    // Extract quantity and remaining text
    const [quantity, remaining] = extractQuantity(trimmed);
    
    // Extract item description
    const description = extractItemDescription(remaining, domain);
    if (description) {
      const attributes = extractAttributes(remaining, domain);
      items.push({
        description,
        quantity: Math.max(1, quantity),
        attributes,
      });
    }
  }
  
  return items;
}
