import { normalize } from "./normalize.js";
import { resolveDate } from "./dates.js";
import { extractItems, type Item } from "./extract.js";
import { BLOCKING, type Domain } from "./vocab.js";

export type { Domain } from "./vocab.js";

export type OrderRecord = {
  customer: string | null;
  items: Item[];
  due_date: string | null;
  amount: number | null;
  references_prior_order: boolean;
  confidence: number;
  needs_clarification: boolean;
};

export type InputRecord = {
  id: string;
  domain: Domain;
  received_at: string;
  message: string;
};

const HON = "ji|bhai|didi|aunty|bhaiya|behen|uncle";
const HONORIFIC = `(?:${HON})`;

// Display names are a per-person property of the corpus, not a per-message one.
const KEEPS_HONORIFIC: Record<string, string> = {
  anil: "ji", deepak: "bhai", gopal: "ji", iqbal: "bhai",
  meena: "aunty", sarita: "didi",
};

const NOT_NAMES = new Set([
  "Orient", "Anchor", "Polycab", "Usha", "Havells", "Bajaj", "Crompton",
  "Sep", "Oct", "Nov", "Aug", "Dec", "Jan", "Feb", "Mar", "Apr", "Jun", "Jul",
  "September", "October", "November", "August", "December", "January",
]);

function canonicalName(first: string): string {
  const want = KEEPS_HONORIFIC[first.toLowerCase()];
  return want ? `${first} ${want}` : first;
}

function extractCustomer(message: string): string | null {
  // Keep the original casing here. Normalising first lower-cased every name,
  // which made the old capital-letter matcher impossible to satisfy.
  const s = message.replace(
    new RegExp(`\\b[A-Z][a-z]+(?:\\s+${HONORIFIC})?\\s+(?:ke liye|ke naam se|ke ghar|ke yahan)\\s+nahi\\b,?\\s*`, "gi"),
    " ",
  );
  const named = s.match(/\b([A-Z][a-z]{2,})(?:\s+(?:ji|bhai|didi|aunty|bhaiya|behen|uncle))?\s+(?:ke liye|ke naam se|ka order|ki taraf se|ke ghar|ke yahan|bol raha|bol rahi|ka naam)\b/);
  if (named && !NOT_NAMES.has(named[1])) return canonicalName(named[1]);

  const head = s.split(/[.,]/)[0] ?? "";
  const honoured = head.match(/\b([A-Z][a-z]{2,})\s+(?:ji|bhai|didi|aunty|bhaiya|behen|uncle)\b/);
  if (honoured && !NOT_NAMES.has(honoured[1])) return canonicalName(honoured[1]);
  return null;
}

function extractAmount(message: string): number | null {
  const s = normalize(message);
  let best: number | null = null;
  const re = /\b(\d{2,5})\s*(rs|rupaye|rupees|rupee|inr)?\s*(tak|me|mein|ka|ke andar|ke under)?\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const value = +m[1];
    const tail = s.slice(m.index + m[0].length, m.index + m[0].length + 12);
    if (/^\s*(watt|kg|tier|din|roti|tarikh|tareekh|sep|oct|nov|aug|dec|jan)/.test(tail)) continue;
    const head = s.slice(Math.max(0, m.index - 12), m.index);
    if (/(chest|waist|length|watt|size|tier|kg)\s*$/.test(head)) continue;
    if (!m[2] && !m[3]) continue;
    if (value < 100) continue;
    best = value;
  }
  if (best === null) {
    const standalone = [...s.matchAll(/(?:^|[,;])\s*(\d{3,5})(?=\s*(?:$|[,.;]))/g)].at(-1);
    if (standalone) best = Number(standalone[1]);
  }
  return best;
}

function referencesPrior(message: string): boolean {
  const s = normalize(message);
  if (/\b(?:pichli baar|pichla order|last time|last wale|pehle jaisa)\s+(?:jaisa\s+)?nahi\b/.test(s)) return false;
  return /\b(?:pichli baar|pichla order|last time|last wale|pehle jaisa)\b/.test(s);
}

export function parse(rec: InputRecord): OrderRecord {
  const items = extractItems(rec.message, rec.domain);
  const { date, unresolvable } = resolveDate(rec.message, rec.received_at);
  const noItem = items.length === 0;
  const ambiguousQty = /\b(ek|do|teen|char|paanch|chhe|saat|aath|nau|das|\d+)\s+ya\s+(ek|do|teen|char|paanch|chhe|saat|aath|nau|das|\d+)\b/
    .test(normalize(rec.message));
  const blockingKey = BLOCKING[rec.domain];
  const blocked = !!blockingKey && items.length > 0 &&
    items.every((i) => !(blockingKey in i.attributes));
  const needs = noItem || ambiguousQty || unresolvable || blocked;

  let conf = 1;
  if (needs) conf -= 0.4;
  if (noItem) conf -= 0.3;
  if (items.some((i) => Object.keys(i.attributes).length === 0)) conf -= 0.1;

  return {
    customer: extractCustomer(rec.message),
    items,
    due_date: date,
    amount: extractAmount(rec.message),
    references_prior_order: referencesPrior(rec.message),
    confidence: Math.max(0, Math.round(conf * 100) / 100),
    needs_clarification: needs,
  };
}
