extends Node
## Autoload – central game configuration.
## The host can change these in the lobby admin panel; changes are broadcast
## to all clients via MultiplayerManager.

# ── Signals ──────────────────────────────────────────────────────────────────
signal settings_changed          # emitted after any setting is updated

# ── Defaults ─────────────────────────────────────────────────────────────────
const DEFAULT_MAX_PLAYERS: int     = 6
const DEFAULT_MAZE_WIDTH: int      = 20
const DEFAULT_MAZE_HEIGHT: int     = 20
const DEFAULT_ROUND_TIME: int      = 180        # seconds
const DEFAULT_POINTS_TABLE: Array  = [5, 4, 3, 2, 1]
const DEFAULT_WIN_POINTS: int      = 15

# ── Live settings (admin-editable) ───────────────────────────────────────────
var max_players: int     = DEFAULT_MAX_PLAYERS
var maze_width: int      = DEFAULT_MAZE_WIDTH
var maze_height: int     = DEFAULT_MAZE_HEIGHT
var round_time: int      = DEFAULT_ROUND_TIME
var points_table: Array  = DEFAULT_POINTS_TABLE.duplicate()
var win_points: int      = DEFAULT_WIN_POINTS

# ── Constants (not admin-editable) ───────────────────────────────────────────
const TILE_SIZE: int         = 64          # pixels per maze tile
const SNATCH_RADIUS: float   = 80.0        # pixels – how close you need to be
const PLAYER_SPEED: float    = 250.0       # pixels/sec base speed
const CROWN_HOLDER_SPEED_MULT: float = 0.85  # crown holder is a bit slower
const DEFAULT_PORT: int      = 7777

# ── Character palette ───────────────────────────────────────────────────────
# Each entry: { "name": String, "color": Color }
# Players pick by index.  Extend this list to add more characters.
var characters: Array = [
	{ "name": "Crimson",  "color": Color(0.90, 0.20, 0.25) },
	{ "name": "Azure",    "color": Color(0.20, 0.55, 0.95) },
	{ "name": "Emerald",  "color": Color(0.18, 0.80, 0.44) },
	{ "name": "Amber",    "color": Color(0.95, 0.75, 0.15) },
	{ "name": "Orchid",   "color": Color(0.73, 0.33, 0.83) },
	{ "name": "Slate",    "color": Color(0.55, 0.60, 0.68) },
	{ "name": "Coral",    "color": Color(1.00, 0.50, 0.38) },
	{ "name": "Teal",     "color": Color(0.24, 0.76, 0.72) },
]

# ── Methods ──────────────────────────────────────────────────────────────────

## Pack all admin-editable settings into a Dictionary for RPC.
func to_dict() -> Dictionary:
	return {
		"max_players": max_players,
		"maze_width": maze_width,
		"maze_height": maze_height,
		"round_time": round_time,
		"points_table": points_table.duplicate(),
		"win_points": win_points,
	}

## Apply settings from a Dictionary (received from host).
func apply_dict(data: Dictionary) -> void:
	max_players  = data.get("max_players", DEFAULT_MAX_PLAYERS)
	maze_width   = data.get("maze_width", DEFAULT_MAZE_WIDTH)
	maze_height  = data.get("maze_height", DEFAULT_MAZE_HEIGHT)
	round_time   = data.get("round_time", DEFAULT_ROUND_TIME)
	points_table = data.get("points_table", DEFAULT_POINTS_TABLE.duplicate())
	win_points   = data.get("win_points", DEFAULT_WIN_POINTS)
	settings_changed.emit()

## Reset everything to defaults.
func reset() -> void:
	max_players  = DEFAULT_MAX_PLAYERS
	maze_width   = DEFAULT_MAZE_WIDTH
	maze_height  = DEFAULT_MAZE_HEIGHT
	round_time   = DEFAULT_ROUND_TIME
	points_table = DEFAULT_POINTS_TABLE.duplicate()
	win_points   = DEFAULT_WIN_POINTS
	settings_changed.emit()

## Return the points awarded for a given escape position (0-indexed).
func get_points_for_position(pos: int) -> int:
	if pos < 0 or pos >= points_table.size():
		return 0
	return points_table[pos]
