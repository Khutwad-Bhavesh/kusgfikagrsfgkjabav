# res://scripts/NetworkManager.gd
# AUTOLOAD: Project → Project Settings → Autoload → Add this as "NetworkManager"
extends Node

const PORT = 7777
const MAX_PLAYERS = 4
const SERVER_IP = "127.0.0.1"

var local_player_name = "Player"
var local_player_id = 0
var local_player_character_id = 0

var players = {}

class PlayerData:
	var id: int
	var name: String
	var ready: bool = false
	var character_id: int = 0
	func _init(p_id: int, p_name: String):
		id = p_id
		name = p_name

signal player_connected(peer_id, player_data)
signal player_disconnected(peer_id)
signal connection_failed()
signal connection_succeeded()
signal server_disconnected()
signal players_updated()

func _ready():
	print("🌐 NetworkManager initialized")
	multiplayer.peer_connected.connect(_on_player_connected)
	multiplayer.peer_disconnected.connect(_on_player_disconnected)
	multiplayer.connected_to_server.connect(_on_connected_to_server)
	multiplayer.connection_failed.connect(_on_connection_failed)
	multiplayer.server_disconnected.connect(_on_server_disconnected)

func create_server(player_name: String) -> int:
	local_player_name = player_name
	var peer = ENetMultiplayerPeer.new()
	var error = peer.create_server(PORT, MAX_PLAYERS)
	if error != OK:
		print("❌ Cannot host server: ", error)
		return error
	multiplayer.multiplayer_peer = peer
	local_player_id = 1
	var player_data = PlayerData.new(1, player_name)
	player_data.character_id = local_player_character_id
	players[1] = player_data
	player_connected.emit(1, player_data)
	players_updated.emit()
	print("✅ Server created. Host registered: ", player_name, " (ID: 1)")
	return OK

func join_server(ip: String, player_name: String) -> int:
	local_player_name = player_name
	var peer = ENetMultiplayerPeer.new()
	var error = peer.create_client(ip, PORT)
	if error != OK:
		print("❌ Cannot connect: ", error)
		return error
	multiplayer.multiplayer_peer = peer
	print("🔄 Connecting to ", ip, ":", PORT)
	return OK

func disconnect_from_server():
	if multiplayer.multiplayer_peer:
		multiplayer.multiplayer_peer.close()
		multiplayer.multiplayer_peer = null
	players.clear()
	local_player_id = 0
	print("🚪 Disconnected")

func _on_player_connected(id: int):
	print("🟢 Player connected: ", id)

func _on_player_disconnected(id: int):
	if players.has(id):
		print("🔴 ", players[id].name, " left")
		players.erase(id)
	player_disconnected.emit(id)
	players_updated.emit()

func _on_connected_to_server():
	local_player_id = multiplayer.get_unique_id()
	print("✅ Connected! My ID: ", local_player_id)
	connection_succeeded.emit()
	_register_player.rpc_id(1, local_player_name, local_player_character_id)

func _on_connection_failed():
	print("❌ Connection failed!")
	connection_failed.emit()

func _on_server_disconnected():
	print("❌ Server disconnected!")
	multiplayer.multiplayer_peer = null
	players.clear()
	local_player_id = 0
	server_disconnected.emit()

@rpc("any_peer", "reliable")
func _register_player(player_name: String, character_id: int):
	var id = multiplayer.get_remote_sender_id()
	var player_data = PlayerData.new(id, player_name)
	player_data.character_id = character_id
	players[id] = player_data
	print("👤 Registered: ", player_name, " (ID: ", id, ")")
	player_connected.emit(id, player_data)
	if multiplayer.is_server():
		_sync_players.rpc_id(id, _serialize_players())
		for peer_id in players:
			if peer_id != id and peer_id != 1:
				_notify_player_joined.rpc_id(peer_id, id, player_name, character_id)
	players_updated.emit()

@rpc("authority", "reliable")
func _sync_players(players_data: Array):
	for data in players_data:
		var pd = PlayerData.new(data.id, data.name)
		pd.ready = data.ready
		pd.character_id = data.character_id
		players[data.id] = pd
	print("📋 Got player list: ", players.size(), " players")
	players_updated.emit()

@rpc("authority", "reliable")
func _notify_player_joined(peer_id: int, player_name: String, character_id: int):
	var pd = PlayerData.new(peer_id, player_name)
	pd.character_id = character_id
	players[peer_id] = pd
	player_connected.emit(peer_id, pd)
	players_updated.emit()

@rpc("any_peer", "reliable", "call_local")
func set_player_ready(peer_id: int, is_ready: bool):
	if players.has(peer_id):
		players[peer_id].ready = is_ready
		players_updated.emit()

func is_everyone_ready() -> bool:
	# ✅ FIX: Allow solo host to start (1 player is enough)
	if players.size() < 1:
		return false
	for player in players.values():
		if not player.ready:
			return false
	return true

@rpc("authority", "reliable", "call_local")
func start_game():
	print("🎮 Starting game! Players: ", players.size())
	get_tree().change_scene_to_file("res://scenes/Game.tscn")

func _serialize_players() -> Array:
	var out = []
	for p in players.values():
		out.append({"id": p.id, "name": p.name, "ready": p.ready, "character_id": p.character_id})
	return out

func get_player_name(peer_id: int) -> String:
	if players.has(peer_id):
		return players[peer_id].name
	return "Unknown"

func get_player_character_id(peer_id: int) -> int:
	if players.has(peer_id):
		return players[peer_id].character_id
	return 0

func is_server() -> bool:
	return multiplayer.is_server()

func get_player_count() -> int:
	return players.size()

func get_local_ip() -> String:
	var addresses = IP.get_local_addresses()
	for address in addresses:
		if address.begins_with("192.168.") or address.begins_with("10."):
			return address
	return "127.0.0.1"
