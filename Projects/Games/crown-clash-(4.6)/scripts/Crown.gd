# res://scripts/Crown.gd
extends Area2D

func _ready():
	body_entered.connect(_on_body_entered)
	print("👑 Crown spawned at: ", global_position)

func _on_body_entered(body):
	print("👑 Body entered: ", body.name)
	
	if not body.is_in_group("player"):
		return
	
	if not NetworkManager.is_server():
		return
	
	var player = body as CharacterBody2D
	if not player:
		return
	
	print("👑 Player ", player.player_id, " picked up crown!")
	
	# Get GameManager
	var game_manager = get_tree().get_first_node_in_group("game_manager")
	if game_manager:
		game_manager.crown_picked_up(player.player_id)
	
	queue_free()
