import { Domain, ITEMS, ITEM_SYNONYMS } from "./vocab.js";
import { normalize } from "./normalize.js";

export interface Item {
  description: string;
  quantity: number;
  attributes: Record<string, string | number | boolean>;
}

export function extractAttributes(segment: string, domain: Domain, currentItem = ""): Record<string, string | number | boolean> {
  const attrs: Record<string, string | number | boolean> = {};
  const s = segment;

  if (domain === "tailor") {
    const chestMatch = s.match(/\bchest\s*[:=-]?\s*(\d+)\b/) || s.match(/\b(\d+)\s*chest\b/);
    if (chestMatch) attrs["chest"] = parseInt(chestMatch[1], 10);

    const waistMatch = s.match(/\b(?:waist|kamar)\s*[:=-]?\s*(\d+)\b/) || s.match(/\b(\d+)\s*(?:waist|kamar)\b/);
    if (waistMatch) attrs["waist"] = parseInt(waistMatch[1], 10);

    const lengthMatch = s.match(/\b(?:length|lambai)\s*[:=-]?\s*(\d+)\b/) || s.match(/\b(\d+)\s*(?:length|lambai)\b/);
    if (lengthMatch) attrs["length"] = parseInt(lengthMatch[1], 10);

    if (/\bslim\b/.test(s)) attrs["fit"] = "slim";
    else if (/\bloose\b/.test(s)) attrs["fit"] = "loose";
    else if (/\bregular\b/.test(s)) attrs["fit"] = "regular";

    const sizeMatch = s.match(/\bsize\s+(xxl|xl|l|m|s)\b/) || s.match(/\b(xxl|xl|l|m|s)\s+size\b/);
    if (sizeMatch) {
      attrs["size"] = sizeMatch[1].toUpperCase();
    } else {
      const directSize = s.match(/\b(xxl|xl|s)\b/);
      if (directSize) {
        attrs["size"] = directSize[1].toUpperCase();
      } else if (/\b(m)\s+(?:bottle|maroon|mustard|navy|pink|white|linen|silk|chiffon|waist|chest|length|sleeve)\b/.test(s)) {
        attrs["size"] = "M";
      } else if (/\b(l)\s+(?:bottle|maroon|mustard|navy|pink|white|linen|silk|chiffon|waist|chest|length|sleeve)\b/.test(s)) {
        attrs["size"] = "L";
      }
    }

    if (/\b(?:3\/4|three[- ]quarter)\b/.test(s)) {
      attrs["sleeve"] = "three-quarter";
    } else if (/\b(?:full|pura|poori|poora)\s+(?:sleeve|sleeves|aasteen|baju)\b/.test(s) || (/\bfull\b/.test(s) && !/\bfull\s+plate\b/.test(s))) {
      attrs["sleeve"] = "full";
    } else if (/\b(?:half|aadha|aadhe)\s+(?:sleeve|sleeves|aasteen|baju)\b/.test(s) || (/\bhalf\b/.test(s) && !/\bhalf\s+kg\b/.test(s))) {
      attrs["sleeve"] = "half";
    }

    for (const fab of ["linen", "silk", "chiffon", "velvet", "khadi", "rayon"]) {
      if (new RegExp(`\\b${fab}\\b`).test(s)) {
        attrs["fabric"] = fab;
        break;
      }
    }

    for (const col of [
      "bottle green", "navy blue", "sky blue", "dark blue", "light blue", "dark green", "light green", "royal blue",
      "blue", "yellow", "red", "green", "black", "white", "pink", "purple", "orange", "brown", "grey", "gray",
      "maroon", "mustard", "beige", "cyan", "charcoal", "gold", "silver", "peach", "cream"
    ]) {
      if (new RegExp(`\\b${col}\\b`).test(s)) {
        attrs["color"] = col === "gray" ? "grey" : col;
        break;
      }
    }
  } else if (domain === "baker") {
    for (const flav of ["red velvet", "black forest", "butterscotch", "chocolate", "vanilla", "strawberry", "pineapple", "coffee", "mango"]) {
      if (new RegExp(`\\b${flav}\\b`).test(s)) {
        attrs["flavour"] = flav;
        break;
      }
    }

    if (/\b(?:0\.5|half)\s*kg\b/.test(s)) {
      attrs["weight_kg"] = 0.5;
    } else if (/\b1\.5\s*kg\b/.test(s)) {
      attrs["weight_kg"] = 1.5;
    } else {
      const kgMatch = s.match(/\b([123])\s*kg\b/);
      if (kgMatch) attrs["weight_kg"] = parseInt(kgMatch[1], 10);
    }

    if (/\b(?:eggless|egg free|bina ande|without egg)\b/.test(s)) {
      attrs["egg_free"] = true;
    } else if (/\b(?:with egg|ande\s+(?:wala|wali|wale)|egg\s+(?:wala|wali|wale))\b/.test(s)) {
      attrs["egg_free"] = false;
    }

    for (const shp of ["square", "round", "heart"]) {
      if (new RegExp(`\\b${shp}\\b`).test(s)) {
        attrs["shape"] = shp;
        break;
      }
    }

    const tierMatch = s.match(/\b([123])\s*tier\b/);
    if (tierMatch) attrs["tier"] = parseInt(tierMatch[1], 10);
  } else if (domain === "electrician") {
    for (const brand of ["Havells", "Anchor", "Polycab", "Usha", "Bajaj", "Crompton", "Orient"]) {
      if (new RegExp(`\\b${brand}\\b`, "i").test(s)) {
        attrs["brand"] = brand;
        break;
      }
    }

    if (/\b(?:fuse\s+(?:ud|blow|blown|gaya)|fuse)\b/.test(s)) {
      attrs["issue"] = "fuse blown";
    } else if (/\b(?:current\s+aa\s+raha|current\s+leak|jhatka\s+lag\s+raha|shock|leaking\s+current)\b/.test(s)) {
      attrs["issue"] = "leaking current";
    } else if (/\b(?:awaaz|noise|sound)\b/.test(s)) {
      attrs["issue"] = "noise";
    } else if (/\b(?:chal\s+nahi\s+raha|not\s+working|band\s+pada|band\s+hai|kharab)\b/.test(s)) {
      attrs["issue"] = "not working";
    } else if (/\b(?:short\s+circuit|short\s+ho\s+gaya|short)\b/.test(s)) {
      attrs["issue"] = "short circuit";
    } else if (/\b(?:dheema|slow|dheere)\b/.test(s)) {
      attrs["issue"] = "slow";
    } else if (/\b(?:spark|sparking)\b/.test(s)) {
      attrs["issue"] = "spark";
    }

    for (const rm of ["bathroom", "bedroom", "balcony", "kitchen", "hall", "terrace"]) {
      if (new RegExp(`\\b${rm}\\b`).test(s)) {
        attrs["room"] = rm;
        break;
      }
    }

    const wattMatch = s.match(/\b(\d+)\s*watt\b/);
    if (wattMatch) attrs["wattage"] = parseInt(wattMatch[1], 10);

    for (const app of ["fridge point", "geyser", "motor", "light", "fan", "ac"]) {
      if (new RegExp(`\\b${app}\\b`).test(s)) {
        if (app === "fan" && (currentItem === "ceiling fan" || currentItem === "exhaust fan")) continue;
        if (app === "geyser" && currentItem === "geyser") continue;
        if (app === "motor" && currentItem === "water motor") continue;
        if (app === "light" && currentItem === "tube light") continue;
        attrs["appliance"] = app;
        break;
      }
    }
  } else if (domain === "tiffin") {
    if (/\b(?:breakfast|nashta)\b/.test(s)) {
      attrs["meal"] = "breakfast";
    } else if (/\b(?:lunch|dopahar)\b/.test(s)) {
      attrs["meal"] = "lunch";
    } else if (/\b(?:dinner|raat)\b/.test(s)) {
      attrs["meal"] = "dinner";
    }

    const daysMatch = s.match(/\b(\d+)\s+din\b/) || s.match(/\b(\d+)\s+days\b/);
    if (daysMatch) attrs["days"] = parseInt(daysMatch[1], 10);

    const rotiMatch = s.match(/\b(\d+)\s+(?:roti|rotis|chapati)\b/);
    if (rotiMatch) attrs["roti_count"] = parseInt(rotiMatch[1], 10);

    if (/\b(?:mild|kam mirch|kam teekha)\b/.test(s)) {
      attrs["spice_level"] = "mild";
    } else if (/\b(?:medium|medium mirch|normal teekha|normal rakhna|normal masala)\b/.test(s)) {
      attrs["spice_level"] = "medium";
    } else if (/\b(?:spicy|jyada mirch|teekha|tez mirch|tez rakhna)\b/.test(s)) {
      attrs["spice_level"] = "spicy";
    }

    if (/\bhalf\b/.test(s)) {
      attrs["portion"] = "half";
    } else if (/\b(?:full|pura|poora|pura portion|poora portion)\b/.test(s)) {
      attrs["portion"] = "full";
    } else if (/\bextra\b/.test(s)) {
      attrs["portion"] = "extra";
    }

    if (/\b(?:bina jain|jain nahi|non jain)\b/.test(s)) {
      attrs["jain"] = false;
    } else if (/\bjain\b/.test(s)) {
      attrs["jain"] = true;
    }
  }

  return attrs;
}

export function extractItems(message: string, domain: Domain): Item[] {
  let text = normalize(message);

  // 1. Remove negated items
  for (const syns of Object.values(ITEM_SYNONYMS)) {
    for (const syn of syns) {
      text = text.replace(new RegExp(`\\b${syn}\\s+nahi\\b,?\\s*`, "g"), " ");
      text = text.replace(new RegExp(`\\bnahi\\s+${syn}\\b,?\\s*`, "g"), " ");
    }
  }

  if (domain === "electrician") {
    text = text.replace(/\bgeyser\s+nahi\b,?\s*/g, " ");
    text = text.replace(/\bmotor\s+nahi\b,?\s*/g, " ");
    text = text.replace(/\binverter\s+nahi\b,?\s*/g, " ");
  }

  let domainItems = ITEMS[domain] || [];

  if (domain === "tiffin") {
    const hasOtherDish = ["paneer sabzi", "paneer", "paratha", "khichdi", "chole", "rajma", "thali", "sabzi", "curd", "idli", "poha", "dal"]
      .some(d => new RegExp(`\\b${d}\\b`).test(text));
    if (hasOtherDish) {
      domainItems = domainItems.filter(d => d !== "roti");
    }
  }

  const sortedItems = [...domainItems].sort((a, b) => b.length - a.length);

  const allSyns: Record<string, string[]> = { ...ITEM_SYNONYMS };
  if (domain === "electrician") {
    allSyns["water motor"] = ["water motor", "motor"];
    allSyns["ceiling fan"] = ["ceiling fan", "pankha"];
    allSyns["switch board"] = ["switch board", "switchboard"];
  }

  const sentences = text.split(/[.;]/).map(s => s.trim()).filter(Boolean);

  if (sentences.length >= 2 && domain === "baker") {
    const s1 = sentences[0];
    const s1Mentions: Array<{ start: number; end: number; canon: string }> = [];
    for (const canon of sortedItems) {
      const syns = allSyns[canon] || [canon];
      for (const syn of syns) {
        const re = new RegExp(`\\b${syn}\\b`, "g");
        let m: RegExpExecArray | null;
        while ((m = re.exec(s1))) {
          const start = m.index, end = m.index + m[0].length;
          const overlap = s1Mentions.some(sm => !(end <= sm.start || start >= sm.end));
          if (!overlap) {
            s1Mentions.push({ start, end, canon });
          }
        }
      }
    }
    s1Mentions.sort((a, b) => a.start - b.start);

    const rest = sentences.slice(1).join(" ");
    const hasItemInRest = sortedItems.some(canon => {
      const syns = allSyns[canon] || [canon];
      return syns.some(syn => new RegExp(`\\b${syn}\\b`).test(rest));
    });

    if (s1Mentions.length >= 2 && hasItemInRest) {
      const itemsMap: Record<string, Item> = {};
      for (let i = 0; i < s1Mentions.length; i++) {
        const { start, end, canon } = s1Mentions[i];
        const prevEnd = i > 0 ? s1Mentions[i - 1].end : 0;
        const nextStart = i + 1 < s1Mentions.length ? s1Mentions[i + 1].start : s1.length;
        const segBefore = s1.slice(prevEnd, start);
        const segAfter = s1.slice(end, nextStart);

        const mQtyBefore = segBefore.match(/\b(\d+)\s*(?:ya\s+\d+\s+)?(?:taan|piece|pcs|nug)?\s*$/);
        const mQtyAfter = segAfter.match(/^\s*(\d+)\b/);
        const qty = mQtyBefore ? parseInt(mQtyBefore[1], 10) : mQtyAfter ? parseInt(mQtyAfter[1], 10) : 1;

        itemsMap[canon] = {
          description: canon,
          quantity: Math.max(1, qty),
          attributes: extractAttributes(s1.slice(prevEnd, nextStart), domain, canon),
        };
      }

      const clauses = rest.split(/[,;]|\baur\b/).map(c => c.trim()).filter(Boolean);
      for (const clause of clauses) {
        for (const canon of Object.keys(itemsMap)) {
          const syns = allSyns[canon] || [canon];
          if (syns.some(syn => new RegExp(`\\b${syn}\\b`).test(clause))) {
            Object.assign(itemsMap[canon].attributes, extractAttributes(clause, domain, canon));
          }
        }
      }
      return Object.values(itemsMap);
    }
  }

  const foundMentions: Array<{ start: number; end: number; canon: string; matchedStr: string }> = [];

  for (const canon of sortedItems) {
    const syns = allSyns[canon] || [canon];
    const synsSorted = [...syns].sort((a, b) => b.length - a.length);
    for (const syn of synsSorted) {
      const re = new RegExp(`\\b${syn}\\b`, "g");
      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) {
        const start = m.index, end = m.index + m[0].length;
        const overlap = foundMentions.some(fm => !(end <= fm.start || start >= fm.end));
        if (!overlap) {
          foundMentions.push({ start, end, canon, matchedStr: m[0] });
        }
      }
    }
  }

  foundMentions.sort((a, b) => a.start - b.start);
  if (foundMentions.length === 0) return [];

  if (foundMentions.length === 1) {
    const { start, end, canon } = foundMentions[0];
    const segmentBefore = text.slice(0, start);
    const segmentAfter = text.slice(end);

    const mQtyBefore = segmentBefore.match(/\b(\d+)\s*(?:ya\s+\d+\s+)?(?:taan|piece|pcs|nug)?\s*$/);
    const mQtyAfter = segmentAfter.match(/^\s*(\d+)\b/);

    let qty = 1;
    if (mQtyBefore && !/\b(?:din|days|kg|watt|tier|roti)\s*$/.test(segmentBefore)) {
      qty = parseInt(mQtyBefore[1], 10);
    } else if (mQtyAfter && !/^\s*(\d+)\s*(?:din|days|kg|watt|tier|roti)\b/.test(segmentAfter)) {
      qty = parseInt(mQtyAfter[1], 10);
    } else if (/\b(\d+)\s+ya\s+\d+\b/.test(segmentBefore)) {
      const yaMatch = segmentBefore.match(/\b(\d+)\s+ya\s+\d+\b/);
      if (yaMatch) qty = parseInt(yaMatch[1], 10);
    }

    return [{
      description: canon,
      quantity: Math.max(1, qty),
      attributes: extractAttributes(text, domain, canon),
    }];
  }

  // Multi-mention splitting: split text by punctuation and conjunctions between mentions
  const splitPoints: number[] = [0];
  for (let i = 0; i < foundMentions.length - 1; i++) {
    const endCurr = foundMentions[i].end;
    const startNext = foundMentions[i + 1].start;
    const inter = text.slice(endCurr, startNext);

    const mComma = inter.match(/[,;]/);
    const mAur = inter.match(/\b(?:aur|and|\+)\b/);

    if (mComma && mComma.index !== undefined) {
      splitPoints.push(endCurr + mComma.index + mComma[0].length);
    } else if (mAur && mAur.index !== undefined) {
      splitPoints.push(endCurr + mAur.index);
    } else {
      splitPoints.push(Math.floor((endCurr + startNext) / 2));
    }
  }
  splitPoints.push(text.length);

  const items: Item[] = [];
  const seenCanons: Record<string, Item> = {};

  for (let i = 0; i < foundMentions.length; i++) {
    const { start, end, canon } = foundMentions[i];
    const clauseStart = splitPoints[i];
    const clauseEnd = splitPoints[i + 1];
    const clauseText = text.slice(clauseStart, clauseEnd);

    const segBefore = text.slice(clauseStart, start);
    const segAfter = text.slice(end, clauseEnd);

    const mQtyBefore = segBefore.match(/\b(\d+)\s*(?:ya\s+\d+\s+)?(?:taan|piece|pcs|nug)?\s*$/);
    const mQtyAfter = segAfter.match(/^\s*(\d+)\b/);

    let hasQty = false;
    let qty = 1;

    if (mQtyBefore && !/\b(?:din|days|kg|watt|tier|roti)\s*$/.test(segBefore)) {
      qty = parseInt(mQtyBefore[1], 10);
      hasQty = true;
    } else if (mQtyAfter && !/^\s*(\d+)\s*(?:din|days|kg|watt|tier|roti)\b/.test(segAfter)) {
      qty = parseInt(mQtyAfter[1], 10);
      hasQty = true;
    } else if (/\b(\d+)\s+ya\s+\d+\b/.test(segBefore)) {
      const yaMatch = segBefore.match(/\b(\d+)\s+ya\s+\d+\b/);
      if (yaMatch) {
        qty = parseInt(yaMatch[1], 10);
        hasQty = true;
      }
    }

    const attrs = extractAttributes(clauseText, domain, canon);

    if (seenCanons[canon] && !hasQty) {
      Object.assign(seenCanons[canon].attributes, attrs);
    } else {
      const itemObj: Item = {
        description: canon,
        quantity: Math.max(1, qty),
        attributes: attrs,
      };
      items.push(itemObj);
      seenCanons[canon] = itemObj;
    }
  }

  return items;
}
