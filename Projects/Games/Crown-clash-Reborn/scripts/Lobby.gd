extends Control

# Player list container
@onready var player_list_container = $HBoxContainer/LeftPanel/VBoxContainer/ScrollContainer/PlayerList

# Admin Panel controls
@onready var admin_panel = $HBoxContainer/RightPanel
@onready var max_players_spin = $HBoxContainer/RightPanel/VBoxContainer/MaxPlayersSpin
@onready var maze_width_spin = $HBoxContainer/RightPanel/VBoxContainer/MazeWidthSpin
@onready var maze_height_spin = $HBoxContainer/RightPanel/VBoxContainer/MazeHeightSpin
@onready var round_time_spin = $HBoxContainer/RightPanel/VBoxContainer/RoundTimeSpin
@onready var win_points_spin = $HBoxContainer/RightPanel/VBoxContainer/WinPointsSpin
@onready var points_table_input = $HBoxContainer/RightPanel/VBoxContainer/PointsTableInput
@onready var apply_settings_btn = $HBoxContainer/RightPanel/VBoxContainer/ApplySettingsButton

# Character selection
@onready var char_select_container = $VBoxContainer2/CharSelectContainer

# Footer buttons
@onready var ready_btn = $Footer/ReadyButton
@onready var start_btn = $Footer/StartButton
@onready var leave_btn = $Footer/LeaveButton
@onready var status_lbl = $Footer/StatusLabel

var is_ready_state: bool = false
var selected_char_idx: int = 0

func _ready() -> void:
	# Wire signals
	MultiplayerManager.player_list_updated.connect(_on_player_list_updated)
	MultiplayerManager.settings_updated.connect(_on_settings_updated)
	MultiplayerManager.ready_updated.connect(_on_ready_updated)
	
	ready_btn.pressed.connect(_on_ready_pressed)
	start_btn.pressed.connect(_on_start_pressed)
	leave_btn.pressed.connect(_on_leave_pressed)
	apply_settings_btn.pressed.connect(_on_apply_settings_pressed)
	
	# Initial UI updates
	_on_player_list_updated()
	_on_settings_updated()
	
	# Determine Admin visibility (only server sees/controls it)
	admin_panel.visible = MultiplayerManager.is_host()
	start_btn.visible = MultiplayerManager.is_host()
	
	# Setup character buttons
	_setup_character_selection()
	
	status_lbl.text = "Waiting for players to ready up..."

func _setup_character_selection() -> void:
	# Clear old children
	for child in char_select_container.get_children():
		child.queue_free()
		
	for i in range(GameConfig.characters.size()):
		var char_data = GameConfig.characters[i]
		var btn = Button.new()
		btn.custom_minimum_size = Vector2(80, 80)
		btn.text = char_data.name
		
		# Set styling to represent player color
		var style := StyleBoxFlat.new()
		style.bg_color = char_data.color
		style.border_width_left = 3
		style.border_width_top = 3
		style.border_width_right = 3
		style.border_width_bottom = 3
		style.border_color = Color.TRANSPARENT
		btn.add_theme_stylebox_override("normal", style)
		btn.add_theme_stylebox_override("hover", style)
		btn.add_theme_stylebox_override("pressed", style)
		btn.add_theme_stylebox_override("disabled", style)
		btn.add_theme_stylebox_override("focus", style)
		
		var idx = i
		btn.pressed.connect(_on_character_selected.bind(idx))
		char_select_container.add_child(btn)
		
	# Select default first character
	_on_character_selected(0)

func _on_character_selected(idx: int) -> void:
	selected_char_idx = idx
	MultiplayerManager.set_local_character(idx)
	
	# Highlight selected character button
	var buttons = char_select_container.get_children()
	for i in range(buttons.size()):
		var btn = buttons[i]
		var style = btn.get_theme_stylebox("normal")
		if i == idx:
			style.border_color = Color.WHITE
		else:
			style.border_color = Color.TRANSPARENT

func _on_player_list_updated() -> void:
	# Clear previous player items
	for child in player_list_container.get_children():
		child.queue_free()
		
	for peer_id in MultiplayerManager.players.keys():
		var info = MultiplayerManager.players[peer_id]
		var p_hbox = HBoxContainer.new()
		p_hbox.add_theme_constant_override("separation", 15)
		
		# Color indicator block
		var color_rect = ColorRect.new()
		color_rect.custom_minimum_size = Vector2(24, 24)
		var char_idx = info.character_id
		if char_idx >= 0 and char_idx < GameConfig.characters.size():
			color_rect.color = GameConfig.characters[char_idx].color
		p_hbox.add_child(color_rect)
		
		# Name
		var name_lbl = Label.new()
		name_lbl.text = info.player_name
		if peer_id == MultiplayerManager.get_local_id():
			name_lbl.text += " (You)"
		name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		p_hbox.add_child(name_lbl)
		
		# Ready status
		var ready_lbl = Label.new()
		ready_lbl.text = "✓ Ready" if info.is_ready else "✗ Waiting"
		ready_lbl.add_theme_color_override("font_color", Color(0.2, 0.9, 0.2) if info.is_ready else Color(0.9, 0.2, 0.2))
		p_hbox.add_child(ready_lbl)
		
		player_list_container.add_child(p_hbox)
		
	# Enable/Disable host start button based on player readies
	if MultiplayerManager.is_host():
		var ready_to_start = MultiplayerManager.is_everyone_ready()
		start_btn.disabled = not ready_to_start
		if ready_to_start:
			status_lbl.text = "All players ready! Host can start the game."
		else:
			status_lbl.text = "Waiting for all players to click Ready..."

func _on_ready_pressed() -> void:
	is_ready_state = not is_ready_state
	MultiplayerManager.set_local_ready(is_ready_state)
	ready_btn.text = "Unready" if is_ready_state else "Ready"

func _on_start_pressed() -> void:
	if MultiplayerManager.is_host():
		# Sync settings one last time
		_on_apply_settings_pressed()
		# Start game scene transition
		MultiplayerManager.start_game()

func _on_leave_pressed() -> void:
	MultiplayerManager.leave_game()
	get_tree().change_scene_to_file("res://scenes/MainMenu.tscn")

func _on_settings_updated() -> void:
	# Update the SpinBoxes to reflect the GameConfig settings
	max_players_spin.value = GameConfig.max_players
	maze_width_spin.value = GameConfig.maze_width
	maze_height_spin.value = GameConfig.maze_height
	round_time_spin.value = GameConfig.round_time
	win_points_spin.value = GameConfig.win_points
	
	# Formulate Points string
	var pts_strings = []
	for p in GameConfig.points_table:
		pts_strings.append(str(p))
	points_table_input.text = ",".join(pts_strings)

func _on_apply_settings_pressed() -> void:
	if not MultiplayerManager.is_host():
		return
		
	# Update GameConfig settings from SpinBoxes
	GameConfig.max_players = int(max_players_spin.value)
	GameConfig.maze_width = int(maze_width_spin.value)
	GameConfig.maze_height = int(maze_height_spin.value)
	GameConfig.round_time = int(round_time_spin.value)
	GameConfig.win_points = int(win_points_spin.value)
	
	# Parse Points table
	var tokens = points_table_input.text.split(",")
	var table = []
	for token in tokens:
		var val = token.strip_edges()
		if val.is_valid_int():
			table.append(int(val))
	if table.size() > 0:
		GameConfig.points_table = table
		
	# Push changes to clients
	MultiplayerManager.push_settings()
	status_lbl.text = "Lobby settings updated and broadcasted."

func _on_ready_updated(_peer_id: int, _ready: bool) -> void:
	_on_player_list_updated()
