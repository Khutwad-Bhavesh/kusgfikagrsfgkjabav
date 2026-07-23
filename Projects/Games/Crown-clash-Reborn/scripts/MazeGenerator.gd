class_name MazeGenerator
extends Node2D

# Bitmask values for walls
const WALL_NORTH = 1
const WALL_SOUTH = 2
const WALL_EAST = 4
const WALL_WEST = 8

var maze_width: int = 20
var maze_height: int = 20
var grid: Array = []
var start_cell: Vector2i = Vector2i(0, 0)
var exit_cell: Vector2i = Vector2i(0, 0)

# Colors
const COLOR_WALL = Color(0.1, 0.1, 0.18) # #1a1a2e
const COLOR_FLOOR = Color(0.09, 0.13, 0.24) # #16213e

func generate(w: int, h: int) -> void:
	maze_width = w
	maze_height = h
	grid.clear()
	
	# Clear existing children (for resets)
	for child in get_children():
		child.queue_free()
	
	# Initialize grid with all walls intact (value 15)
	for x in range(maze_width):
		var column = []
		for y in range(maze_height):
			column.append(WALL_NORTH | WALL_SOUTH | WALL_EAST | WALL_WEST)
		grid.append(column)
		
	# Recursive backtracker algorithm
	var stack: Array = []
	var current: Vector2i = Vector2i(0, 0)
	var visited: Dictionary = {}
	visited[current] = true
	
	while true:
		var unvisited_neighbors = []
		var directions = [
			Vector2i(0, -1), # North
			Vector2i(0, 1),  # South
			Vector2i(1, 0),  # East
			Vector2i(-1, 0)  # West
		]
		
		for dir in directions:
			var neighbor = current + dir
			if neighbor.x >= 0 and neighbor.x < maze_width and neighbor.y >= 0 and neighbor.y < maze_height:
				if not visited.has(neighbor):
					unvisited_neighbors.append(neighbor)
					
		if unvisited_neighbors.size() > 0:
			# Pick a random neighbor
			var next = unvisited_neighbors[randi() % unvisited_neighbors.size()]
			# Remove walls between current and next
			var diff = next - current
			if diff == Vector2i(0, -1): # North
				grid[current.x][current.y] &= ~WALL_NORTH
				grid[next.x][next.y] &= ~WALL_SOUTH
			elif diff == Vector2i(0, 1): # South
				grid[current.x][current.y] &= ~WALL_SOUTH
				grid[next.x][next.y] &= ~WALL_NORTH
			elif diff == Vector2i(1, 0): # East
				grid[current.x][current.y] &= ~WALL_EAST
				grid[next.x][next.y] &= ~WALL_WEST
			elif diff == Vector2i(-1, 0): # West
				grid[current.x][current.y] &= ~WALL_WEST
				grid[next.x][next.y] &= ~WALL_EAST
				
			visited[next] = true
			stack.append(current)
			current = next
		elif stack.size() > 0:
			current = stack.pop_back()
		else:
			break
			
	# Generate visual cells
	_create_visuals()
	
	# Determine exit cell (on the border)
	# E.g. bottom-right corner or opposite side of start (0,0)
	exit_cell = Vector2i(maze_width - 1, maze_height - 1)

func _create_visuals() -> void:
	var tile_size = GameConfig.TILE_SIZE
	
	# Background/floor covering the whole maze
	var floor_rect = ColorRect.new()
	floor_rect.size = Vector2(maze_width * tile_size, maze_height * tile_size)
	floor_rect.color = COLOR_FLOOR
	add_child(floor_rect)
	
	# Draw walls
	# To make it simple, we draw wall lines or rectangles along cell boundaries
	var wall_thickness = 8.0
	
	# Outer border walls
	_create_wall(Vector2(0, 0), Vector2(maze_width * tile_size, wall_thickness))
	_create_wall(Vector2(0, 0), Vector2(wall_thickness, maze_height * tile_size))
	_create_wall(Vector2(0, maze_height * tile_size - wall_thickness), Vector2(maze_width * tile_size, wall_thickness))
	_create_wall(Vector2(maze_width * tile_size - wall_thickness, 0), Vector2(wall_thickness, maze_height * tile_size))
	
	# Inner walls
	for x in range(maze_width):
		for y in range(maze_height):
			var cell_pos = Vector2(x * tile_size, y * tile_size)
			var walls = grid[x][y]
			
			# If there's an East wall and it's not the outer border, draw it
			if (walls & WALL_EAST) and (x < maze_width - 1):
				_create_wall(
					Vector2(cell_pos.x + tile_size - wall_thickness / 2, cell_pos.y),
					Vector2(wall_thickness, tile_size)
				)
				
			# If there's a South wall and it's not the outer border, draw it
			if (walls & WALL_SOUTH) and (y < maze_height - 1):
				_create_wall(
					Vector2(cell_pos.x, cell_pos.y + tile_size - wall_thickness / 2),
					Vector2(tile_size, wall_thickness)
				)

func _create_wall(top_left: Vector2, size: Vector2) -> void:
	var wall_body = StaticBody2D.new()
	wall_body.position = top_left + size / 2
	
	var wall_rect = ColorRect.new()
	wall_rect.size = size
	wall_rect.position = -size / 2
	wall_rect.color = COLOR_WALL
	wall_body.add_child(wall_rect)
	
	var wall_shape = CollisionShape2D.new()
	var shape = RectangleShape2D.new()
	shape.size = size
	wall_shape.shape = shape
	wall_body.add_child(wall_shape)
	
	add_child(wall_body)

func get_random_reachable_position() -> Vector2:
	var tile_size = GameConfig.TILE_SIZE
	var rx = randi() % maze_width
	var ry = randi() % maze_height
	return Vector2(rx * tile_size + tile_size / 2, ry * tile_size + tile_size / 2)

func get_exit_position() -> Vector2:
	var tile_size = GameConfig.TILE_SIZE
	return Vector2(exit_cell.x * tile_size + tile_size / 2, exit_cell.y * tile_size + tile_size / 2)
