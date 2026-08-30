import type { Domain } from "./vocab.js";
import { normalize } from "./normalize.js";

export interface Item {
  description: string;
  quantity: number;
  attributes: Record<string, string | number | boolean>;
}

type ItemVocabulary = { description: string; aliases: string[] };
type ItemMatch = { description: string; start: number; end: number; quantity: number; explicitQuantity: boolean };
type Draft = Item & { firstPosition: number };

const VOCABULARY: Record<Domain, ItemVocabulary[]> = {
  tailor: [
    { description: "waistcoat", aliases: ["waistcoat"] }, { description: "sherwani", aliases: ["sherwani"] },
    { description: "lehenga", aliases: ["lehenga"] }, { description: "dupatta", aliases: ["dupatta"] },
    { description: "blouse", aliases: ["blouse"] }, { description: "salwar", aliases: ["salwar"] },
    { description: "pajama", aliases: ["pajama", "pyjama"] }, { description: "kameez", aliases: ["kameez"] },
    { description: "kurta", aliases: ["kurta"] }, { description: "shirt", aliases: ["shirt"] },
    { description: "pant", aliases: ["pant", "pants"] }, { description: "suit", aliases: ["suit"] },
  ],
  baker: [
    { description: "birthday cake", aliases: ["birthday cake"] }, { description: "cheesecake", aliases: ["cheesecake"] },
    { description: "bread loaf", aliases: ["bread loaf", "bread"] }, { description: "cupcake", aliases: ["cupcake"] },
    { description: "cookies", aliases: ["cookies", "cookie", "biscuit"] }, { description: "brownie", aliases: ["brownie"] },
    { description: "pastry", aliases: ["pastry"] }, { description: "donut", aliases: ["donut"] },
    { description: "muffin", aliases: ["muffin"] }, { description: "cake", aliases: ["cake"] },
  ],
  electrician: [
    { description: "switch board", aliases: ["switch board", "board"] }, { description: "water motor", aliases: ["water motor", "motor"] },
    { description: "ceiling fan", aliases: ["ceiling fan"] }, { description: "exhaust fan", aliases: ["exhaust fan"] },
    { description: "tube light", aliases: ["tube light"] }, { description: "ac point", aliases: ["ac point"] },
    { description: "doorbell", aliases: ["doorbell"] }, { description: "inverter", aliases: ["inverter"] },
    { description: "geyser", aliases: ["geyser"] }, { description: "wiring", aliases: ["wiring"] },
    { description: "socket", aliases: ["socket"] }, { description: "mcb", aliases: ["mcb"] },
  ],
  tiffin: [
    { description: "paneer sabzi", aliases: ["paneer sabzi", "paneer"] }, { description: "khichdi", aliases: ["khichdi"] },
    { description: "paratha", aliases: ["paratha"] }, { description: "rajma", aliases: ["rajma"] },
    { description: "sabzi", aliases: ["sabzi", "sabji"] }, { description: "chole", aliases: ["chole", "chhole"] },
    { description: "curd", aliases: ["curd"] }, { description: "thali", aliases: ["thali"] },
    { description: "idli", aliases: ["idli"] }, { description: "poha", aliases: ["poha"] },
    { description: "rice", aliases: ["rice"] }, { description: "roti", aliases: ["roti"] },
    { description: "dal", aliases: ["dal"] },
  ],
};

const BRAND_NAMES: Array<[string, string]> = [
  ["havells", "Havells"], ["anchor", "Anchor"], ["polycab", "Polycab"], ["usha", "Usha"],
  ["bajaj", "Bajaj"], ["crompton", "Crompton"], ["orient", "Orient"],
];

function escapeRegExp(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function quantityNear(text: string, start: number, end: number): { quantity: number; explicit: boolean } {
  const previous = text.slice(Math.max(0, start - 28), start).match(/(?:^|[\s,;.])(\d+)(?:\s+ya\s+\d+)?\s*$/);
  if (previous) return { quantity: Number(previous[1]), explicit: true };
  const after = text.slice(end, end + 18);
  const following = after.match(/^\s+(\d+)\b/);
  if (following && !/^\s+\d+\s*(?:kg|watt|tier|din|roti|tarikh|tareekh|sep|oct|nov|aug|dec|jan|feb|mar|apr|may|jun|jul)\b/.test(after) && !/^\s+\d+\s*\/\s*\d+/.test(after)) {
    return { quantity: Number(following[1]), explicit: true };
  }
  return { quantity: 1, explicit: false };
}

function isNegated(text: string, end: number): boolean { return /^\s+(?:nahi|nahin)\b/.test(text.slice(end, end + 16)); }

function isEmbeddedAppliance(text: string, start: number, description: string): boolean {
  const before = text.slice(Math.max(0, start - 36), start);
  const after = text.slice(start, start + 24);
  if (description === "water motor") {
    if (/\b(?:ceiling fan|inverter|geyser|socket|ac point)\s+(?:ka|ke|ki|wala|wali)\s*$/.test(before)) return true;
    return /^motor\s+wal/.test(after);
  }
  if (!/^(?:geyser|inverter)\b/.test(text.slice(start))) return false;
  return /^\s+wal/.test(text.slice(start + description.length)) && /\b(?:ceiling fan|exhaust fan|inverter|mcb|socket|wiring|ac point)\b/.test(before);
}

function findItems(text: string, domain: Domain): ItemMatch[] {
  const found: Array<{ description: string; start: number; end: number }> = [];
  for (const item of VOCABULARY[domain]) for (const alias of item.aliases) {
    const expression = new RegExp(`(?:^|\\b)${escapeRegExp(alias)}(?=\\b|$)`, "g");
    let match: RegExpExecArray | null;
    while ((match = expression.exec(text))) {
      const start = match.index + (match[0].length - match[0].trimStart().length);
      const end = start + alias.length;
      if (!isNegated(text, end) && !isEmbeddedAppliance(text, start, item.description)) found.push({ description: item.description, start, end });
    }
  }
  found.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const selected: ItemMatch[] = [];
  for (const item of found) {
    if (selected.some((other) => item.start < other.end && other.start < item.end)) continue;
    const detected = quantityNear(text, item.start, item.end);
    selected.push({ ...item, quantity: Math.max(1, detected.quantity), explicitQuantity: detected.explicit });
  }
  return selected.sort((a, b) => a.start - b.start);
}

function setMeasurement(attributes: Item["attributes"], text: string, key: "chest" | "waist" | "length") {
  const match = text.match(new RegExp(`\\b${key}\\s+(\\d+)\\b`));
  if (match) attributes[key] = Number(match[1]);
}

function attributesFor(text: string, domain: Domain): Item["attributes"] {
  const attributes: Item["attributes"] = {};
  if (domain === "tailor") {
    const colors: Array<[RegExp, string]> = [
      [/\bbottle green\b/, "bottle green"], [/\bnavy blue\b/, "navy blue"], [/\bmaroon\b/, "maroon"],
      [/\bmustard\b/, "mustard"], [/\bbeige\b/, "beige"], [/\bgrey|gray\b/, "grey"], [/\bpink\b/, "pink"],
      [/\bwhite\b/, "white"], [/\bblack\b/, "black"], [/\bred\b/, "red"], [/\bblue\b/, "blue"], [/\bgreen\b/, "green"],
    ];
    const color = colors.find(([pattern]) => pattern.test(text));
    if (color) attributes.color = color[1];
    setMeasurement(attributes, text, "chest"); setMeasurement(attributes, text, "waist"); setMeasurement(attributes, text, "length");
    const size = text.match(/\bsize\s*(xxl|xl|xs|s|m|l)\b|\b(xx?l|xs|s|m|l)\b/);
    if (size) attributes.size = (size[1] ?? size[2]).toUpperCase();
    if (/\b(slim|tight|fitted)\b/.test(text)) attributes.fit = "slim";
    else if (/\b(loose|relaxed)\b/.test(text)) attributes.fit = "loose";
    else if (/\b(regular|normal)\b/.test(text)) attributes.fit = "regular";
    if (/\b(3\/4|three quarter)\s+sleeve\b/.test(text)) attributes.sleeve = "three-quarter";
    else if (/\b(half|aadha)\s+sleeve\b/.test(text)) attributes.sleeve = "half";
    else if (/\b(full|pura)\s+sleeve\b/.test(text)) attributes.sleeve = "full";
    const fabric = text.match(/\b(linen|silk|rayon|chiffon|velvet|khadi)\b/);
    if (fabric) attributes.fabric = fabric[1];
  }
  if (domain === "baker") {
    const flavour = text.match(/\b(red velvet|black forest|butterscotch|strawberry|chocolate|vanilla|pineapple|coffee|mango)\b/);
    if (flavour) attributes.flavour = flavour[1];
    const weight = text.match(/\b(\d+(?:\.\d+)?)\s*kg\b/); if (weight) attributes.weight_kg = Number(weight[1]);
    const tier = text.match(/\b(\d+)\s*tier\b/); if (tier) attributes.tier = Number(tier[1]);
    const shape = text.match(/\b(round|square|heart)\s*(?:shape)?\b/); if (shape) attributes.shape = shape[1];
    if (/\beggless\b/.test(text)) attributes.egg_free = true;
    else if (/\b(normal\s+)?ande?\s+wal(?:a|e|i|ey|iye)\b/.test(text)) attributes.egg_free = false;
  }
  if (domain === "electrician") {
    const wattage = text.match(/\b(\d+)\s*watt\b/); if (wattage) attributes.wattage = Number(wattage[1]);
    const room = text.match(/\b(kitchen|bathroom|bedroom|balcony|hall|terrace)\b/); if (room) attributes.room = room[1];
    const brand = BRAND_NAMES.find(([name]) => new RegExp(`\\b${name}\\b`).test(text)); if (brand) attributes.brand = brand[1];
    const appliance = text.match(/\b(fridge point|fan|motor|geyser|light|ac)\s+(?:wal|ka|ke|ki)/); if (appliance) attributes.appliance = appliance[1];
    if (/\bfuse\s+ud\b/.test(text)) attributes.issue = "fuse blown";
    else if (/\b(short|short circuit)\b/.test(text)) attributes.issue = "short circuit";
    else if (/\b(current aa|jhatka)\b/.test(text)) attributes.issue = "leaking current";
    else if (/\b(awaaz|noise)\b/.test(text)) attributes.issue = "noise";
    else if (/\b(dheema|dheere|slow)\b/.test(text)) attributes.issue = "slow";
    else if (/\b(chal nahi|band hai|not working)\b/.test(text)) attributes.issue = "not working";
    else if (/\b(spark|chingari)\b/.test(text)) attributes.issue = "spark";
  }
  if (domain === "tiffin") {
    const meal = text.match(/\b(breakfast|lunch|dinner)\b/); if (meal) attributes.meal = meal[1];
    const days = text.match(/\b(\d+)\s+din\b/); if (days) attributes.days = Number(days[1]);
    const roti = text.match(/\b(\d+)\s+roti\b/); if (roti) attributes.roti_count = Number(roti[1]);
    if (/\b(kam mirchi|mild)\b/.test(text)) attributes.spice_level = "mild";
    else if (/\b(tez|spicy)\b/.test(text)) attributes.spice_level = "spicy";
    else if (/\b(normal|medium)\b/.test(text)) attributes.spice_level = "medium";
    if (/\b(aadha|half)(?:\s+portion)?\b/.test(text)) attributes.portion = "half";
    else if (/\b(pura|full)\s+portion\b/.test(text)) attributes.portion = "full";
    else if (/\b(zyada|extra)\s+(?:portion|quantity)?\b/.test(text)) attributes.portion = "extra";
    if (/\bjain\s+nahi\b/.test(text)) attributes.jain = false;
    else if (/\bjain\b/.test(text)) attributes.jain = true;
  }
  return attributes;
}

/** Extract explicit, non-negated items and attach nearby modifiers to each item. */
export function extractItems(message: string, domain: Domain): Item[] {
  const text = normalize(message);
  const matches = findItems(text, domain);
  const drafts: Draft[] = [];
  const firstByDescription = new Map<string, Draft>();
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const end = matches[index + 1]?.start ?? text.length;
    const attrs = attributesFor(text.slice(match.start, end), domain);
    if (domain === "tiffin" && match.description === "roti" && match.explicitQuantity && drafts.length) {
      const previous = drafts[drafts.length - 1];
      previous.attributes.roti_count = match.quantity;
      Object.assign(previous.attributes, attrs);
      continue;
    }
    let draft = firstByDescription.get(match.description);
    if (match.explicitQuantity || !draft) {
      draft = { description: match.description, quantity: match.quantity, attributes: {}, firstPosition: match.start };
      drafts.push(draft);
      if (!firstByDescription.has(match.description)) firstByDescription.set(match.description, draft);
    }
    Object.assign(draft.attributes, attrs);
  }
  if (domain === "tiffin" && /\bdono\s+me\b/.test(text)) {
    const roti = text.match(/\b(\d+)\s+roti\b/);
    if (roti) for (const draft of drafts) draft.attributes.roti_count = Number(roti[1]);
  }
  return drafts.sort((a, b) => a.firstPosition - b.firstPosition).map(({ firstPosition: _firstPosition, ...item }) => item);
}
