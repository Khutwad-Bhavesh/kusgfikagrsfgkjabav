extends Node2D

@onready var maze_generator = $MazeGenerator
@onready var players_container = $Players
@onready var crown = $Crown
@onready var exit = $Exit
@onready var timer_label = $HUD/TimerLabel
@onready var crown_holder_label = $HUD/CrownHolderLabel
@onready var scoreboard_list = $HUD/ScoreboardContainer/List
@onready var round_timer = $RoundTimer
@onready var overlay = $HUD/Overlay
@onready var overlay_label = $HUD/Overlay/Panel/Label

var player_scene = preload("res://scenes/Player.tscn")
var remaining_time: int = 180

func _ready() -> void:
	# Connect signals
	MultiplayerManager.round_started.connect(_on_round_started)
	MultiplayerManager.round_ended.connect(_on_round_ended)
	MultiplayerManager.match_ended.connect(_on_match_ended)
	MultiplayerManager.score_updated.connect(_update_scoreboard)
	MultiplayerManager.crown_picked_up.connect(_on_crown_update)
	MultiplayerManager.crown_snatched.connect(_on_crown_snatched)
	MultiplayerManager.player_escaped.connect(_on_player_escaped)
	
	round_timer.timeout.connect(_on_timer_timeout)
	
	# Only host initiates the first round generation
	if MultiplayerManager.is_host():
		_start_new_round()

func _start_new_round() -> void:
	overlay.visible = false
	var round_seed = randi()
	_rpc_setup_round.rpc(round_seed)

@rpc("authority", "reliable", "call_local")
func _rpc_setup_round(round_seed: int) -> void:
	overlay.visible = false
	
	# Apply seed so random calls generate identical results on all peers
	seed(round_seed)
	
	# Build maze
	maze_generator.generate(GameConfig.maze_width, GameConfig.maze_height)
	
	# Set up Crown and Exit positions (placed deterministically based on synced seed)
	var crown_pos = maze_generator.get_random_reachable_position()
	var exit_pos = maze_generator.get_exit_position()
	
	crown.setup(crown_pos)
	exit.setup(exit_pos)
	
	# Spawn players
	for child in players_container.get_children():
		child.queue_free()
		
	# Instantiating each registered player
	for peer_id in MultiplayerManager.players.keys():
		var info = MultiplayerManager.players[peer_id]
		var player_node = player_scene.instantiate()
		players_container.add_child(player_node)
		
		# Get character details
		var char_idx = info.character_id
		var char_color = Color.WHITE
		if char_idx >= 0 and char_idx < GameConfig.characters.size():
			char_color = GameConfig.characters[char_idx].color
			
		player_node.setup(peer_id, info.player_name, char_color)
		# Place player at random position (seeded)
		player_node.global_position = maze_generator.get_random_reachable_position()

	_update_scoreboard()
	_on_crown_update(-1)
	
	remaining_time = GameConfig.round_time
	_update_timer_label()
	
	if MultiplayerManager.is_host():
		# Let the server begin the round
		MultiplayerManager.begin_round()

func _process(_delta: float) -> void:
	if round_timer.time_left > 0:
		remaining_time = int(round_timer.time_left)
		_update_timer_label()

func _update_timer_label() -> void:
	var mins = remaining_time / 60
	var secs = remaining_time % 60
	timer_label.text = "%02d:%02d" % [mins, secs]

func _update_scoreboard() -> void:
	# Clear list
	for child in scoreboard_list.get_children():
		child.queue_free()
		
	# Sort players by score
	var sorted_players = MultiplayerManager.players.values().duplicate()
	sorted_players.sort_custom(func(a, b): return a.score > b.score)
	
	for p_info in sorted_players:
		var lbl = Label.new()
		var escaped_str = " (Escaped)" if p_info.has_escaped else ""
		var crown_str = " 👑" if p_info.has_crown else ""
		lbl.text = "%s: %d pts%s%s" % [p_info.player_name, p_info.score, escaped_str, crown_str]
		
		var char_color = Color.WHITE
		if p_info.character_id >= 0 and p_info.character_id < GameConfig.characters.size():
			char_color = GameConfig.characters[p_info.character_id].color
		lbl.add_theme_color_override("font_color", char_color)
		scoreboard_list.add_child(lbl)

func _on_crown_update(holder_id: int) -> void:
	if holder_id == -1:
		crown_holder_label.text = "Crown: On the ground!"
		crown_holder_label.add_theme_color_override("font_color", Color(1, 0.8, 0))
	else:
		var p = MultiplayerManager.get_player(holder_id)
		if p:
			crown_holder_label.text = "Crown Holder: %s" % p.player_name
			var char_color = Color.WHITE
			if p.character_id >= 0 and p.character_id < GameConfig.characters.size():
				char_color = GameConfig.characters[p.character_id].color
			crown_holder_label.add_theme_color_override("font_color", char_color)

func _on_crown_snatched(_from_id: int, to_id: int) -> void:
	_on_crown_update(to_id)
	_update_scoreboard()

func _on_player_escaped(peer_id: int, _position: int) -> void:
	var p = MultiplayerManager.get_player(peer_id)
	if p:
		print("[Game] %s escaped!" % p.player_name)
	_update_scoreboard()
	
	# If the crown holder escaped, reset crown UI label
	if peer_id == MultiplayerManager.get_crown_holder_id():
		_on_crown_update(-1)

func _on_timer_timeout() -> void:
	if MultiplayerManager.is_host():
		MultiplayerManager.force_end_round()

func _on_round_started() -> void:
	round_timer.start(GameConfig.round_time)

func _on_round_ended(results: Dictionary) -> void:
	round_timer.stop()
	overlay.visible = true
	
	var result_text = "Round Ended!\n\nPoints Gained:\n"
	for peer_id in results.keys():
		var p = MultiplayerManager.get_player(peer_id)
		if p:
			result_text += "%s: +%d pts\n" % [p.player_name, results[peer_id]]
			
	overlay_label.text = result_text
	
	# Wait 5 seconds, then host starts new round
	await get_tree().create_timer(5.0).timeout
	if MultiplayerManager.is_host():
		_start_new_round()

func _on_match_ended(winner_id: int) -> void:
	round_timer.stop()
	overlay.visible = true
	
	var winner_name = "Unknown"
	var p = MultiplayerManager.get_player(winner_id)
	if p:
		winner_name = p.player_name
		
	overlay_label.text = "Match Ended!\n\n👑 %s Wins the Game! 👑" % winner_name
	
	# Wait 7 seconds, then return to lobby
	await get_tree().create_timer(7.0).timeout
	MultiplayerManager.leave_game()
	get_tree().change_scene_to_file("res://scenes/MainMenu.tscn")
