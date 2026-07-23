# res://scripts/VirtualJoystick.gd
# ═══════════════════════════════════════════════════════════
# VIRTUAL JOYSTICK - Android Touch Input
# ═══════════════════════════════════════════════════════════
# HOW TO SET UP IN GODOT:
#   1. Create a Control node in your Game scene (child of CanvasLayer)
#   2. Attach this script to it
#   3. Add two TextureRect or ColorRect children:
#        - $JoystickBase   (the outer ring, e.g. 120x120px circle)
#        - $JoystickKnob  (the inner knob, e.g. 60x60px circle)
#   4. Position the Control node at bottom-left of screen
#   5. In Player.gd _handle_local_player(), replace Input.get_vector()
#      with the line shown at the bottom of this file.
# ═══════════════════════════════════════════════════════════

extends Control

# ── Exported tweaks ──────────────────────────────────────
@export var joystick_radius: float = 60.0   # Max knob travel distance (px)
@export var dead_zone: float = 0.15          # Ignore tiny touches below this threshold (0-1)

# ── Node refs ────────────────────────────────────────────
@onready var base  = $JoystickBase
@onready var knob  = $JoystickKnob

# ── Runtime state ────────────────────────────────────────
var touch_index: int = -1          # Which finger owns this joystick (-1 = none)
var base_center: Vector2           # Center of the joystick base in local coords
var output: Vector2 = Vector2.ZERO # Normalized direction, read by Player.gd

# ── Action button touch tracking ─────────────────────────
# Each entry: { index, position }
var action_touch_index: int = -1   # finger on the right-side action area
signal dash_pressed                 # emitted when right-side tap detected
signal snatch_pressed               # emitted when double-tap / second button detected

# ═══════════════════════════════════════════════════════════
func _ready():
	# Make sure this control captures touch events
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	
	# Store base center once layout is settled
	await get_tree().process_frame
	base_center = base.position + base.size * 0.5
	
	# Center knob on base
	knob.position = base_center - knob.size * 0.5
	
	set_process_input(true)

# ═══════════════════════════════════════════════════════════
func _input(event: InputEvent):
	# ── Touch began ──────────────────────────────────────
	if event is InputEventScreenTouch:
		var touch_pos = event.position
		
		if event.pressed:
			# Left half of screen → joystick
			if touch_pos.x < get_viewport_rect().size.x * 0.5:
				if touch_index == -1:
					touch_index = event.index
					_move_knob(touch_pos)
			# Right half of screen → action buttons
			else:
				if action_touch_index == -1:
					action_touch_index = event.index
					# Single tap → Dash
					emit_signal("dash_pressed")
		else:
			# Finger lifted
			if event.index == touch_index:
				touch_index = -1
				output = Vector2.ZERO
				_reset_knob()
			if event.index == action_touch_index:
				action_touch_index = -1
	
	# ── Touch moved ──────────────────────────────────────
	elif event is InputEventScreenDrag:
		if event.index == touch_index:
			_move_knob(event.position)

# ═══════════════════════════════════════════════════════════
func _move_knob(touch_world_pos: Vector2):
	# Convert global screen position to local Control space
	var local_pos  = touch_world_pos - global_position
	var delta      = local_pos - base_center
	var distance   = delta.length()
	
	# Clamp knob inside radius
	var clamped    = delta.normalized() * min(distance, joystick_radius)
	knob.position  = base_center + clamped - knob.size * 0.5
	
	# Compute normalized output with dead zone
	var raw = clamped / joystick_radius          # -1..1 range
	if raw.length() < dead_zone:
		output = Vector2.ZERO
	else:
		output = raw

func _reset_knob():
	knob.position = base_center - knob.size * 0.5
	output = Vector2.ZERO

# ═══════════════════════════════════════════════════════════
# PUBLIC API  (called from Player.gd)
# ═══════════════════════════════════════════════════════════

## Returns a Vector2 identical in meaning to Input.get_vector()
func get_direction() -> Vector2:
	return output
