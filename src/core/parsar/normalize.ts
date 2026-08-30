/**
 * Normalise Hinglish vocabulary and Devanagari numerals.
 */
export function normalize(text: string): string {
  let s = text.toLowerCase();
  s = s.replace(/[०-९]/g, (digit) => String(digit.charCodeAt(0) - 0x0966));

  const phrases: Array<[string, string]> = [
    ["पनीर की सब्जी", "paneer sabzi"], ["पनीर सब्जी", "paneer sabzi"],
    ["चीज केक", "cheesecake"], ["ट्यूब लाइट", "tube light"],
    ["फ्यूज बॉक्स", "mcb"], ["एसी पॉइंट", "ac point"],
    ["बर्थडे केक", "birthday cake"], ["कप केक", "cupcake"],
    ["पेस्ट्री", "pastry"], ["पजामा", "pajama"], ["दुपट्टा", "dupatta"],
    ["शेरवानी", "sherwani"], ["ब्लाउज", "blouse"], ["सलवार", "salwar"],
    ["शर्ट", "shirt"], ["सूट", "suit"], ["तारीख", "tarikh"], ["तारीख़", "tarikh"],
    ["सॉकेट", "socket"], ["स्विचबोर्ड", "switch board"], ["स्विच बोर्ड", "switch board"],
    ["एमसीबी", "mcb"], ["लहंगा", "lehenga"], ["गीजर", "geyser"], ["मोटर", "water motor"],
    ["दही", "curd"], ["पराठा", "paratha"], ["इडली", "idli"],
    ["छोले", "chole"], ["थाली", "thali"], ["खिचड़ी", "khichdi"],
    ["खिचडी", "khichdi"], ["सब्जी", "sabzi"],
    ["दाल", "dal"], ["चावल", "rice"], ["पनीर", "paneer"], ["राजमा", "rajma"],
    ["ब्रेड", "bread loaf"], ["ब्राउनी", "brownie"], ["डोनट", "donut"],
    ["केक", "cake"], ["कुकी", "cookies"], ["पंखा", "ceiling fan"],
    ["घंटी", "doorbell"], ["वायरिंग", "wiring"],
    ["लाल", "red"], ["नीला", "blue"], ["नीले", "blue"], ["पीला", "yellow"], ["पीले", "yellow"],
    ["हरा", "green"], ["हरे", "green"], ["काला", "black"], ["काले", "black"],
    ["सफेद", "white"], ["गुलाबी", "pink"], ["बैंगनी", "purple"], ["भूरा", "brown"],
  ];
  for (const [from, to] of phrases) s = s.replaceAll(from, to);

  const words: Array<[RegExp, string]> = [
    [/\bdo\s+hazaar\b/g, "2000"],
    [/\bdedh\s+hazaar\b/g, "1500"],
    [/\bhazaar\b/g, "1000"],
    [/\bchhattis\b/g, "36"], [/\baadtis\b/g, "38"],
    [/\bchhiyalis\b/g, "46"], [/\bchavalis\b/g, "44"], [/\bbayalis\b/g, "42"],
    [/\bbattis\b/g, "32"], [/\bchalis\b/g, "40"], [/\btees\b/g, "30"],
    [/\bchautis\b/g, "34"], [/\badtalis\b/g, "48"], [/\bathais\b/g, "28"],
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
    [/\bshalwar\b/g, "salwar"], [/\b(?:west coat|koti|waist coat)\b/g, "waistcoat"],
    [/\bkek\b/g, "cake"], [/\bbday cake\b/g, "birthday cake"],
    [/\bcheese cake\b/g, "cheesecake"], [/\bcup cake\b/g, "cupcake"],
    [/\bdoughnut\b/g, "donut"], [/\bbrowni\b/g, "brownie"],
    [/\bcookies\b/g, "cookies"], [/\bcookie\b/g, "cookies"],
    [/\bgizer\b/g, "geyser"], [/\binvertor\b/g, "inverter"],
    [/\b(?:chimney fan|exhaust fan|exaust)\b/g, "exhaust fan"],
    [/\btubelight\b/g, "tube light"],
    [/\bdoor bell\b/g, "doorbell"], [/\bfuse box\b/g, "mcb"],
    [/\bpankha\b/g, "ceiling fan"],
    [/\bghanti\b/g, "doorbell"], [/\bswitchboard\b/g, "switch board"],
    [/\bpohe\b/g, "poha"], [/\bparantha\b/g, "paratha"], [/\bdaal\b/g, "dal"],
    [/\bchawal\b/g, "rice"], [/\bdahi\b/g, "curd"],
    [/\bpaneer\s+ki\s+sabji\b/g, "paneer sabzi"],
    [/\bpaneer\s+sabji\b/g, "paneer sabzi"],
    [/\bpaneer\s+ki\s+sabzi\b/g, "paneer sabzi"],
    [/\bsabji\b/g, "sabzi"],
    [/\b(?:rs|rupee|rupees|rupaye|inr)\b/g, "rupees"],
  ];
  for (const [pattern, replacement] of words) s = s.replace(pattern, replacement);

  return s.replace(/\s+/g, " ").trim();
}
