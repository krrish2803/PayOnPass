import re
from typing import Tuple

# Strip zero-width / BOM / control characters that are used to smuggle payloads
# past a naive regex scan (adversarial suite "unicode tricks").
_ZERO_WIDTH = re.compile(
    "[\u200b\u200c\u200d\u2060\ufeff\u00ad\u200e\u200f\u202a-\u202e]"
)
# Visually-confusable characters that attackers substitute into instructions.
_CONFUSABLES = {
    "і": "i", "ⅰ": "i", "sysтem": "system",
    "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "х": "x",
    "ÿ": "y", "Α": "A", "Ε": "E", "О": "O",
}

INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|above|rules|instructions)",
    r"disregard\s+(all\s+)?(previous|earlier|above)",
    r"system\s+prompt",
    r"you\s+are\s+now",
    r"act\s+as\s+(the|an?)\s+grader",
    r"score\s*(?:is|:|=)?\s*100(?:%|\b)",
    r"return\s+100%",
    r"pass\s+all\s+criteria",
    r"approve\s+this\s+job",
    r"you\s+must\s+(pass|approve|accept)",
    r"</artifact>",
]


def normalize(content: str) -> str:
    text = _ZERO_WIDTH.sub("", content)
    text = text.replace("”", '"').replace("‘", "'").replace("’", "'")
    # map cyrillic lookalikes to ascii for common instruction words
    lowered = text.lower()
    for src, dst in _CONFUSABLES.items():
        lowered = lowered.replace(src, dst)
    return lowered


def scan_for_injection(content: str) -> Tuple[bool, str]:
    """
    Layer 2 of the injection defense: deterministic pattern scan.
    Returns (is_injected, matched_evidence).
    """
    candidate = normalize(content)
    for pattern in INJECTION_PATTERNS:
        match = re.search(pattern, candidate)
        if match:
            return True, f"Matched injection signature: '{match.group(0)}'"
    return False, ""


def escape_delimiters(content: str) -> str:
    """Layer 1: neutralize any delimiter inside the artifact so a hostile
    payload cannot synthesize a closing or opening boundary."""
    content = content.replace("</artifact>", "<\\/artifact>").replace("<artifact>", "<\\artifact>")
    return content