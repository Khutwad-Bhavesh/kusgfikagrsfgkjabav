# res://scripts/GameManager.gd
extends Node

var player_scene = preload("res://scenes/Player.tscn")
var crown_scene  = preload("res://scenes/Crown.tscn")
var exit_scene   = preload("res://scenes/Exit.tscn")

@onready var maze_generator     = $"../MazeGenerator"
@onready var ui                 = $"../UI"
@onready var timer_label        = $"../UI/TimerLabel"
@onready var score_label        = $"../UI/ScoreLabel"
@onready var notification_label = $"../UI/NotificationLabel"
@onready var round_label        = $"../UI/RoundLabel"

var players = {}
var scores  = {}

var crown_carrier_id = -1
var crown_instance   = null
var crown_position   = Vector2.ZERO

var exit_spawned  = false
var exit_instance = null
var exit_position = Vector2.ZERO

var current_round = 1
var round_timer   = 60.0
const POINTS_TO_WIN = 3

# ═══════════════════════════════════════════════════════════
func _ready():
	add_to_group("game_manager")
	
	# ✅ Safety net: if players dict is empty (e.g. jumped straight to Game scene
	# during testing), register the local player manually so game can still run
	if NetworkManager.players.size() == 0:
		push_warning("⚠️ NetworkManager.players is empty — registering local player as fallback")
		var pd = NetworkManager.PlayerData.new(1, "Player")
		NetworkManager.players[1] = pd
		NetworkManager.local_player_id = 1
	
	for player_id in NetworkManager.players.keys():
		scores[player_id] = 0
	
	print("🎮 GameManager ready. Players to spawn: ", NetworkManager.players.size())
	
	if NetworkManager.is_server():
		await get_tree().create_timer(1.0).timeout
		_spawn_players()
		await get_tree().create_timer(0.5).timeout
		_start_round()
	else:
		get_parent().child_entered_tree.connect(_on_child_spawned)

# ═══════════════════════════════════════════════════════════
func _process(delta):
	if NetworkManager.is_server():
		round_timer -= delta
		_update_timer.rpc(int(round_timer))
		if round_timer <= 0:
			_end_round.rpc("Time's up!")

# ═══════════════════════════════════════════════════════════
# CAMERA
# ═══════════════════════════════════════════════════════════

func _on_child_spawned(node: Node):
	await get_tree().process_frame
	if node.get("player_id") != null:
		if node.player_id == multiplayer.get_unique_id():
			_setup_camera(node)
			get_parent().child_entered_tree.disconnect(_on_child_spawned)

func _setup_camera(local_player: Node):
	# Find Camera2D in Game scene by type — works regardless of node name
	var cam: Camera2D = null
	for child in get_parent().get_children():
		if child is Camera2D:
			cam = child
			break
	
	if cam == null:
		push_error("❌ No Camera2D found in Game scene!")
		return
	
	# Drive camera from a RemoteTransform2D on the local player
	var remote = RemoteTransform2D.new()
	remote.name = "CameraRemote"
	remote.remote_path = cam.get_path()
	remote.update_rotation = false
	local_player.add_child(remote)
	
	# Snap instantly to spawn position — no slide from origin
	cam.global_position = local_player.global_position
	cam.reset_smoothing()
	cam.enabled = true
	cam.make_current()
	cam.zoom = Vector2(1.5, 1.5)
	cam.limit_left   = 0
	cam.limit_top    = 0
	cam.limit_right  = 20 * 64
	cam.limit_bottom = 20 * 64
	cam.limit_smoothed = true
	cam.position_smoothing_enabled = true
	cam.position_smoothing_speed   = 8.0
	
	print("📷 Camera locked to player spawn: ", local_player.global_position)

# ═══════════════════════════════════════════════════════════
# PLAYER SPAWNING
# ═══════════════════════════════════════════════════════════

func _spawn_players():
	var spawn_positions = maze_generator.get_spawn_positions()
	var spawn_index = 0
	var local_id = multiplayer.get_unique_id()
	
	print("🚀 Spawning ", NetworkManager.players.size(), " players...")
	
	for player_id in NetworkManager.players.keys():
		var player = player_scene.instantiate()
		player.player_id = player_id
		player.name = "Player_" + str(player_id)
		
		if spawn_index < spawn_positions.size():
			player.position = spawn_positions[spawn_index]
		else:
			player.position = Vector2(320, 320)  # fallback position
		
		get_parent().add_child(player)
		players[player_id] = player
		
		if player_id == local_id:
			_setup_camera(player)
		
		print("👤 Spawned Player ", player_id, " at ", player.position)
		spawn_index += 1
	
	print("✅ Done spawning. Total: ", players.size())

# ═══════════════════════════════════════════════════════════
# ROUND MANAGEMENT
# ═══════════════════════════════════════════════════════════

func _start_round():
	round_timer      = 60.0
	crown_carrier_id = -1
	exit_spawned     = false
	_update_round_label.rpc(current_round)
	_spawn_crown()
	_update_scoreboard.rpc()
	print("🎮 Round ", current_round, " started!")

func _spawn_crown():
	crown_position = maze_generator.get_random_floor_position()
	if crown_instance:
		crown_instance.queue_free()
	crown_instance = crown_scene.instantiate()
	crown_instance.position = crown_position
	get_parent().add_child(crown_instance)
	_sync_crown.rpc(crown_position)
	print("👑 Crown at: ", crown_position)

func crown_picked_up(player_id: int):
	if not NetworkManager.is_server():
		return
	crown_carrier_id = player_id
	if crown_instance:
		crown_instance.queue_free()
		crown_instance = null
	if players.has(player_id):
		players[player_id].set_crown_carrier.rpc(true)
	_spawn_exit()
	_show_notification.rpc(NetworkManager.get_player_name(player_id) + " got the crown!")

func _spawn_exit():
	exit_spawned  = true
	exit_position = maze_generator.get_random_floor_position()
	while exit_position.distance_to(crown_position) < 300:
		exit_position = maze_generator.get_random_floor_position()
	if exit_instance:
		exit_instance.queue_free()
	exit_instance = exit_scene.instantiate()
	exit_instance.position = exit_position
	get_parent().add_child(exit_instance)
	_sync_exit.rpc(exit_position)
	_show_notification.rpc("🚪 EXIT OPENED!")

func player_reached_exit(player_id: int):
	if not NetworkManager.is_server():
		return
	if crown_carrier_id != player_id:
		return
	scores[player_id] += 1
	var player_name = NetworkManager.get_player_name(player_id)
	_show_notification.rpc(player_name + " escaped! +1 point!")
	if scores[player_id] >= POINTS_TO_WIN:
		_game_over.rpc(player_id)
	else:
		current_round += 1
		_end_round.rpc(player_name + " scored!")
		await get_tree().create_timer(3.0).timeout
		_start_round()

@rpc("authority", "call_local")
func _end_round(message: String):
	_show_notification.rpc(message)
	if crown_instance:
		crown_instance.queue_free()
	if exit_instance:
		exit_instance.queue_free()

@rpc("authority", "call_local")
func _game_over(winner_id: int):
	_show_notification.rpc("🏆 " + NetworkManager.get_player_name(winner_id) + " WINS! 🏆")
	await get_tree().create_timer(5.0).timeout
	get_tree().change_scene_to_file("res://scenes/MainMenu.tscn")

# ═══════════════════════════════════════════════════════════
# UI
# ═══════════════════════════════════════════════════════════

@rpc("authority", "call_local")
func _update_timer(time: int):
	if timer_label:
		timer_label.text = str(time) + "s"
		if time <= 10:
			timer_label.modulate = Color.RED

@rpc("authority", "call_local")
func _update_round_label(round_num: int):
	if round_label:
		round_label.text = "Round " + str(round_num)

@rpc("authority", "call_local")
func _update_scoreboard():
	if not score_label:
		return
	var text = "Scores:\n"
	for player_id in scores.keys():
		text += NetworkManager.get_player_name(player_id) + ": " + str(scores[player_id]) + "\n"
	score_label.text = text

@rpc("authority", "call_local")
func _show_notification(message: String):
	if notification_label:
		notification_label.text = message
		await get_tree().create_timer(2.0).timeout
		notification_label.text = ""

@rpc("authority", "call_local")
func _sync_crown(pos: Vector2):
	crown_position = pos

@rpc("authority", "call_local")
func _sync_exit(pos: Vector2):
	exit_position = pos

# ═══════════════════════════════════════════════════════════
# SNATCH
# ═══════════════════════════════════════════════════════════

@rpc("any_peer", "call_local")
func request_snatch(target_id: int):
	if not NetworkManager.is_server():
		return
	if crown_carrier_id != target_id:
		return
	crown_carrier_id = multiplayer.get_remote_sender_id()
	if players.has(target_id):
		players[target_id].set_crown_carrier.rpc(false)
	if players.has(crown_carrier_id):
		players[crown_carrier_id].set_crown_carrier.rpc(true)
	_show_notification.rpc("Crown snatched!")

#=============================================================
#=============================================================

# In GameManager._ready() or separate script
func _create_borders():
	var border_thickness = 20
	var map_width = 1280
	var map_height = 768
	
	# Top
	var top = StaticBody2D.new()
	var top_col = CollisionShape2D.new()
	top_col.shape = RectangleShape2D.new()
	top_col.shape.size = Vector2(map_width, border_thickness)
	top_col.position = Vector2(map_width/2, border_thickness/2)
	top.add_child(top_col)
	get_parent().add_child(top)
	
	# Bottom, Left, Right (same way)

var crown_found = false

func _process1(delta):
	if not NetworkManager.is_server():
		return
	
	round_timer -= delta
	_update_timer.rpc(int(round_timer))
	
	if round_timer <= 0:
		if crown_found:
			# Continue, someone has crown
			pass
		else:
			# No crown found - tie round
			_round_tie.rpc()

func crown_picked_up1(player_id):
	crown_found = true
	round_timer = 120.0  # Extend to 2 minutes!
	# ... rest of code

@rpc("authority", "call_local")
func _round_tie():
	_show_notification.rpc("⏱️ Time's up! No winner this round!")
	await get_tree().create_timer(3.0).timeout
	_start_round()
