extends Area2D

@onready var sprite = $ExitSprite

var pulse_time: float = 0.0

func _ready() -> void:
	visible = false
	body_entered.connect(_on_body_entered)
	MultiplayerManager.crown_picked_up.connect(_on_crown_picked_up)
	MultiplayerManager.round_started.connect(_on_round_started)

func setup(pos: Vector2) -> void:
	global_position = pos
	visible = false

func _process(delta: float) -> void:
	if visible:
		# Pulsing glow animation
		pulse_time += delta * 3.0
		var alpha = 0.6 + sin(pulse_time) * 0.3
		if sprite:
			sprite.color.a = alpha

func _on_crown_picked_up(_peer_id: int) -> void:
	visible = true

func _on_body_entered(body: Node2D) -> void:
	if not visible:
		return
		
	# Check if body is Player
	if body.has_method("setup"):
		# Only the local player's authority triggers the escape request
		if body.is_multiplayer_authority():
			if MultiplayerManager.is_host():
				MultiplayerManager.request_escape_by_peer(body.peer_id)
			else:
				MultiplayerManager.request_escape.rpc_id(1)

func _on_round_started() -> void:
	visible = false
