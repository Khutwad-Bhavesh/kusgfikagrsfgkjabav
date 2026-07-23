# res://scripts/Player.gd
extends CharacterBody2D

# ═══════════════════════════════════════════════════════════
# EXPORT VARIABLES (Must be at top)
# ═══════════════════════════════════════════════════════════

@export var player_id: int = 1

# ═══════════════════════════════════════════════════════════
# REGULAR VARIABLES (Before @onready)
# ═══════════════════════════════════════════════════════════

# Network
var is_local_player: bool = false

# Movement
const SPEED = 200.0
const DASH_SPEED = 400.0
const DASH_DURATION = 0.2
const SNATCH_RANGE = 60.0

var input_direction = Vector2.ZERO
var is_dashing = false
var dash_timer = 0.0
var dash_cooldown_timer = 0.0
const DASH_COOLDOWN = 2.0

# Animation
var last_direction = Vector2.DOWN  # Default facing down
var is_moving = false

# Crown
var has_crown = false

# Interpolation
var server_position = Vector2.ZERO
var server_velocity = Vector2.ZERO

# ═══════════════════════════════════════════════════════════
# NODE REFERENCES (@onready LAST!)
# ═══════════════════════════════════════════════════════════

@onready var name_label = $NameLabel
@onready var crown_sprite = $CrownSprite
@onready var sprite = $AnimatedSprite2D

# ═══════════════════════════════════════════════════════════
# READY
# ═══════════════════════════════════════════════════════════

func _ready():
	# Verify NetworkManager
	if not NetworkManager:
		push_error("❌ Player: NetworkManager not found!")
		return
	
	is_local_player = (player_id == multiplayer.get_unique_id())
	
	# Simple color based on player ID (no CharacterData needed)
	#var colors = [Color.RED, Color.BLUE, Color.GREEN, Color.YELLOW]
	#sprite.modulate = colors[player_id % 4]
	
	# Set name
	if is_local_player:
		name_label.text = "YOU"
		name_label.modulate = Color.YELLOW
	else:
		var player_name = NetworkManager.get_player_name(player_id)
		name_label.text = player_name if player_name else "Player"
	
	# Hide crown initially
	if crown_sprite:
		crown_sprite.visible = false
	
	# Start with idle animation
	_play_animation("idle_down")
	
	server_position = position
	server_velocity = velocity
	
	print("✅ Player ", player_id, " ready")

# ═══════════════════════════════════════════════════════════
# PHYSICS
# ═══════════════════════════════════════════════════════════

func _physics_process(delta):
	if is_local_player:
		_handle_local_player(delta)
	else:
		_handle_remote_player(delta)
	
	# Update animation for all players
	_update_animation()

# ═══════════════════════════════════════════════════════════
# LOCAL PLAYER
# ═══════════════════════════════════════════════════════════

func _handle_local_player(delta):
	# Get input
	input_direction = Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
	
	# Update facing direction if moving
	if input_direction != Vector2.ZERO:
		last_direction = input_direction
		is_moving = true
	else:
		is_moving = false
	
	# Dash cooldown
	if dash_cooldown_timer > 0:
		dash_cooldown_timer -= delta
	
	# Dash
	if Input.is_action_just_pressed("ui_accept") and dash_cooldown_timer <= 0:
		_start_dash()
	
	# Snatch attempt
	if Input.is_action_just_pressed("ui_select") and not has_crown:
		_attempt_snatch()
	
	if is_dashing:
		dash_timer -= delta
		if dash_timer <= 0:
			is_dashing = false
	
	# Movement
	if is_dashing:
		velocity = input_direction.normalized() * DASH_SPEED
	elif input_direction != Vector2.ZERO:
		velocity = input_direction.normalized() * SPEED
	else:
		velocity = velocity.move_toward(Vector2.ZERO, SPEED * delta * 5)
	
	# Crown carrier slowdown
	if has_crown:
		velocity *= 0.9
	
	move_and_slide()
	
	# Sync position AND animation state to server
	_sync_position.rpc(position, velocity, is_dashing, last_direction, is_moving)

func _start_dash():
	is_dashing = true
	dash_timer = DASH_DURATION
	dash_cooldown_timer = DASH_COOLDOWN
	
	_play_dash_effect.rpc()

func _attempt_snatch():
	# Find game manager
	var game_manager = get_tree().get_first_node_in_group("game_manager")
	
	if not game_manager:
		print("⚠️ GameManager not found")
		return
	
	if not game_manager.has_method("request_snatch"):
		return
	
	if game_manager.crown_carrier_id == -1:
		return
	
	if not game_manager.players.has(game_manager.crown_carrier_id):
		return
	
	var carrier = game_manager.players[game_manager.crown_carrier_id]
	var distance = global_position.distance_to(carrier.global_position)
	
	if distance <= SNATCH_RANGE:
		print("🎯 Attempting snatch on player ", game_manager.crown_carrier_id)
		game_manager.request_snatch.rpc_id(1, game_manager.crown_carrier_id)

# ═══════════════════════════════════════════════════════════
# REMOTE PLAYER
# ═══════════════════════════════════════════════════════════

func _handle_remote_player(delta):
	position = position.lerp(server_position, 10.0 * delta)
	velocity = velocity.lerp(server_velocity, 10.0 * delta)

# ═══════════════════════════════════════════════════════════
# ANIMATION
# ═══════════════════════════════════════════════════════════

func _update_animation():
	if not sprite:
		return
	
	# Determine direction
	var anim_name = ""
	
	if is_moving or velocity.length() > 10:
		# Moving - play walk animation
		if abs(last_direction.x) > abs(last_direction.y):
			# Horizontal movement
			if last_direction.x > 0:
				anim_name = "walk_right"
			else:
				anim_name = "walk_left"
		else:
			# Vertical movement
			if last_direction.y > 0:
				anim_name = "walk_down"
			else:
				anim_name = "walk_up"
	else:
		# Idle - play idle animation
		if abs(last_direction.x) > abs(last_direction.y):
			if last_direction.x > 0:
				anim_name = "idle_right"
			else:
				anim_name = "idle_left"
		else:
			if last_direction.y > 0:
				anim_name = "idle_down"
			else:
				anim_name = "idle_up"
	
	# Play animation if it exists
	_play_animation(anim_name)

func _play_animation(anim_name: String):
	if not sprite or not sprite.sprite_frames:
		return
	
	# Check if animation exists
	if sprite.sprite_frames.has_animation(anim_name):
		if sprite.animation != anim_name:
			sprite.play(anim_name)
	else:
		# Fallback: Try simpler animation names (if you only have "down", "up", "left", "right")
		var simple_name = anim_name.replace("walk_", "").replace("idle_", "")
		if sprite.sprite_frames.has_animation(simple_name):
			if sprite.animation != simple_name:
				sprite.play(simple_name)

# ═══════════════════════════════════════════════════════════
# NETWORK SYNC (RPC)
# ═══════════════════════════════════════════════════════════

@rpc("any_peer", "unreliable")
func _sync_position(new_position: Vector2, new_velocity: Vector2, dashing: bool, direction: Vector2, moving: bool):
	if is_local_player:
		return
	
	server_position = new_position
	server_velocity = new_velocity
	is_dashing = dashing
	last_direction = direction
	is_moving = moving

@rpc("any_peer", "call_local")
func _play_dash_effect():
	# Flash white during dash
	var original_color = sprite.modulate
	sprite.modulate = Color.WHITE
	await get_tree().create_timer(0.1).timeout
	sprite.modulate = original_color

@rpc("authority", "call_local")
func set_crown_carrier(carrying: bool):
	has_crown = carrying
	if crown_sprite:
		crown_sprite.visible = carrying

@rpc("authority", "call_local")
func play_snatch_animation():
	var original_color = sprite.modulate
	sprite.modulate = Color.GREEN
	await get_tree().create_timer(0.3).timeout
	sprite.modulate = original_color

@rpc("authority", "call_local")
func play_stunned_animation():
	var original_color = sprite.modulate
	sprite.modulate = Color.RED
	await get_tree().create_timer(0.5).timeout
	sprite.modulate = original_color

@rpc("authority", "call_local")
func play_failed_snatch_animation():
	var original_color = sprite.modulate
	sprite.modulate = Color.GRAY
	await get_tree().create_timer(0.3).timeout
	sprite.modulate = original_color
