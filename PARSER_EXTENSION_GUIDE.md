# Parser Extension Guide

## Quick Start: Adding New Items to Existing Domains

### Step 1: Add Item to Vocabulary

Edit [src/core/parsar/vocab.ts](src/core/parsar/vocab.ts):

```typescript
export const ITEM_SYNONYMS: Record<string, string[]> = {
  // Add new entry
  "my_new_item": ["variant1", "variant2", "hindi_name"],
  
  // Example - adding more clothing items
  "lehenga": ["lehenga", "lehnga", "lehenga", "skirt"],
  "angarkha": ["angarkha", "angarakha"],
};
```

### Step 2: Add to Domain Items

Edit [src/core/parsar/extract.ts](src/core/parsar/extract.ts):

```typescript
const DOMAIN_ITEMS: Record<Domain, string[]> = {
  tailor: [
    // ... existing items
    "my_new_item",  // Add here
  ],
  // ...
};
```

### Step 3: Test

```bash
npm run typecheck
npm test
```

---

## Adding Colors

Edit [src/core/parsar/vocab.ts](src/core/parsar/vocab.ts):

```typescript
export const COLOR_PATTERNS: Record<string, string> = {
  "orange": "orange",
  "saffron": "orange",  // Hinglish variant
  "purple": "purple",
  "banabhatti": "purple",  // Hinglish variant
};
```

---

## Adding Brand Names

Edit [src/core/parsar/extract.ts](src/core/parsar/extract.ts) in the `extractAttributes` function:

```typescript
if (domain === "electrician") {
  const brands = [
    "havells", "anchor", "polycab", 
    "new_brand",  // Add here
  ];
  // ...
}
```

---

## Adding Attributes by Domain

### Tailor Domain
Edit `extractAttributes()` function for measurements, fits, styles:

```typescript
// Look for custom sizes
const customMatch = normalized.match(/\b(petite|tall|slim fit|regular fit)\b/i);
if (customMatch) attributes["fit_type"] = customMatch[1];
```

### Baker Domain
Add flavors or cake types:

```typescript
const flavors = [
  "chocolate", "vanilla", 
  "new_flavor",  // Add here
];
```

### Electrician Domain
Add issue types or equipment:

```typescript
const issues = [
  "fuse blown", "short circuit",
  "new_issue",  // Add here
];
```

---

## Adding Honorifics

Edit [src/core/parsar/extract.ts](src/core/parsar/extract.ts):

```typescript
const HONORIFICS = new Set([
  "didi", "bhaiya", "ji", 
  "new_honorific",  // Add here
]);
```

---

## Full Example: Adding Footwear Domain (Hypothetical)

### 1. Update Type Definition

Edit [src/core/parsar/vocab.ts](src/core/parsar/vocab.ts):

```typescript
export type Domain = "tailor" | "baker" | "electrician" | "tiffin" | "footwear";
```

### 2. Add Items

Edit [src/core/parsar/extract.ts](src/core/parsar/extract.ts):

```typescript
const DOMAIN_ITEMS: Record<Domain, string[]> = {
  // ... existing
  footwear: ["shoe", "sandal", "boot", "slipper", "flip-flop", "sneaker", "heel"],
};
```

### 3. Add Synonyms

```typescript
export const ITEM_SYNONYMS: Record<string, string[]> = {
  // ... existing
  "shoe": ["shoe", "shoe", "juta"],
  "sandal": ["sandal", "sandaal", "sandel"],
  "boot": ["boot", "boot", "leather boot"],
};
```

### 4. Add Attributes

```typescript
if (domain === "footwear") {
  // Look for sizes
  const sizeMatch = normalized.match(/\b(size|number)\s+(\d+)\b/i);
  if (sizeMatch) attributes["size"] = sizeMatch[2];
  
  // Look for material
  if (/\b(leather|rubber|canvas|cloth)\b/i.test(normalized)) {
    const match = normalized.match(/\b(leather|rubber|canvas|cloth)\b/i);
    if (match) attributes["material"] = match[1];
  }
}
```

### 5. Test

```bash
npm run typecheck
npm test
```

---

## Testing Your Changes

Create a test input file:

```json
[
  {
    "id": "test-new",
    "domain": "footwear",
    "received_at": "2026-08-30T10:00:00Z",
    "message": "2 black leather shoes size 10 chahiye"
  }
]
```

Run the parser:

```bash
npm run cli -- --in test_file.json --out test_output.json
```

Expected output:
```json
{
  "description": "shoe",
  "quantity": 2,
  "attributes": {
    "color": "black",
    "material": "leather",
    "size": "10"
  }
}
```

---

## Performance Tips

1. **Keep vocabularies sorted** - Better caching
2. **Use specific patterns** - Regex optimization
3. **Order attributes by frequency** - Faster matching
4. **Cache normalized text** - Avoid re-normalizing

---

## Troubleshooting

### Issue: Item not recognized
**Solution:** Check if it's in `DOMAIN_ITEMS` and `ITEM_SYNONYMS`

### Issue: Attribute not extracted
**Solution:** Add pattern to `extractAttributes()` function

### Issue: False positives (honorifics parsed as items)
**Solution:** Add to `HONORIFICS` set

### Issue: Color not detected
**Solution:** Add to `COLOR_PATTERNS`

---

## Best Practices

1. **Always include Hinglish variants** in synonyms
2. **Use word boundaries** in regex patterns: `\b...\b`
3. **Test with typecheck:** `npm run typecheck`
4. **Run full test suite:** `npm test`
5. **Document new attributes** in comments
6. **Keep domains consistent** across files

---

## File Reference

| File | Purpose | Editable |
|------|---------|----------|
| `src/core/parsar/vocab.ts` | Type definitions, synonyms, colors | ✅ Yes |
| `src/core/parsar/extract.ts` | Item extraction, attributes | ✅ Yes |
| `src/core/parsar/parse.ts` | Main parsing logic | ⚠️ Advanced |
| `src/core/parsar/normalize.ts` | Text normalization | ⚠️ Advanced |
| `src/core/parsar/dates.ts` | Date extraction | ⚠️ Advanced |

---

## Quick Commands

```bash
# Type check
npm run typecheck

# Run tests
npm test

# Run with watch
npm test:watch

# Test single input
npm run cli -- --in input.json --out output.json

# Full test on training data
npm run cli -- --in Given_materials/messages_train.json --out results.json
npm run score -- --gold Given_materials/messages_train.json --pred results.json --out breakdown.json
```

---

## Support & Examples

For more examples, see:
- `tests/parse.ts` - Test cases
- `tests/scenarios.test.ts` - Conflict handling examples
- `Given_materials/messages_train.json` - Training data with expected outputs
- `enhanced_test.json` - Enhancement demonstration

