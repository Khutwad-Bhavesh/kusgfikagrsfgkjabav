extends Node
## Autoload – authoritative listen-server networking layer.
##
## Responsibilities:
##   • ENet host / client lifecycle
##   • Player registry (Dictionary<peer_id, PlayerInfo>)
##   • Lobby management (join, leave, ready, admin settings broadcast)
##   • In-game authoritative logic (crown pickup, snatch validation, escape,
##     scoring, round/match lifecycle)
##
## All game-state mutations go through server-authoritative RPCs.
## Clients only render what the server tells them.

# ─── Signals (UI binds to these) ────────────────────────────────────────────
signal player_joined(peer_id: int)
signal player_left(peer_id: int)
signal player_list_updated                       # full refresh
signal ready_updated(peer_id: int, is_ready: bool)
signal settings_updated                          # admin changed lobby settings
signal game_started
signal round_started
signal round_ended(results: Dictionary)          # { peer_id: points_earned }
signal match_ended(winner_id: int)
signal crown_picked_up(peer_id: int)
signal crown_snatched(from_id: int, to_id: int)
signal player_escaped(peer_id: int, position: int)
signal score_updated                             # scoreboard changed
signal connection_failed
signal server_disconnected

# ─── State ──────────────────────────────────────────────────────────────────
var players: Dictionary = {}       # peer_id -> PlayerInfo
var local_player_name: String = "Player"
var local_character_id: int = 0

var _peer: ENetMultiplayerPeer = null
var _escape_counter: int = 0       # tracks how many have escaped this round
var _round_active: bool = false
var _crown_holder_id: int = -1     # peer_id of crown holder, -1 = on ground

# ─── Lifecycle ──────────────────────────────────────────────────────────────

func _ready() -> void:
	multiplayer.peer_connected.connect(_on_peer_connected)
	multiplayer.peer_disconnected.connect(_on_peer_disconnected)
	multiplayer.connected_to_server.connect(_on_connected_to_server)
	multiplayer.connection_failed.connect(_on_connection_failed)
	multiplayer.server_disconnected.connect(_on_server_disconnected)

# ─── Host / Join ────────────────────────────────────────────────────────────

## Create a listen-server on the given port.
func host_game(port: int = GameConfig.DEFAULT_PORT) -> Error:
	_peer = ENetMultiplayerPeer.new()
	var err := _peer.create_server(port, GameConfig.max_players)
	if err != OK:
		push_error("MultiplayerManager: failed to create server – %s" % error_string(err))
		return err
	multiplayer.multiplayer_peer = _peer
	# Register the host itself
	_register_local_player(multiplayer.get_unique_id())
	print("[Server] Hosting on port %d  (id=%d)" % [port, multiplayer.get_unique_id()])
	return OK

## Join an existing server.
func join_game(address: String, port: int = GameConfig.DEFAULT_PORT) -> Error:
	_peer = ENetMultiplayerPeer.new()
	var err := _peer.create_client(address, port)
	if err != OK:
		push_error("MultiplayerManager: failed to join – %s" % error_string(err))
		return err
	multiplayer.multiplayer_peer = _peer
	print("[Client] Connecting to %s:%d …" % [address, port])
	return OK

## Disconnect and clean up.
func leave_game() -> void:
	if _peer:
		_peer.close()
		_peer = null
	multiplayer.multiplayer_peer = null
	players.clear()
	_round_active = false
	_crown_holder_id = -1
	_escape_counter = 0

# ─── Connection callbacks ──────────────────────────────────────────────────

func _on_peer_connected(id: int) -> void:
	print("[Net] Peer connected: %d" % id)
	# Server sends full player list + settings to the newcomer
	if multiplayer.is_server():
		var all_data: Array = []
		for p: PlayerInfo in players.values():
			all_data.append(p.to_dict())
		_rpc_sync_all_players.rpc_id(id, all_data)
		_rpc_sync_settings.rpc_id(id, GameConfig.to_dict())

func _on_peer_disconnected(id: int) -> void:
	print("[Net] Peer disconnected: %d" % id)
	if players.has(id):
		players.erase(id)
		player_left.emit(id)
		player_list_updated.emit()
		# If the disconnected player held the crown, drop it
		if _crown_holder_id == id:
			_crown_holder_id = -1

func _on_connected_to_server() -> void:
	print("[Client] Connected! Registering …")
	_rpc_register_player.rpc_id(1, local_player_name, local_character_id)

func _on_connection_failed() -> void:
	push_warning("MultiplayerManager: connection failed")
	leave_game()
	connection_failed.emit()

func _on_server_disconnected() -> void:
	push_warning("MultiplayerManager: server disconnected")
	leave_game()
	server_disconnected.emit()

# ─── Local helpers ──────────────────────────────────────────────────────────

func _register_local_player(id: int) -> void:
	var info := PlayerInfo.new(id, local_player_name, local_character_id)
	players[id] = info
	player_joined.emit(id)
	player_list_updated.emit()

func is_host() -> bool:
	return multiplayer.is_server()

func get_local_id() -> int:
	return multiplayer.get_unique_id()

func get_player(peer_id: int) -> PlayerInfo:
	return players.get(peer_id, null)

func get_crown_holder_id() -> int:
	return _crown_holder_id

func is_everyone_ready() -> bool:
	if players.size() < 2:
		return false
	for p: PlayerInfo in players.values():
		if not p.is_ready:
			return false
	return true

# ─── Lobby RPCs ─────────────────────────────────────────────────────────────

## Client → Server: register me.
@rpc("any_peer", "reliable")
func _rpc_register_player(p_name: String, p_char_id: int) -> void:
	if not multiplayer.is_server():
		return
	var sender_id := multiplayer.get_remote_sender_id()
	if players.size() >= GameConfig.max_players:
		push_warning("Lobby full – rejecting peer %d" % sender_id)
		return
	var info := PlayerInfo.new(sender_id, p_name, p_char_id)
	players[sender_id] = info
	# Broadcast updated list to everyone
	_broadcast_player_list()
	player_joined.emit(sender_id)

## Server → one client: here is the full player list.
@rpc("authority", "reliable")
func _rpc_sync_all_players(data_array: Array) -> void:
	players.clear()
	for d: Dictionary in data_array:
		var info := PlayerInfo.from_dict(d)
		players[info.peer_id] = info
	player_list_updated.emit()

## Server → one client: here are the current settings.
@rpc("authority", "reliable")
func _rpc_sync_settings(data: Dictionary) -> void:
	GameConfig.apply_dict(data)
	settings_updated.emit()

## Client → Server: toggle my ready state.
@rpc("any_peer", "reliable")
func _rpc_set_ready(ready_state: bool) -> void:
	if not multiplayer.is_server():
		return
	var sender_id := multiplayer.get_remote_sender_id()
	if players.has(sender_id):
		players[sender_id].is_ready = ready_state
		_broadcast_player_list()
		ready_updated.emit(sender_id, ready_state)

## Host calls this locally to toggle own ready state and broadcast.
func set_local_ready(ready_state: bool) -> void:
	var id := get_local_id()
	if players.has(id):
		players[id].is_ready = ready_state
		if multiplayer.is_server():
			_broadcast_player_list()
			ready_updated.emit(id, ready_state)
		else:
			_rpc_set_ready.rpc_id(1, ready_state)

## Host → all: update lobby settings.
@rpc("authority", "reliable")
func _rpc_broadcast_settings(data: Dictionary) -> void:
	GameConfig.apply_dict(data)
	settings_updated.emit()

## Host calls this locally after editing settings in the admin panel.
func push_settings() -> void:
	if not multiplayer.is_server():
		return
	_rpc_broadcast_settings.rpc(GameConfig.to_dict())

## Host calls this locally to update character selection for own player.
func set_local_character(char_id: int) -> void:
	local_character_id = char_id
	var id := get_local_id()
	if players.has(id):
		players[id].character_id = char_id
		if multiplayer.is_server():
			_broadcast_player_list()
		else:
			_rpc_update_character.rpc_id(1, char_id)

@rpc("any_peer", "reliable")
func _rpc_update_character(char_id: int) -> void:
	if not multiplayer.is_server():
		return
	var sender_id := multiplayer.get_remote_sender_id()
	if players.has(sender_id):
		players[sender_id].character_id = char_id
		_broadcast_player_list()

# ─── Game Start ─────────────────────────────────────────────────────────────

## Host-only: start the game if everyone is ready.
func start_game() -> void:
	if not multiplayer.is_server():
		return
	if not is_everyone_ready():
		push_warning("Cannot start – not everyone is ready")
		return
	_rpc_load_game.rpc()

@rpc("authority", "reliable", "call_local")
func _rpc_load_game() -> void:
	game_started.emit()
	get_tree().change_scene_to_file("res://scenes/Game.tscn")

# ─── Round lifecycle (server-authoritative) ─────────────────────────────────

## Called by Game.gd once the maze is ready.
func begin_round() -> void:
	if not multiplayer.is_server():
		return
	_escape_counter = 0
	_crown_holder_id = -1
	_round_active = true
	for p: PlayerInfo in players.values():
		p.reset_round()
	_broadcast_player_list()
	_rpc_on_round_started.rpc()

@rpc("authority", "reliable", "call_local")
func _rpc_on_round_started() -> void:
	_round_active = true
	round_started.emit()

# ─── Crown mechanics (server-authoritative) ─────────────────────────────────

## Client → Server: I touched the crown.
@rpc("any_peer", "reliable")
func request_crown_pickup() -> void:
	var sender_id := multiplayer.get_remote_sender_id()
	request_crown_pickup_by_peer(sender_id)

func request_crown_pickup_by_peer(peer_id: int) -> void:
	if not multiplayer.is_server() or not _round_active:
		return
	if _crown_holder_id != -1:
		return  # someone already has it
	_crown_holder_id = peer_id
	if players.has(peer_id):
		players[peer_id].has_crown = true
	_rpc_on_crown_picked_up.rpc(peer_id)

@rpc("authority", "reliable", "call_local")
func _rpc_on_crown_picked_up(peer_id: int) -> void:
	_crown_holder_id = peer_id
	if players.has(peer_id):
		players[peer_id].has_crown = true
	crown_picked_up.emit(peer_id)

## Client → Server: I want to snatch the crown from target_id.
@rpc("any_peer", "reliable")
func request_snatch(target_id: int) -> void:
	var sender_id := multiplayer.get_remote_sender_id()
	request_snatch_by_peer(sender_id, target_id)

func request_snatch_by_peer(sender_id: int, target_id: int) -> void:
	if not multiplayer.is_server() or not _round_active:
		return
	# Validate: target must hold the crown and sender must NOT be the holder
	if _crown_holder_id != target_id or sender_id == target_id:
		return
	# Swap crown ownership
	if players.has(target_id):
		players[target_id].has_crown = false
	if players.has(sender_id):
		players[sender_id].has_crown = true
	_crown_holder_id = sender_id
	_rpc_on_crown_snatched.rpc(target_id, sender_id)

@rpc("authority", "reliable", "call_local")
func _rpc_on_crown_snatched(from_id: int, to_id: int) -> void:
	_crown_holder_id = to_id
	if players.has(from_id):
		players[from_id].has_crown = false
	if players.has(to_id):
		players[to_id].has_crown = true
	crown_snatched.emit(from_id, to_id)

# ─── Escape & Scoring (server-authoritative) ────────────────────────────────

## Client → Server: I reached the exit.
@rpc("any_peer", "reliable")
func request_escape() -> void:
	var sender_id := multiplayer.get_remote_sender_id()
	request_escape_by_peer(sender_id)

func request_escape_by_peer(sender_id: int) -> void:
	if not multiplayer.is_server() or not _round_active:
		return
	if not players.has(sender_id):
		return
	var info: PlayerInfo = players[sender_id]
	if info.has_escaped:
		return  # already escaped

	info.has_escaped = true
	info.escape_order = _escape_counter

	# Award points based on escape position
	var points := GameConfig.get_points_for_position(_escape_counter)
	info.score += points
	_escape_counter += 1

	_rpc_on_player_escaped.rpc(sender_id, info.escape_order, points, info.score)

	# If the crown holder escaped, crown is now off the field
	if sender_id == _crown_holder_id:
		_crown_holder_id = -1

	# Check victory
	if info.score >= GameConfig.win_points:
		_end_match(sender_id)
		return

	# Check if all players have escaped → end round
	var all_escaped := true
	for p: PlayerInfo in players.values():
		if not p.has_escaped:
			all_escaped = false
			break
	if all_escaped:
		_end_round()

@rpc("authority", "reliable", "call_local")
func _rpc_on_player_escaped(peer_id: int, position: int, pts: int, total: int) -> void:
	if players.has(peer_id):
		players[peer_id].has_escaped = true
		players[peer_id].escape_order = position
		players[peer_id].score = total
	player_escaped.emit(peer_id, position)
	score_updated.emit()

# ─── Round / Match end ──────────────────────────────────────────────────────

func _end_round() -> void:
	_round_active = false
	var results: Dictionary = {}
	for p: PlayerInfo in players.values():
		results[p.peer_id] = GameConfig.get_points_for_position(p.escape_order)
	_rpc_on_round_ended.rpc(results)

@rpc("authority", "reliable", "call_local")
func _rpc_on_round_ended(results: Dictionary) -> void:
	_round_active = false
	round_ended.emit(results)

func _end_match(winner_id: int) -> void:
	_round_active = false
	_rpc_on_match_ended.rpc(winner_id)

@rpc("authority", "reliable", "call_local")
func _rpc_on_match_ended(winner_id: int) -> void:
	_round_active = false
	match_ended.emit(winner_id)

## Server-only: force-end the round (e.g., timer ran out).
func force_end_round() -> void:
	if multiplayer.is_server() and _round_active:
		_end_round()

# ─── Internal helpers ───────────────────────────────────────────────────────

func _broadcast_player_list() -> void:
	var all_data: Array = []
	for p: PlayerInfo in players.values():
		all_data.append(p.to_dict())
	_rpc_sync_all_players.rpc(all_data)
	# Also update locally on the server
	player_list_updated.emit()
