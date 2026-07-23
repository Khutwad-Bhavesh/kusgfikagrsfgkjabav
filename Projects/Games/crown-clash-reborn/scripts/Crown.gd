extends Area2D

@onready var polygon = $Polygon2D

var pulse_time: float = 0.0

func _ready() -> void:
	body_entered.connect(_on_body_entered)
	MultiplayerManager.crown_picked_up.connect(_on_crown_picked_up)
	MultiplayerManager.round_started.connect(_on_round_started)

func setup(pos: Vector2) -> void:
	global_position = pos
	show()

func _process(delta: float) -> void:
	# Pulsing scale animation
	pulse_time += delta * 4.0
	var scale_val = 1.0 + sin(pulse_time) * 0.15
	if polygon:
		polygon.scale = Vector2(scale_val, scale_val)

func _on_body_entered(body: Node2D) -> void:
	if body.has_method("setup"): # Check if it's a Player node
		# Only the player possessing multiplayer authority should request the pickup
		if body.is_multiplayer_authority():
			if MultiplayerManager.get_crown_holder_id() == -1:
				if MultiplayerManager.is_host():
					MultiplayerManager.request_crown_pickup_by_peer(body.peer_id)
				else:
					MultiplayerManager.request_crown_pickup.rpc_id(1)

func _on_crown_picked_up(_peer_id: int) -> void:
	hide()

func _on_round_started() -> void:
	# Show again if round resets
	if MultiplayerManager.get_crown_holder_id() == -1:
		show()
