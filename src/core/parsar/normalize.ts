// Normalize text for processing
// Converts to lowercase, removes extra whitespace, handles common romanization variations
export function normalize(text: string, stripHonorifics: boolean = false): string {
  // Convert to lowercase
  let normalized = text.toLowerCase();
  
  // Common romanization variations - normalize to one form
  // These help with matching variations in Hindi romanization
  const replacements: [RegExp, string][] = [
    // Standardize "ya" (or) to consistent form
    [/\s+ya\s+/g, " ya "],
    // Standardize common words
    [/\bji\b/g, "ji"],
    [/\bbhai\b/g, "bhai"],
    [/\bdidi\b/g, "didi"],
    [/\bauntie\b/g, "aunty"],
    [/\baunti\b/g, "aunty"],
    [/\brupee(s)?\b/g, "rupees"],
    [/\binr\b/g, "rupees"],
    [/\brs\b/g, "rupees"],
    [/\brupaye(s)?\b/g, "rupees"],
    // Common abbreviations
    [/\bko\b/g, "ko"],
    [/\bke\b/g, "ke"],
    [/\bka\b/g, "ka"],
    [/\bki\b/g, "ki"],
  ];
  
  for (const [pattern, replacement] of replacements) {
    normalized = normalized.replace(pattern, replacement);
  }
  
  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, " ").trim();
  
  if (stripHonorifics) {
    // Remove common honorifics when requested
    const honorifics = ["ji", "bhai", "didi", "aunty", "bhaiya", "behen", "uncle"];
    for (const honorific of honorifics) {
      normalized = normalized.replace(new RegExp(`\\b([a-z]+)\\s+${honorific}\\b`, "g"), "$1");
    }
  }
  
  return normalized;
}
