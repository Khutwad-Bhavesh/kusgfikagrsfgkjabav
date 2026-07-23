# res://scripts/Lobby.gd
extends Control

@onready var players_list  = $PanelContainer/PlayersList
@onready var ready_button  = $VBoxContainer/ReadyButton
@onready var start_button  = $VBoxContainer/StartButton
@onready var back_button   = $VBoxContainer/BackButton
@onready var status_label  = $VBoxContainer/StatusLabel

var is_ready = false

func _ready():
	ready_button.pressed.connect(_on_ready_pressed)
	start_button.pressed.connect(_on_start_pressed)
	back_button.pressed.connect(_on_back_pressed)
	
	NetworkManager.players_updated.connect(_update_players_list)
	NetworkManager.player_connected.connect(_on_player_joined)
	NetworkManager.player_disconnected.connect(_on_player_left)
	NetworkManager.server_disconnected.connect(_on_server_disconnected)
	
	start_button.visible = NetworkManager.is_server()
	
	# Show local IP so others can join
	if NetworkManager.is_server():
		status_label.text = "Your IP: " + NetworkManager.get_local_ip()
	
	_update_players_list()

func _update_players_list():
	for child in players_list.get_children():
		child.queue_free()
	
	for player in NetworkManager.players.values():
		var hbox = HBoxContainer.new()
		
		var ready_label = Label.new()
		ready_label.text = "✅" if player.ready else "❌"
		ready_label.custom_minimum_size = Vector2(30, 0)
		hbox.add_child(ready_label)
		
		var char_data = CharacterData.get_character_by_id(player.character_id)
		var portrait = ColorRect.new()
		portrait.color = char_data.color
		portrait.custom_minimum_size = Vector2(30, 30)
		hbox.add_child(portrait)
		
		var name_label = Label.new()
		var you_text = " (YOU)" if player.id == NetworkManager.local_player_id else ""
		name_label.text = "%s as %s%s" % [player.name, char_data.name, you_text]
		hbox.add_child(name_label)
		
		players_list.add_child(hbox)
	
	# Update start button state
	if NetworkManager.is_server():
		start_button.disabled = not NetworkManager.is_everyone_ready()

func _on_ready_pressed():
	is_ready = not is_ready
	ready_button.text = "READY ✅" if is_ready else "NOT READY ❌"
	NetworkManager.set_player_ready.rpc(NetworkManager.local_player_id, is_ready)

func _on_start_pressed():
	if not NetworkManager.is_server():
		return
	if not NetworkManager.is_everyone_ready():
		status_label.text = "⚠️ Mark yourself as Ready first!"
		return
	NetworkManager.start_game.rpc()

func _on_back_pressed():
	NetworkManager.disconnect_from_server()
	get_tree().change_scene_to_file("res://scenes/MainMenu.tscn")

func _on_player_joined(peer_id, player_data):
	status_label.text = player_data.name + " joined!"
	await get_tree().create_timer(2.0).timeout
	if NetworkManager.is_server():
		status_label.text = "Your IP: " + NetworkManager.get_local_ip()

func _on_player_left(_peer_id):
	status_label.text = "A player left"
	await get_tree().create_timer(2.0).timeout
	if NetworkManager.is_server():
		status_label.text = "Your IP: " + NetworkManager.get_local_ip()

func _on_server_disconnected():
	get_tree().change_scene_to_file("res://scenes/MainMenu.tscn")
