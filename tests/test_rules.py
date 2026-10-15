from app.verifier.rules import check_json_schema, check_word_count_each, check_required_terms, check_max_chars

def test_json_schema_rule():
    valid = '[{"title": "Shirt 1", "description": "100% organic cotton tee"}]'
    invalid = '{"not_a_list": true}'
    assert check_json_schema(valid, {"id": "schema", "schema_ref": "descriptions_v1"})["pass"] is True
    assert check_json_schema(invalid, {"id": "schema", "schema_ref": "descriptions_v1"})["pass"] is False

def test_word_count_each_rule():
    short = '[{"title": "Shirt 1", "description": "Too short"}]'
    assert check_word_count_each(short, {"id": "length", "min": 90, "max": 110})["pass"] is False

def test_required_terms_rule():
    text = "This organic cotton shirt is soft."
    assert check_required_terms(text, {"id": "terms", "terms": ["organic", "cotton"]})["pass"] is True
    assert check_required_terms("Regular polyester shirt", {"id": "terms", "terms": ["organic", "cotton"]})["pass"] is False

def test_max_chars_rule():
    giant = "a" * 105000
    assert check_max_chars(giant, {"id": "max_chars", "max": 100000})["pass"] is False
