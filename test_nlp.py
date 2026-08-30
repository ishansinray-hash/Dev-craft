import json
import re
from datetime import datetime, timedelta, timezone

# ----------------- NORMALIZATION -----------------
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
    ("खिचडी", "khichdi"), ("सब्जी", "sabzi"), ("सब्जी", "sabzi"),
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
    (r"\bgizer\b", "geyser"), (r"\binvertor\b", "inverter"),
    (r"\bexaust\b", "exhaust fan"), (r"\btubelight\b", "tube light"),
    (r"\bdoor bell\b", "doorbell"), (r"\bfuse box\b", "mcb"),
    (r"\bchimney fan\b", "exhaust fan"), (r"\bpankha\b", "ceiling fan"),
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

print("Normalizer ready.")
