extends Control

@onready var name_input = $CenterContainer/VBoxContainer/NameInput
@onready var ip_input = $CenterContainer/VBoxContainer/HBoxContainer/IPInput
@onready var host_btn = $CenterContainer/VBoxContainer/HostButton
@onready var join_btn = $CenterContainer/VBoxContainer/HBoxContainer/JoinButton
@onready var status_label = $CenterContainer/VBoxContainer/StatusLabel

func _ready() -> void:
	# Clean up previous network state if any
	MultiplayerManager.leave_game()
	
	# Connect local signals
	host_btn.pressed.connect(_on_host_pressed)
	join_btn.pressed.connect(_on_join_pressed)
	
	MultiplayerManager.connection_failed.connect(_on_connection_failed)
	MultiplayerManager.server_disconnected.connect(_on_server_disconnected)
	
	# Initialize defaults
	name_input.text = OS.get_environment("USER") if OS.has_environment("USER") else "Player_%d" % (randi() % 1000)
	status_label.text = ""

func _on_host_pressed() -> void:
	var player_name = name_input.text.strip_edges()
	if player_name.is_empty():
		status_label.text = "Please enter a name."
		return
		
	MultiplayerManager.local_player_name = player_name
	
	status_label.text = "Starting server..."
	var err = MultiplayerManager.host_game()
	if err == OK:
		get_tree().change_scene_to_file("res://scenes/Lobby.tscn")
	else:
		status_label.text = "Failed to host game: %d" % err

func _on_join_pressed() -> void:
	var player_name = name_input.text.strip_edges()
	if player_name.is_empty():
		status_label.text = "Please enter a name."
		return
		
	var ip = ip_input.text.strip_edges()
	if ip.is_empty():
		ip = "127.0.0.1" # default to localhost
		
	MultiplayerManager.local_player_name = player_name
	
	status_label.text = "Connecting to %s..." % ip
	var err = MultiplayerManager.join_game(ip)
	if err == OK:
		# Disable buttons during connection attempt
		host_btn.disabled = true
		join_btn.disabled = true
		MultiplayerManager.player_list_updated.connect(_on_connected_to_lobby)
	else:
		status_label.text = "Failed to initiate connection."

func _on_connected_to_lobby() -> void:
	# Disconnect listener once connected
	if MultiplayerManager.player_list_updated.is_connected(_on_connected_to_lobby):
		MultiplayerManager.player_list_updated.disconnect(_on_connected_to_lobby)
	get_tree().change_scene_to_file("res://scenes/Lobby.tscn")

func _on_connection_failed() -> void:
	status_label.text = "Connection failed."
	host_btn.disabled = false
	join_btn.disabled = false

func _on_server_disconnected() -> void:
	status_label.text = "Server disconnected."
	host_btn.disabled = false
	join_btn.disabled = false
