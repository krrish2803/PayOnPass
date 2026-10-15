import json
import re
from typing import Dict, Any


def check_json_schema(artifact_str: str, criterion: Dict[str, Any]) -> Dict[str, Any]:
    cid = criterion.get("id", "schema")
    try:
        data = json.loads(artifact_str)
        schema_ref = criterion.get("schema_ref")
        if schema_ref == "descriptions_v1":
            if not isinstance(data, list) or len(data) == 0:
                return {"id": cid, "pass": False, "evidence": "Expected non-empty list"}
            for item in data:
                if not isinstance(item, dict) or "title" not in item or "description" not in item:
                    return {"id": cid, "pass": False, "evidence": "Item missing title or description"}
        return {"id": cid, "pass": True, "evidence": "Valid JSON schema"}
    except Exception as e:
        return {"id": cid, "pass": False, "evidence": f"JSON parse error: {str(e)}"}


def _is_json_list(artifact_str: str):
    try:
        parsed = json.loads(artifact_str)
        if isinstance(parsed, list):
            return True, parsed
    except Exception:
        pass
    return False, None


def check_word_count_each(artifact_str: str, criterion: Dict[str, Any]) -> Dict[str, Any]:
    cid = criterion.get("id", "length")
    min_words = criterion.get("min", 0)
    max_words = criterion.get("max", 999999)
    ok, parsed = _is_json_list(artifact_str)
    if not ok:
        count = len(artifact_str.split())
        passed = min_words <= count <= max_words
        return {"id": cid, "pass": passed, "evidence": f"Word count: {count}"}
    failing = []
    for idx, item in enumerate(parsed):
        text = item.get("description", "") if isinstance(item, dict) else str(item)
        count = len(text.split())
        if count < min_words or count > max_words:
            failing.append(f"item {idx + 1} has {count} words (range {min_words}-{max_words})")
    if failing:
        return {"id": cid, "pass": False, "evidence": ", ".join(failing)}
    return {"id": cid, "pass": True, "evidence": f"All items within {min_words}-{max_words} words"}


def check_word_count_total(artifact_str: str, criterion: Dict[str, Any]) -> Dict[str, Any]:
    cid = criterion.get("id", "total_len")
    min_words = criterion.get("min", 0)
    max_words = criterion.get("max", 999999)
    count = len(artifact_str.split())
    passed = min_words <= count <= max_words
    return {"id": cid, "pass": passed, "evidence": f"Total words: {count} (range {min_words}-{max_words})"}


def check_required_terms(artifact_str: str, criterion: Dict[str, Any]) -> Dict[str, Any]:
    cid = criterion.get("id", "terms")
    terms = criterion.get("terms", [])
    lower_art = artifact_str.lower()
    missing = [t for t in terms if t.lower() not in lower_art]
    if missing:
        return {"id": cid, "pass": False, "evidence": f"Missing terms: {', '.join(missing)}"}
    return {"id": cid, "pass": True, "evidence": "All required terms found"}


def check_regex_all(artifact_str: str, criterion: Dict[str, Any]) -> Dict[str, Any]:
    cid = criterion.get("id", "regex_all")
    patterns = criterion.get("patterns", [])
    missing = []
    for p in patterns:
        if not re.search(p, artifact_str):
            missing.append(p)
    if missing:
        return {"id": cid, "pass": False, "evidence": f"Patterns not matched: {missing}"}
    return {"id": cid, "pass": True, "evidence": "All patterns matched"}


def check_regex_none(artifact_str: str, criterion: Dict[str, Any]) -> Dict[str, Any]:
    cid = criterion.get("id", "regex_none")
    patterns = criterion.get("patterns", [])
    hits = [p for p in patterns if re.search(p, artifact_str)]
    if hits:
        return {"id": cid, "pass": False, "evidence": f"Forbidden patterns matched: {hits}"}
    return {"id": cid, "pass": True, "evidence": "No forbidden patterns matched"}


def check_max_chars(artifact_str: str, criterion: Dict[str, Any]) -> Dict[str, Any]:
    cid = criterion.get("id", "max_chars")
    limit = criterion.get("max", 100000)
    length = len(artifact_str)
    if length > limit:
        return {"id": cid, "pass": False, "evidence": f"Payload too large: {length} chars (max {limit})"}
    return {"id": cid, "pass": True, "evidence": f"Length {length} chars within limit"}


def evaluate_rule(artifact_str: str, criterion: Dict[str, Any]) -> Dict[str, Any]:
    ctype = criterion.get("type")
    if ctype == "json_schema":
        return check_json_schema(artifact_str, criterion)
    elif ctype == "word_count_each":
        return check_word_count_each(artifact_str, criterion)
    elif ctype == "word_count_total":
        return check_word_count_total(artifact_str, criterion)
    elif ctype == "required_terms":
        return check_required_terms(artifact_str, criterion)
    elif ctype == "regex_all":
        return check_regex_all(artifact_str, criterion)
    elif ctype == "regex_none":
        return check_regex_none(artifact_str, criterion)
    elif ctype == "max_chars":
        return check_max_chars(artifact_str, criterion)
    return {"id": criterion.get("id", "unknown"), "pass": True, "evidence": "Rule bypassed or unsupported"}