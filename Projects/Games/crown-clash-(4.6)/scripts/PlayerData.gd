# res://scripts/CharacterData.gd
extends Resource
class_name CharacterData

# ═══════════════════════════════════════════════════════════
# CHARACTER DEFINITION
# ═══════════════════════════════════════════════════════════

enum CharacterID {
	STREET_KID,
	PRIEST,
	AUNTY,
	STUDENT,
	VENDOR,
	RICKSHAW,
	DANCER,
	CRICKETER
}

# Character properties
var id: CharacterID
var display_name: String
var description: String
var sprite_path: String
var color: Color
var voice_lines: Array  # For future sound effects

# ═══════════════════════════════════════════════════════════
# ALL CHARACTERS DATABASE
# ═══════════════════════════════════════════════════════════

static func get_all_characters() -> Array:
	return [
		create_character(
			CharacterID.STREET_KID,
			"रवि (Ravi)",
			"Mumbai street-smart kid with lightning speed!",
			"res://assets/characters/street_kid.png",
			Color.ORANGE_RED,
			["Chalo chalo!", "Mast hai!", "Bhag ja!"]
		),
		create_character(
			CharacterID.PRIEST,
			"पंडित जी (Pandit Ji)",
			"Wise temple priest with divine blessings",
			"res://assets/characters/priest.png",
			Color.SADDLE_BROWN,
			["Om Namah Shivaya!", "Shanti shanti!", "Achha!"]
		),
		create_character(
			CharacterID.AUNTY,
			"लक्ष्मी आंटी (Lakshmi Aunty)",
			"Fearless adventurer aunty in saree!",
			"res://assets/characters/aunty.png",
			Color.PURPLE,
			["Arrey beta!", "Kya kar rahe ho?", "Shabash!"]
		),
		create_character(
			CharacterID.STUDENT,
			"प्रिया (Priya)",
			"College student with quick thinking",
			"res://assets/characters/student.png",
			Color.DEEP_SKY_BLUE,
			["Let's go!", "Nice!", "Yaar!"]
		),
		create_character(
			CharacterID.VENDOR,
			"चाय वाला (Chai Wala)",
			"Fast-serving chai vendor from the streets",
			"res://assets/characters/vendor.png",
			Color.CHOCOLATE,
			["Chai garam!", "Ek cutting!", "Bahut badhiya!"]
		),
		create_character(
			CharacterID.RICKSHAW,
			"अर्जुन (Arjun)",
			"Auto rickshaw driver - knows all shortcuts!",
			"res://assets/characters/rickshaw.png",
			Color.YELLOW_GREEN,
			["Chaliye!", "Jaldi jaldi!", "Meter se jayenge!"]
		),
		create_character(
			CharacterID.DANCER,
			"नूपुर (Noopur)",
			"Classical dancer with graceful moves",
			"res://assets/characters/dancer.png",
			Color.HOT_PINK,
			["Wah!", "Kya baat hai!", "Namaskar!"]
		),
		create_character(
			CharacterID.CRICKETER,
			"विराट (Virat)",
			"Cricket star with champion spirit!",
			"res://assets/characters/cricketer.png",
			Color.ROYAL_BLUE,
			["Chakka!", "Out hai!", "Come on!"]
		)
	]

static func create_character(
	p_id: CharacterID,
	p_name: String,
	p_desc: String,
	p_sprite: String,
	p_color: Color,
	p_voices: Array
) -> Dictionary:
	return {
		"id": p_id,
		"name": p_name,
		"description": p_desc,
		"sprite_path": p_sprite,
		"color": p_color,
		"voice_lines": p_voices
	}

static func get_character_by_id(char_id: CharacterID) -> Dictionary:
	var chrs = get_all_characters()
	@warning_ignore("shadowed_global_identifier")
	for char in chrs:
		if char.id == char_id:
			return char
	return chrs[0]  # Default to first character
