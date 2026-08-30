/**
 * Normalise the small Hinglish vocabulary used by the offline parser. This is
 * deterministic, so the same input always produces the same parsed order.
 */
export function normalize(text: string, stripHonorifics = false): string {
  let normalized = text.toLowerCase();
  normalized = normalized.replace(/[०-९]/g, (digit) => String(digit.charCodeAt(0) - 0x0966));

  const phrases: Array<[string, string]> = [
    ["पनीर की सब्जी", "paneer sabzi"], ["पनीर सब्जी", "paneer sabzi"],
    ["चीज केक", "cheesecake"], ["ट्यूब लाइट", "tube light"],
    ["फ्यूज बॉक्स", "fuse box"], ["एसी पॉइंट", "ac point"],
    ["बर्थडे केक", "birthday cake"], ["कप केक", "cupcake"],
    ["पेस्ट्री", "pastry"], ["पजामा", "pajama"], ["दुपट्टा", "dupatta"],
    ["शेरवानी", "sherwani"], ["ब्लाउज", "blouse"], ["सलवार", "salwar"],
    ["शर्ट", "shirt"], ["तारीख", "tarikh"], ["तारीख़", "tarikh"],
    ["सॉकेट", "socket"], ["स्विचबोर्ड", "switchboard"], ["एमसीबी", "mcb"],
    ["लहंगा", "lehenga"], ["गीजर", "geyser"], ["मोटर", "motor"],
    ["दही", "curd"], ["पराठा", "paratha"], ["इडली", "idli"],
    ["छोले", "chole"], ["थाली", "thali"], ["खिचड़ी", "khichdi"],
    ["खिचडी", "khichdi"], ["सब्जी", "sabzi"], ["दाल", "dal"],
    ["चावल", "rice"], ["पनीर", "paneer"], ["राजमा", "rajma"],
    ["ब्रेड", "bread"], ["ब्राउनी", "brownie"], ["डोनट", "donut"],
    ["केक", "cake"], ["कुकी", "cookie"], ["पंखा", "pankha"],
    ["घंटी", "ghanti"], ["वायरिंग", "wiring"], ["स्विचबोर्ड", "switchboard"],
  ];
  for (const [from, to] of phrases) normalized = normalized.replaceAll(from, to);

  const words: Array<[RegExp, string]> = [
    [/\bdo\s+hazaar\b/g, "2000"],
    [/\bchhattis\b/g, "36"], [/\baadtis\b/g, "38"],
    [/\bchhiyalis\b/g, "46"], [/\bchavalis\b/g, "44"], [/\bbayalis\b/g, "42"],
    [/\bbattis\b/g, "32"], [/\bchalis\b/g, "40"], [/\btees\b/g, "30"],
    [/\bassi\b/g, "80"], [/\bsaath\b/g, "60"], [/\bsau\b/g, "100"],
    [/\bek\b/g, "1"], [/\bdo\b/g, "2"], [/\bteen\b/g, "3"],
    [/\b(?:char|chaar)\b/g, "4"], [/\bpaanch\b/g, "5"], [/\b(?:chhe|chhah)\b/g, "6"],
    [/\bsaat\b/g, "7"], [/\baath\b/g, "8"], [/\bnau\b/g, "9"],
    [/\bdas\b/g, "10"], [/\bgyarah\b/g, "11"], [/\bbarah\b/g, "12"],
    [/\btera\b/g, "13"], [/\bchaudah\b/g, "14"], [/\bpandrah\b/g, "15"],
    [/\bsolah\b/g, "16"], [/\bsatrah\b/g, "17"], [/\bathrah\b/g, "18"],
    [/\bunnis\b/g, "19"], [/\bbees\b/g, "20"],
    [/\b(?:auntie|aunti)\b/g, "aunty"], [/\bpent\b/g, "pant"],
    [/\b(?:shart|shir)\b/g, "shirt"], [/\blehnga\b/g, "lehenga"],
    [/\bshalwar\b/g, "salwar"], [/\b(?:west coat|koti)\b/g, "waistcoat"],
    [/\bkek\b/g, "cake"], [/\bbday\b/g, "birthday"],
    [/\bcheese cake\b/g, "cheesecake"], [/\bcup cake\b/g, "cupcake"],
    [/\bdoughnut\b/g, "donut"], [/\bbrowni\b/g, "brownie"],
    [/\bgizer\b/g, "geyser"], [/\binvertor\b/g, "inverter"],
    [/\bexaust\b/g, "exhaust"], [/\btubelight\b/g, "tube light"],
    [/\bdoor bell\b/g, "doorbell"], [/\bfuse box\b/g, "mcb"],
    [/\bchimney fan\b/g, "exhaust fan"], [/\bpankha\b/g, "ceiling fan"],
    [/\bghanti\b/g, "doorbell"], [/\bswitchboard\b/g, "switch board"],
    [/\bpohe\b/g, "poha"], [/\bparantha\b/g, "paratha"], [/\bdaal\b/g, "dal"],
    [/\bchawal\b/g, "rice"], [/\bdahi\b/g, "curd"],
    [/\bpaneer\s+ki\s+sabji\b/g, "paneer sabzi"],
    [/\b(?:rs|rupee|rupees|rupaye|inr)\b/g, "rupees"],
  ];
  for (const [pattern, replacement] of words) normalized = normalized.replace(pattern, replacement);

  normalized = normalized.replace(/\s+/g, " ").trim();
  if (stripHonorifics) {
    normalized = normalized.replace(/\b([a-z]+)\s+(ji|bhai|didi|aunty|bhaiya|behen|uncle)\b/g, "$1");
  }
  return normalized;
}
