import json
import re
import sys
from pathlib import Path
sys.path.insert(0, "Given_materials")
from score import load, score_record

def evaluate_parser(parse_fn):
    train = json.load(open("Given_materials/messages_train.json"))
    preds = {}
    for row in train:
        preds[row["id"]] = parse_fn(row)
    
    total_score = 0.0
    field_accs = []
    date_hits = []
    clarify_hits = []
    
    for row in train:
        sc = score_record(row["expected"], preds[row["id"]])
        total_score += sc["total"]
        field_accs.append(sc["field_accuracy"])
        date_hits.append(sc["date_hit"])
        clarify_hits.append(sc["clarification_hit"])
        
    n = len(train)
    avg_total = total_score / n
    avg_field = sum(field_accs) / n
    avg_date = sum(date_hits) / n
    avg_clarify = sum(clarify_hits) / n
    
    print(f"Messages: {n}")
    print(f"Field-level: {avg_field:.4f} (60%) -> {0.60 * avg_field:.4f}")
    print(f"Date:       {avg_date:.4f} (20%) -> {0.20 * avg_date:.4f}")
    print(f"Clarify:    {avg_clarify:.4f} (20%) -> {0.20 * avg_clarify:.4f}")
    print(f"TOTAL:      {avg_total:.4f}")
    return avg_total

print("Evaluator loaded.")
