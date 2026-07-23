# res://scripts/MainMenu.gd
extends Control

# ═══════════════════════════════════════════════════════════
# NODE REFERENCES
# ═══════════════════════════════════════════════════════════

@onready var player_name_input = $VBoxContainer/PlayerNameInput
#@onready var character_select_button = $VBoxContainer/CharacterSelectButton
@onready var host_button = $VBoxContainer/HostButton
@onready var join_button = $VBoxContainer/JoinButton
@onready var ip_input = $VBoxContainer/IPInput
@onready var status_label = $VBoxContainer/StatusLabel
#@onready var selected_character_label = $VBoxContainer/SelectedCharacterLabel

# ═══════════════════════════════════════════════════════════
# READY
# ═══════════════════════════════════════════════════════════

func _ready():
	# Verify NetworkManager is available
	if not NetworkManager:
		push_error("❌ NetworkManager not found! Check Autoload settings!")
		status_label.text = "ERROR: NetworkManager not loaded!"
		return
	
	print("✅ MainMenu: NetworkManager found")
	
	# Default values
	player_name_input.text = "Player_" + str(randi() % 1000)
	ip_input.text = "127.0.0.1"
	
	# Connect buttons
	
	host_button.pressed.connect(_on_host_pressed)
	join_button.pressed.connect(_on_join_pressed)
	
	# Connect network signals
	NetworkManager.connection_succeeded.connect(_on_connection_success)
	NetworkManager.connection_failed.connect(_on_connection_failed)
	NetworkManager.server_disconnected.connect(_on_server_disconnected)
	
	# Update character display
	_update_character_display()

# ═══════════════════════════════════════════════════════════
# UPDATE UI
# ═══════════════════════════════════════════════════════════

func _update_character_display():
	var char_data = CharacterData.get_character_by_id(NetworkManager.local_player_character_id)
#	selected_character_label.text = "Selected: " + char_data.name

# ═══════════════════════════════════════════════════════════
# BUTTON HANDLERS
# ═══════════════════════════════════════════════════════════

func _on_host_pressed():
	var player_name = player_name_input.text.strip_edges()
	
	if player_name == "":
		status_label.text = "❌ Enter a player name!"
		return
	
	status_label.text = "Creating server..."
	
	var result = NetworkManager.create_server(player_name)
	
	if result == OK:
		status_label.text = "✅ Hosting! Waiting for players..."
		await get_tree().create_timer(0.5).timeout
		_go_to_lobby()
	else:
		status_label.text = "❌ Failed to create server!"

func _on_join_pressed():
	var player_name = player_name_input.text.strip_edges()
	var ip = ip_input.text.strip_edges()
	
	if player_name == "":
		status_label.text = "❌ Enter a player name!"
		return
	
	if ip == "":
		ip = "127.0.0.1"
	
	status_label.text = "Connecting to " + ip + "..."
	
	var result = NetworkManager.join_server(ip, player_name)
	
	if result != OK:
		status_label.text = "❌ Connection failed!"

# ═══════════════════════════════════════════════════════════
# NETWORK CALLBACKS
# ═══════════════════════════════════════════════════════════

func _on_connection_success():
	status_label.text = "✅ Connected! Entering lobby..."
	await get_tree().create_timer(0.5).timeout
	_go_to_lobby()

func _on_connection_failed():
	status_label.text = "❌ Connection failed!"

func _on_server_disconnected():
	status_label.text = "❌ Server disconnected!"

# ═══════════════════════════════════════════════════════════
# SCENE CHANGE
# ═══════════════════════════════════════════════════════════

func _go_to_lobby():
	get_tree().change_scene_to_file("res://scenes/Lobby.tscn")
func _get_local_ip() -> String:
	var addresses = IP.get_local_addresses()
	for address in addresses:
		# Find the local network IP (192.168.x.x or 10.x.x.x)
		if address.begins_with("192.168.") or address.begins_with("10."):
			return address
			return "127.0.0.1"  # fallback
