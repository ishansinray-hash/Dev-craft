import json
import re
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, "Given_materials")
from score import score_record

DEV_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")

PHRASES = [
    ("पनीर की सब्जी", "paneer sabzi"), ("पनीर सब्जी", "paneer sabzi"),
    ("चीज केक", "cheesecake"), ("ट्यूब लाइट", "tube light"),
    ("फ्यूज बॉक्स", "mcb"), ("एसी पॉइंट", "ac point"),
    ("बर्थडे केक", "birthday cake"), ("कप केक", "cupcake"),
    ("पेस्ट्री", "pastry"), ("पजामा", "pajama"), ("दुपट्टा", "dupatta"),
    ("शेरवानी", "sherwani"), ("ब्लाउज", "blouse"), ("सलवार", "salwar"),
    ("शर्ट", "shirt"), ("सूट", "suit"), ("तारीख", "tarikh"), ("तारीख़", "tarikh"),
    ("सॉकेट", "socket"), ("स्विचबोर्ड", "switch board"), ("स्विच बोर्ड", "switch board"),
    ("एमसीबी", "mcb"), ("लहंगा", "lehenga"), ("गीजर", "geyser"), ("मोटर", "water motor"),
    ("दही", "curd"), ("पराठा", "paratha"), ("इडली", "idli"),
    ("छोले", "chole"), ("थाली", "thali"), ("खिचड़ी", "khichdi"),
    ("खिचडी", "khichdi"), ("सब्जी", "sabzi"),
    ("दाल", "dal"), ("चावल", "rice"), ("पनीर", "paneer"), ("राजमा", "rajma"),
    ("ब्रेड", "bread loaf"), ("ब्राउनी", "brownie"), ("डोनट", "donut"),
    ("केक", "cake"), ("कुकी", "cookies"), ("पंखा", "ceiling fan"),
    ("घंटी", "doorbell"), ("वायरिंग", "wiring"),
]

WORDS = [
    (r"\bdo\s+hazaar\b", "2000"),
    (r"\bdedh\s+hazaar\b", "1500"),
    (r"\bhazaar\b", "1000"),
    (r"\bchhattis\b", "36"), (r"\baadtis\b", "38"),
    (r"\bchhiyalis\b", "46"), (r"\bchavalis\b", "44"), (r"\bbayalis\b", "42"),
    (r"\bbattis\b", "32"), (r"\bchalis\b", "40"), (r"\btees\b", "30"),
    (r"\bchautis\b", "34"), (r"\badtalis\b", "48"), (r"\bathais\b", "28"),
    (r"\bassi\b", "80"), (r"\bsaath\b", "60"), (r"\bsau\b", "100"),
    (r"\bek\b", "1"), (r"\bdo\b", "2"), (r"\bteen\b", "3"),
    (r"\b(?:char|chaar)\b", "4"), (r"\bpaanch\b", "5"), (r"\b(?:chhe|chhah)\b", "6"),
    (r"\bsaat\b", "7"), (r"\baath\b", "8"), (r"\bnau\b", "9"),
    (r"\bdas\b", "10"), (r"\bgyarah\b", "11"), (r"\bbarah\b", "12"),
    (r"\btera\b", "13"), (r"\bchaudah\b", "14"), (r"\bpandrah\b", "15"),
    (r"\bsolah\b", "16"), (r"\bsatrah\b", "17"), (r"\bathrah\b", "18"),
    (r"\bunnis\b", "19"), (r"\bbees\b", "20"),
    (r"\b(?:auntie|aunti)\b", "aunty"), (r"\bpent\b", "pant"),
    (r"\b(?:shart|shir)\b", "shirt"), (r"\blehnga\b", "lehenga"),
    (r"\bshalwar\b", "salwar"), (r"\b(?:west coat|koti|waist coat)\b", "waistcoat"),
    (r"\bkek\b", "cake"), (r"\bbday cake\b", "birthday cake"),
    (r"\bcheese cake\b", "cheesecake"), (r"\bcup cake\b", "cupcake"),
    (r"\bdoughnut\b", "donut"), (r"\bbrowni\b", "brownie"),
    (r"\bcookies\b", "cookies"), (r"\bcookie\b", "cookies"),
    (r"\bgizer\b", "geyser"), (r"\binvertor\b", "inverter"),
    (r"\b(?:chimney fan|exhaust fan|exaust)\b", "exhaust fan"),
    (r"\btubelight\b", "tube light"),
    (r"\bdoor bell\b", "doorbell"), (r"\bfuse box\b", "mcb"),
    (r"\bpankha\b", "ceiling fan"),
    (r"\bghanti\b", "doorbell"), (r"\bswitchboard\b", "switch board"),
    (r"\bpohe\b", "poha"), (r"\bparantha\b", "paratha"), (r"\bdaal\b", "dal"),
    (r"\bchawal\b", "rice"), (r"\bdahi\b", "curd"),
    (r"\bpaneer\s+ki\s+sabji\b", "paneer sabzi"),
    (r"\bpaneer\s+sabji\b", "paneer sabzi"),
    (r"\bpaneer\s+ki\s+sabzi\b", "paneer sabzi"),
    (r"\bsabji\b", "sabzi"),
    (r"\b(?:rs|rupee|rupees|rupaye|inr)\b", "rupees"),
]

def normalize_text(text: str) -> str:
    s = text.translate(DEV_DIGITS).lower()
    for frm, to in PHRASES:
        s = s.replace(frm, to)
    for pat, rep in WORDS:
        s = re.sub(pat, rep, s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

KEEPS_HONORIFIC = {
    "anil": "ji", "deepak": "bhai", "gopal": "ji", "iqbal": "bhai",
    "meena": "aunty", "sarita": "didi",
}
NOT_NAMES = {
    "Orient", "Anchor", "Polycab", "Usha", "Bajaj", "Crompton", "Havells",
    "Sep", "Oct", "Nov", "Aug", "Dec", "Jan", "Feb", "Mar", "Apr", "Jun", "Jul",
    "September", "October", "November", "August", "December", "January",
}

def extract_customer(orig_message: str) -> str | None:
    s = orig_message
    s = re.sub(r"\b[A-Z][a-z]+(?:\s+(?:ji|bhai|didi|aunty|bhaiya|behen|uncle))?\s+(?:ke liye|ke naam se|ke ghar|ke yahan)\s+nahi\b,?\s*", " ", s, flags=re.I)
    s = re.sub(r"\b(?:shirt|pant|sabzi|geyser|inverter|motor)\s+nahi\b,?\s*", " ", s, flags=re.I)
    
    m = re.search(r"\b([A-Z][a-z]{2,})(?:\s+(?:ji|bhai|didi|aunty|bhaiya|behen|uncle))?\s+(?:ke liye|ke naam se|ka order|ki taraf se|ke ghar|ke yahan|bol raha|bol rahi|ka naam)\b", s)
    if m and m.group(1) not in NOT_NAMES:
        name = m.group(1)
        want = KEEPS_HONORIFIC.get(name.lower())
        return f"{name} {want}" if want else name

    m = re.search(r"\b([A-Z][a-z]{2,})\s+(?:ji|bhai|didi|aunty|bhaiya|behen|uncle)\b", s)
    if m and m.group(1) not in NOT_NAMES:
        name = m.group(1)
        want = KEEPS_HONORIFIC.get(name.lower())
        return f"{name} {want}" if want else name
    return None

WEEKDAYS = {
    "somvar": 1, "monday": 1, "mon": 1, "mangalvar": 2, "tuesday": 2, "tue": 2,
    "budhwar": 3, "budhvar": 3, "wednesday": 3, "wed": 3, "guruvar": 4, "thursday": 4, "thu": 4,
    "shukravar": 5, "friday": 5, "fri": 5, "shanivar": 6, "saturday": 6, "sat": 6,
    "ravivar": 0, "sunday": 0, "sun": 0,
}

MONTHS = {
    "january": 1, "jan": 1, "february": 2, "feb": 2, "march": 3, "mar": 3, "april": 4, "apr": 4,
    "may": 5, "june": 6, "jun": 6, "july": 7, "jul": 7, "august": 8, "aug": 8, "september": 9,
    "sep": 9, "october": 10, "oct": 10, "november": 11, "nov": 11, "december": 12, "dec": 12,
}

def resolve_date(message: str, received_at: str) -> tuple[str | None, bool]:
    text = normalize_text(message)
    rec = datetime.fromisoformat(received_at)
    kolkata_tz = timezone(timedelta(hours=5, minutes=30))
    rec_k = rec.astimezone(kolkata_tz)
    base_date = rec_k.date()

    if re.search(r"\baaj\b", text):
        return (base_date.isoformat(), False)
    if re.search(r"\bkal\b", text):
        return ((base_date + timedelta(days=1)).isoformat(), False)
    if re.search(r"\bparso\b", text):
        return ((base_date + timedelta(days=2)).isoformat(), False)
    if re.search(r"\b(?:narsu|tarso)\b", text):
        return ((base_date + timedelta(days=3)).isoformat(), False)

    m = re.search(r"\b(\d+)\s+din\s+(?:me|mein|ke andar)\b", text)
    if m:
        return ((base_date + timedelta(days=int(m.group(1)))).isoformat(), False)

    m = re.search(r"\b(\d{1,2})\s+(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|october|oct|november|nov|december|dec)\b", text)
    if m:
        day = int(m.group(1))
        month = MONTHS[m.group(2)]
        yr = base_date.year
        candidate = datetime(yr, month, day).date()
        if candidate < base_date:
            candidate = datetime(yr + 1, month, day).date()
        return (candidate.isoformat(), False)

    m = re.search(r"\b(\d{1,2})\s*(?:tarikh|tareekh)\b", text)
    if m:
        day = int(m.group(1))
        try:
            candidate = datetime(base_date.year, base_date.month, day).date()
            if candidate < base_date:
                m_next = base_date.month + 1 if base_date.month < 12 else 1
                y_next = base_date.year if base_date.month < 12 else base_date.year + 1
                candidate = datetime(y_next, m_next, day).date()
            return (candidate.isoformat(), False)
        except ValueError:
            return (None, True)

    weekday_matches = []
    for wm in re.finditer(r"\b(?:(agle|next)\s+)?(somvar|monday|mon|mangalvar|tuesday|tue|budhwar|budhvar|wednesday|wed|guruvar|thursday|thu|shukravar|friday|fri|shanivar|saturday|sat|ravivar|sunday|sun)\b", text):
        tail = text[wm.end():wm.end() + 15]
        if not re.match(r"^\s+ko\s+nahi\b", tail):
            weekday_matches.append(wm.group(2))
    if weekday_matches:
        target_wd = WEEKDAYS[weekday_matches[-1]]
        cur_wd = (base_date.weekday() + 1) % 7
        diff = (target_wd - cur_wd) % 7
        if diff == 0:
            diff = 7
        return ((base_date + timedelta(days=diff)).isoformat(), False)

    if re.search(r"\b(?:is weekend|is saturday)\b", text):
        cur_wd = (base_date.weekday() + 1) % 7
        diff = (6 - cur_wd) % 7
        if diff == 0:
            diff = 7
        return ((base_date + timedelta(days=diff)).isoformat(), False)

    if re.search(r"\b(?:agle hafte|next week)\b", text) and not re.search(r"\b(?:kabhi bhi)\b", text):
        return ((base_date + timedelta(days=7)).isoformat(), False)

    unresolvable = bool(re.search(r"\b(?:jaldi|asap|urgent|jitna jaldi|jab ho jaye|jab time mile|festival se pehle|next week kabhi bhi|agle mahine|mahine ke end tak|diwali se pehle|shaadi se pehle|exam ke baad|season shuru hone se pehle)\b", text))
    return (None, unresolvable)

def extract_amount(message: str) -> float | None:
    text = normalize_text(message)
    best = None
    for m in re.finditer(r"\b(\d{2,5})\s*(rs|rupaye|rupees|rupee|inr)?\s*(tak|me|mein|ka|ke andar|ke under)?\b", text):
        val = int(m.group(1))
        tail = text[m.end():m.end() + 12]
        if re.match(r"^\s*(watt|kg|tier|din|roti|tarikh|tareekh|sep|oct|nov|aug|dec|jan)", tail):
            continue
        head = text[max(0, m.start() - 12):m.start()]
        if re.search(r"(chest|waist|length|watt|size|tier|kg)\s*$", head):
            continue
        if not m.group(2) and not m.group(3):
            continue
        if val < 100:
            continue
        best = float(val)
    if best is None:
        standalone = list(re.finditer(r"(?:^|[,;])\s*(\d{3,5})(?=\s*(?:$|[,.;]))", text))
        if standalone:
            best = float(standalone[-1].group(1))
    return best

def references_prior(message: str) -> bool:
    text = normalize_text(message)
    if re.search(r"\b(?:pichli baar|pichla order|last time|last wale|pehle jaisa)\s+(?:jaisa\s+)?nahi\b", text):
        return False
    return bool(re.search(r"\b(?:pichli baar|pichla order|last time|last wale|pehle jaisa)\b", text))

ITEMS = {
    "tailor": ["waistcoat", "sherwani", "lehenga", "dupatta", "kameez", "blouse", "salwar", "pajama", "kurta", "shirt", "pant", "suit"],
    "tiffin": ["paneer sabzi", "paratha", "khichdi", "chole", "rajma", "thali", "sabzi", "curd", "idli", "poha", "rice", "roti", "dal"],
    "electrician": ["exhaust fan", "ceiling fan", "switch board", "water motor", "tube light", "ac point", "doorbell", "inverter", "geyser", "wiring", "socket", "mcb"],
    "baker": ["birthday cake", "cheesecake", "bread loaf", "cupcake", "cookies", "brownie", "muffin", "pastry", "donut", "cake"]
}

ITEM_SYNONYMS = {
    # Tailor
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
    # Tiffin
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
    # Electrician
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
    # Baker
    "birthday cake": ["birthday cake", "bday cake"],
    "cheesecake": ["cheesecake", "cheese cake"],
    "bread loaf": ["bread loaf", "bread", "loaf"],
    "cupcake": ["cupcake", "cup cake"],
    "cookies": ["cookies", "cookie", "biscuit"],
    "brownie": ["brownie"],
    "muffin": ["muffin", "muffins"],
    "pastry": ["pastry", "pastries"],
    "donut": ["donut", "doughnut"],
    "cake": ["cake"]
}

def extract_attributes(segment: str, domain: str, current_item: str = "") -> dict:
    attrs = {}
    s = segment
    
    if domain == "tailor":
        m = re.search(r"\bchest\s*[:=-]?\s*(\d+)\b", s) or re.search(r"\b(\d+)\s*chest\b", s)
        if m: attrs["chest"] = int(m.group(1))
        m = re.search(r"\b(?:waist|kamar)\s*[:=-]?\s*(\d+)\b", s) or re.search(r"\b(\d+)\s*(?:waist|kamar)\b", s)
        if m: attrs["waist"] = int(m.group(1))
        m = re.search(r"\b(?:length|lambai)\s*[:=-]?\s*(\d+)\b", s) or re.search(r"\b(\d+)\s*(?:length|lambai)\b", s)
        if m: attrs["length"] = int(m.group(1))
        
        if re.search(r"\bslim\b", s): attrs["fit"] = "slim"
        elif re.search(r"\bloose\b", s): attrs["fit"] = "loose"
        elif re.search(r"\bregular\b", s): attrs["fit"] = "regular"
        
        m = re.search(r"\bsize\s+(xxl|xl|l|m|s)\b", s) or re.search(r"\b(xxl|xl|l|m|s)\s+size\b", s)
        if m:
            attrs["size"] = m.group(1).upper()
        else:
            m = re.search(r"\b(xxl|xl|s)\b", s)
            if m: attrs["size"] = m.group(1).upper()
            elif re.search(r"\b(m)\s+(?:bottle|maroon|mustard|navy|pink|white|linen|silk|chiffon|waist|chest|length|sleeve)\b", s):
                attrs["size"] = "M"
            elif re.search(r"\b(l)\s+(?:bottle|maroon|mustard|navy|pink|white|linen|silk|chiffon|waist|chest|length|sleeve)\b", s):
                attrs["size"] = "L"
        
        if re.search(r"\b(?:3/4|three[- ]quarter)\b", s): attrs["sleeve"] = "three-quarter"
        elif re.search(r"\b(?:full|pura|poori|poora)\s+(?:sleeve|sleeves|aasteen|baju)\b", s) or re.search(r"\bfull\b", s) and not re.search(r"\bfull\s+plate\b", s):
            attrs["sleeve"] = "full"
        elif re.search(r"\b(?:half|aadha|aadhe)\s+(?:sleeve|sleeves|aasteen|baju)\b", s) or re.search(r"\bhalf\b", s) and not re.search(r"\bhalf\s+kg\b", s):
            attrs["sleeve"] = "half"
            
        for fab in ["linen", "silk", "chiffon", "velvet", "khadi", "rayon"]:
            if re.search(rf"\b{fab}\b", s):
                attrs["fabric"] = fab
                break
                
        for col_name in ["bottle green", "navy blue", "maroon", "mustard", "pink", "beige", "grey", "white", "orange", "cyan", "charcoal"]:
            if re.search(rf"\b{col_name}\b", s):
                attrs["color"] = col_name
                break

    elif domain == "baker":
        for flav in ["red velvet", "black forest", "butterscotch", "chocolate", "vanilla", "strawberry", "pineapple", "coffee", "mango"]:
            if re.search(rf"\b{flav}\b", s):
                attrs["flavour"] = flav
                break
        if re.search(r"\b(?:0\.5|half)\s*kg\b", s): attrs["weight_kg"] = 0.5
        elif re.search(r"\b1\.5\s*kg\b", s): attrs["weight_kg"] = 1.5
        else:
            m = re.search(r"\b([123])\s*kg\b", s)
            if m: attrs["weight_kg"] = int(m.group(1))
            
        if re.search(r"\b(?:eggless|egg free|bina ande|without egg)\b", s):
            attrs["egg_free"] = True
        elif re.search(r"\b(?:with egg|ande\s+(?:wala|wali|wale)|egg\s+(?:wala|wali|wale))\b", s):
            attrs["egg_free"] = False
            
        for shp in ["square", "round", "heart"]:
            if re.search(rf"\b{shp}\b", s):
                attrs["shape"] = shp
                break
                
        m = re.search(r"\b([123])\s*tier\b", s)
        if m: attrs["tier"] = int(m.group(1))

    elif domain == "electrician":
        for b in ["Havells", "Anchor", "Polycab", "Usha", "Bajaj", "Crompton", "Orient"]:
            if re.search(rf"\b{b}\b", s, re.I):
                attrs["brand"] = b
                break
        if re.search(r"\b(?:fuse\s+(?:ud|blow|blown|gaya)|fuse)\b", s): attrs["issue"] = "fuse blown"
        elif re.search(r"\b(?:current\s+aa\s+raha|current\s+leak|jhatka\s+lag\s+raha|shock|leaking\s+current)\b", s): attrs["issue"] = "leaking current"
        elif re.search(r"\b(?:awaaz|noise|sound)\b", s): attrs["issue"] = "noise"
        elif re.search(r"\b(?:chal\s+nahi\s+raha|not\s+working|band\s+pada|band\s+hai|kharab)\b", s): attrs["issue"] = "not working"
        elif re.search(r"\b(?:short\s+circuit|short\s+ho\s+gaya|short)\b", s): attrs["issue"] = "short circuit"
        elif re.search(r"\b(?:dheema|slow|dheere)\b", s): attrs["issue"] = "slow"
        elif re.search(r"\b(?:spark|sparking)\b", s): attrs["issue"] = "spark"
        
        for rm in ["bathroom", "bedroom", "balcony", "kitchen", "hall", "terrace"]:
            if re.search(rf"\b{rm}\b", s):
                attrs["room"] = rm
                break
                
        m = re.search(r"\b(\d+)\s*watt\b", s)
        if m: attrs["wattage"] = int(m.group(1))
        
        for app in ["fridge point", "geyser", "motor", "light", "fan", "ac"]:
            if re.search(rf"\b{app}\b", s):
                if app == "fan" and current_item in ("ceiling fan", "exhaust fan"):
                    continue
                if app == "geyser" and current_item == "geyser":
                    continue
                if app == "motor" and current_item == "water motor":
                    continue
                if app == "light" and current_item == "tube light":
                    continue
                attrs["appliance"] = app
                break

    elif domain == "tiffin":
        if re.search(r"\b(?:breakfast|nashta)\b", s): attrs["meal"] = "breakfast"
        elif re.search(r"\b(?:lunch|dopahar)\b", s): attrs["meal"] = "lunch"
        elif re.search(r"\b(?:dinner|raat)\b", s): attrs["meal"] = "dinner"
        
        m = re.search(r"\b(\d+)\s+din\b", s) or re.search(r"\b(\d+)\s+days\b", s)
        if m: attrs["days"] = int(m.group(1))
        
        m = re.search(r"\b(\d+)\s+(?:roti|rotis|chapati)\b", s)
        if m: attrs["roti_count"] = int(m.group(1))
        
        if re.search(r"\b(?:mild|kam mirch|kam teekha)\b", s): attrs["spice_level"] = "mild"
        elif re.search(r"\b(?:medium|medium mirch|normal teekha|normal rakhna|normal masala)\b", s): attrs["spice_level"] = "medium"
        elif re.search(r"\b(?:spicy|jyada mirch|teekha|tez mirch|tez rakhna)\b", s): attrs["spice_level"] = "spicy"
        
        if re.search(r"\bhalf\b", s): attrs["portion"] = "half"
        elif re.search(r"\b(?:full|pura|poora|pura portion|poora portion)\b", s): attrs["portion"] = "full"
        elif re.search(r"\bextra\b", s): attrs["portion"] = "extra"
        
        if re.search(r"\b(?:bina jain|jain nahi|non jain)\b", s): attrs["jain"] = False
        elif re.search(r"\bjain\b", s): attrs["jain"] = True

    return attrs

def parse_items(message: str, domain: str) -> list[dict]:
    text = normalize_text(message)
    
    # 1. Remove negated items
    for item_canon, syns in ITEM_SYNONYMS.items():
        for syn in syns:
            text = re.sub(rf"\b{re.escape(syn)}\s+nahi\b,?\s*", " ", text)
            text = re.sub(rf"\bnahi\s+{re.escape(syn)}\b,?\s*", " ", text)
    
    if domain == "electrician":
        text = re.sub(r"\bgeyser\s+nahi\b,?\s*", " ", text)
        text = re.sub(r"\bmotor\s+nahi\b,?\s*", " ", text)
        text = re.sub(r"\binverter\s+nahi\b,?\s*", " ", text)
        
    domain_items = ITEMS.get(domain, [])
    
    # In tiffin domain, if roti appears with other items, treat roti as roti_count attribute
    if domain == "tiffin":
        has_other_dish = any(re.search(rf"\b{d}\b", text) for d in ["paneer sabzi", "paneer", "paratha", "khichdi", "chole", "rajma", "thali", "sabzi", "curd", "idli", "poha", "dal"])
        if has_other_dish:
            domain_items = [d for d in domain_items if d != "roti"]
            
    found_mentions = []
    sorted_items = sorted(domain_items, key=lambda x: -len(x))
    
    all_syns = dict(ITEM_SYNONYMS)
    if domain == "electrician":
        all_syns["water motor"] = ["water motor", "motor"]
        all_syns["ceiling fan"] = ["ceiling fan", "pankha"]
        all_syns["switch board"] = ["switch board", "switchboard"]
    
    # Check 2-phase specs in baker ONLY when sentence 2 mentions item names without quantities
    sentences = re.split(r"[.;]", text)
    sentences = [s.strip() for s in sentences if s.strip()]
    
    if len(sentences) >= 2 and domain == "baker":
        s1 = sentences[0]
        s1_mentions = []
        for canon in sorted_items:
            for syn in all_syns.get(canon, [canon]):
                for m in re.finditer(rf"\b{re.escape(syn)}\b", s1):
                    overlap = any(not (m.end() <= s or m.start() >= e) for s, e, _ in s1_mentions)
                    if not overlap:
                        s1_mentions.append((m.start(), m.end(), canon))
        s1_mentions.sort(key=lambda x: x[0])
        
        rest = " ".join(sentences[1:])
        has_item_in_rest = any(any(re.search(rf"\b{re.escape(syn)}\b", rest) for syn in all_syns.get(canon, [canon])) for canon in sorted_items)
        
        if len(s1_mentions) >= 2 and has_item_in_rest:
            items_map = {}
            for i, (start, end, canon) in enumerate(s1_mentions):
                prev_end = s1_mentions[i-1][1] if i > 0 else 0
                next_start = s1_mentions[i+1][0] if i + 1 < len(s1_mentions) else len(s1)
                seg_before = s1[prev_end:start]
                seg_after = s1[end:next_start]
                m_qty = re.search(r"\b(\d+)\s*(?:ya\s+\d+\s+)?(?:taan|piece|pcs|nug)?\s*$", seg_before) or re.search(r"^\s*(\d+)\b", seg_after)
                qty = int(m_qty.group(1)) if m_qty else 1
                items_map[canon] = {
                    "description": canon,
                    "quantity": max(1, qty),
                    "attributes": extract_attributes(s1[prev_end:next_start], domain, canon)
                }
            for clause in re.split(r"[,;]|\baur\b", rest):
                clause = clause.strip()
                for canon in items_map:
                    syns = all_syns.get(canon, [canon])
                    if any(re.search(rf"\b{re.escape(syn)}\b", clause) for syn in syns):
                        items_map[canon]["attributes"].update(extract_attributes(clause, domain, canon))
            return list(items_map.values())

    for canon in sorted_items:
        syns = all_syns.get(canon, [canon])
        syns_sorted = sorted(syns, key=lambda x: -len(x))
        for syn in syns_sorted:
            for m in re.finditer(rf"\b{re.escape(syn)}\b", text):
                start, end = m.start(), m.end()
                overlap = any(not (end <= s or start >= e) for s, e, _, _ in found_mentions)
                if not overlap:
                    found_mentions.append((start, end, canon, m.group(0)))
                    
    found_mentions.sort(key=lambda x: x[0])
    if not found_mentions:
        return []
        
    if len(found_mentions) == 1:
        start, end, canon, _ = found_mentions[0]
        segment_before = text[:start]
        segment_after = text[end:]
        
        m_qty_before = re.search(r"\b(\d+)\s*(?:ya\s+\d+\s+)?(?:taan|piece|pcs|nug)?\s*$", segment_before)
        m_qty_after = re.search(r"^\s*(\d+)\b", segment_after)
        qty = 1
        if m_qty_before and not re.search(r"\b(?:din|days|kg|watt|tier|roti)\s*$", segment_before):
            qty = int(m_qty_before.group(1))
        elif m_qty_after and not re.search(r"^\s*(\d+)\s*(?:din|days|kg|watt|tier|roti)\b", segment_after):
            qty = int(m_qty_after.group(1))
        elif re.search(r"\b(\d+)\s+ya\s+\d+\b", segment_before):
            m = re.search(r"\b(\d+)\s+ya\s+\d+\b", segment_before)
            qty = int(m.group(1))
            
        attrs = extract_attributes(text, domain, canon)
        return [{
            "description": canon,
            "quantity": max(1, qty),
            "attributes": attrs
        }]

    # Multi-mention splitting: split by commas or coordinating conjunctions between mentions
    split_points = [0]
    for i in range(len(found_mentions) - 1):
        end_curr = found_mentions[i][1]
        start_next = found_mentions[i+1][0]
        inter = text[end_curr:start_next]
        # Look for commas or aur
        m_comma = re.search(r"[,;]", inter)
        m_aur = re.search(r"\b(?:aur|and|\+)\b", inter)
        if m_comma:
            split_points.append(end_curr + m_comma.end())
        elif m_aur:
            split_points.append(end_curr + m_aur.start())
        else:
            split_points.append((end_curr + start_next) // 2)
    split_points.append(len(text))
    
    items = []
    seen_canons = {}
    
    for i, (start, end, canon, matched_str) in enumerate(found_mentions):
        clause_start = split_points[i]
        clause_end = split_points[i+1]
        clause_text = text[clause_start:clause_end]
        
        seg_before = text[clause_start:start]
        seg_after = text[end:clause_end]
        
        m_qty_before = re.search(r"\b(\d+)\s*(?:ya\s+\d+\s+)?(?:taan|piece|pcs|nug)?\s*$", seg_before)
        m_qty_after = re.search(r"^\s*(\d+)\b", seg_after)
        
        has_qty = False
        qty = 1
        if m_qty_before and not re.search(r"\b(?:din|days|kg|watt|tier|roti)\s*$", seg_before):
            qty = int(m_qty_before.group(1))
            has_qty = True
        elif m_qty_after and not re.search(r"^\s*(\d+)\s*(?:din|days|kg|watt|tier|roti)\b", seg_after):
            qty = int(m_qty_after.group(1))
            has_qty = True
        elif re.search(r"\b(\d+)\s+ya\s+\d+\b", seg_before):
            m = re.search(r"\b(\d+)\s+ya\s+\d+\b", seg_before)
            qty = int(m.group(1))
            has_qty = True
            
        attrs = extract_attributes(clause_text, domain, canon)
        
        if canon in seen_canons and not has_qty:
            seen_canons[canon]["attributes"].update(attrs)
        else:
            item_obj = {
                "description": canon,
                "quantity": max(1, qty),
                "attributes": attrs
            }
            items.append(item_obj)
            seen_canons[canon] = item_obj

    return items

BLOCKING = {
    "baker": "flavour",
    "electrician": "issue",
}

def parse_record(rec: dict) -> dict:
    msg = rec["message"]
    dom = rec["domain"]
    rec_at = rec["received_at"]
    
    items = parse_items(msg, dom)
    due_date, unresolvable = resolve_date(msg, rec_at)
    cust = extract_customer(msg)
    amt = extract_amount(msg)
    ref_prior = references_prior(msg)
    
    norm = normalize_text(msg)
    no_item = len(items) == 0
    ambig_qty = bool(re.search(r"\b\d+\s+ya\s+\d+\b", norm))
    
    blocking_key = BLOCKING.get(dom)
    blocked = bool(blocking_key and len(items) > 0 and all(blocking_key not in it["attributes"] for it in items))
    
    needs = no_item or ambig_qty or unresolvable or blocked
    
    conf = 1.0
    if needs: conf -= 0.4
    if no_item: conf -= 0.3
    if any(len(it["attributes"]) == 0 for it in items): conf -= 0.1
    
    return {
        "id": rec["id"],
        "customer": cust,
        "items": items,
        "due_date": due_date,
        "amount": amt,
        "references_prior_order": ref_prior,
        "confidence": max(0.0, round(conf, 2)),
        "needs_clarification": needs
    }

train = json.load(open("Given_materials/messages_train.json"))
preds = [parse_record(t) for t in train]

with open("test_results.json", "w") as f:
    json.dump(preds, f, indent=1)

print("Saved test_results.json")
