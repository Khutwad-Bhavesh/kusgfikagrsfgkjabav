extends CharacterBody2D

var peer_id: int = 0
var player_name: String = "Player"
var character_color: Color = Color.WHITE
var has_crown: bool = false

@onready var sprite = $PlayerSprite
@onready var name_label = $NameLabel
@onready var glow = $Glow
@onready var camera = $Camera2D

func _ready() -> void:
	# Set player name and color if already setup
	_update_visuals()

func setup(p_peer_id: int, p_name: String, p_color: Color) -> void:
	peer_id = p_peer_id
	player_name = p_name
	character_color = p_color
	set_multiplayer_authority(peer_id)
	
	# Enable/disable process based on authority
	set_physics_process(is_multiplayer_authority())
	if camera:
		camera.enabled = is_multiplayer_authority()
	_update_visuals()

func _physics_process(_delta: float) -> void:
	if not is_multiplayer_authority():
		return
		
	var direction := Vector2.ZERO
	if Input.is_action_pressed("move_left"):
		direction.x -= 1
	if Input.is_action_pressed("move_right"):
		direction.x += 1
	if Input.is_action_pressed("move_up"):
		direction.y -= 1
	if Input.is_action_pressed("move_down"):
		direction.y += 1
		
	direction = direction.normalized()
	
	var current_speed = GameConfig.PLAYER_SPEED
	# Check if this player holds the crown (can look up from MultiplayerManager)
	var holder_id = MultiplayerManager.get_crown_holder_id()
	if holder_id == peer_id:
		current_speed *= GameConfig.CROWN_HOLDER_SPEED_MULT
		
	velocity = direction * current_speed
	move_and_slide()
	
	# Action: Snatch
	if Input.is_action_just_pressed("snatch"):
		_attempt_snatch()

func _attempt_snatch() -> void:
	# If I already have the crown, I don't need to snatch it
	var holder_id = MultiplayerManager.get_crown_holder_id()
	if holder_id == peer_id or holder_id == -1:
		return
		
	# Find the holder's player node
	var players_node = get_parent()
	if not players_node:
		return
		
	var target_player = null
	for child in players_node.get_children():
		if child is CharacterBody2D and child.peer_id == holder_id:
			target_player = child
			break
			
	if target_player:
		var dist = global_position.distance_to(target_player.global_position)
		if dist <= GameConfig.SNATCH_RADIUS:
			if MultiplayerManager.is_host():
				MultiplayerManager.request_snatch_by_peer(peer_id, holder_id)
			else:
				MultiplayerManager.request_snatch.rpc_id(1, holder_id)

func _update_visuals() -> void:
	if sprite:
		sprite.color = character_color
	if name_label:
		name_label.text = player_name
		# Highlight self in the viewport
		if is_multiplayer_authority():
			name_label.text += " (You)"
			name_label.add_theme_color_override("font_color", Color(1, 1, 0.7))
			
	# Update crown glow
	var is_holding = (MultiplayerManager.get_crown_holder_id() == peer_id)
	if glow:
		glow.visible = is_holding

func _process(_delta: float) -> void:
	# Keep visuals synced for non-authority peers as well
	var is_holding = (MultiplayerManager.get_crown_holder_id() == peer_id)
	if glow:
		glow.visible = is_holding
	if name_label and name_label.text == "Player" and player_name != "Player":
		_update_visuals()
