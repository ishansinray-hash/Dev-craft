export type Domain = "tailor" | "baker" | "electrician" | "tiffin";

export const BLOCKING: Partial<Record<Domain, string>> = {
  baker: "flavour",
  electrician: "issue",
};

export const ITEMS: Record<Domain, string[]> = {
  tailor: ["waistcoat", "sherwani", "lehenga", "dupatta", "kameez", "blouse", "salwar", "pajama", "kurta", "shirt", "pant", "suit"],
  tiffin: ["paneer sabzi", "paratha", "khichdi", "chole", "rajma", "thali", "sabzi", "curd", "idli", "poha", "rice", "roti", "dal"],
  electrician: ["exhaust fan", "ceiling fan", "switch board", "water motor", "tube light", "ac point", "doorbell", "inverter", "geyser", "wiring", "socket", "mcb"],
  baker: ["birthday cake", "cheesecake", "bread loaf", "cupcake", "cookies", "brownie", "muffin", "pastry", "donut", "cake"],
};

export const ITEM_SYNONYMS: Record<string, string[]> = {
  // Tailor
  "waistcoat": ["waistcoat", "west coat", "koti", "waist coat"],
  "sherwani": ["sherwani"],
  "lehenga": ["lehenga", "lehnga", "ghagra"],
  "dupatta": ["dupatta", "chunni", "odhani"],
  "kameez": ["kameez", "kamiz"],
  "blouse": ["blouse", "choli"],
  "salwar": ["salwar", "shalwar"],
  "pajama": ["pajama", "pyjama", "pajamas", "pyjamas", "churidar"],
  "kurta": ["kurta", "kurti"],
  "shirt": ["shirt", "shir", "shart", "tshirt", "t-shirt"],
  "pant": ["pant", "pants", "pent"],
  "suit": ["suit"],
  // Tiffin
  "paneer sabzi": ["paneer sabzi", "paneer ki sabji", "paneer sabji", "paneer ki sabzi", "paneer"],
  "paratha": ["paratha", "parantha"],
  "khichdi": ["khichdi", "khichri"],
  "chole": ["chole", "chana"],
  "rajma": ["rajma"],
  "thali": ["thali"],
  "sabzi": ["sabzi", "sabji", "bhaji"],
  "curd": ["curd", "dahi"],
  "idli": ["idli"],
  "poha": ["poha", "pohe"],
  "rice": ["rice", "chawal"],
  "roti": ["roti", "chapati", "fulka"],
  "dal": ["dal", "daal"],
  // Electrician
  "exhaust fan": ["exhaust fan", "chimney fan"],
  "ceiling fan": ["ceiling fan", "pankha"],
  "switch board": ["switch board", "switchboard"],
  "water motor": ["water motor"],
  "tube light": ["tube light", "tubelight"],
  "ac point": ["ac point"],
  "doorbell": ["doorbell", "ghanti", "door bell"],
  "inverter": ["inverter", "invertor"],
  "geyser": ["geyser", "gizer"],
  "wiring": ["wiring", "wire"],
  "socket": ["socket", "plug", "plug point"],
  "mcb": ["mcb", "fuse box"],
  // Baker
  "birthday cake": ["birthday cake", "bday cake"],
  "cheesecake": ["cheesecake", "cheese cake"],
  "bread loaf": ["bread loaf", "bread", "loaf"],
  "cupcake": ["cupcake", "cup cake"],
  "cookies": ["cookies", "cookie", "biscuit"],
  "brownie": ["brownie"],
  "muffin": ["muffin", "muffins"],
  "pastry": ["pastry", "pastries"],
  "donut": ["donut", "doughnut"],
  "cake": ["cake"],
};
