class_name PlayerInfo
extends RefCounted
## Data container for a single player in the lobby and game.

var peer_id: int = 0
var player_name: String = "Player"
var character_id: int = 0       # index into the character palette
var is_ready: bool = false
var score: int = 0
var has_crown: bool = false
var has_escaped: bool = false
var escape_order: int = -1      # -1 means hasn't escaped yet

func _init(p_peer_id: int = 0, p_name: String = "Player", p_char_id: int = 0) -> void:
	peer_id = p_peer_id
	player_name = p_name
	character_id = p_char_id

## Serialise to a Dictionary for RPC transfer.
func to_dict() -> Dictionary:
	return {
		"peer_id": peer_id,
		"player_name": player_name,
		"character_id": character_id,
		"is_ready": is_ready,
		"score": score,
		"has_crown": has_crown,
		"has_escaped": has_escaped,
		"escape_order": escape_order,
	}

## Populate fields from a Dictionary received over RPC.
static func from_dict(data: Dictionary) -> PlayerInfo:
	var info := PlayerInfo.new(
		data.get("peer_id", 0),
		data.get("player_name", "Player"),
		data.get("character_id", 0),
	)
	info.is_ready = data.get("is_ready", false)
	info.score = data.get("score", 0)
	info.has_crown = data.get("has_crown", false)
	info.has_escaped = data.get("has_escaped", false)
	info.escape_order = data.get("escape_order", -1)
	return info

## Reset round-specific state (crown, escape) but keep cumulative score.
func reset_round() -> void:
	has_crown = false
	has_escaped = false
	escape_order = -1
