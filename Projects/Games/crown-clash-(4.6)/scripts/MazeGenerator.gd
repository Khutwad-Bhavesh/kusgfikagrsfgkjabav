# res://scripts/MazeGenerator.gd
extends Node2D

const CELL_SIZE = 64
const MAZE_WIDTH = 20
const MAZE_HEIGHT = 20


var maze_grid = []
enum CellType { WALL, FLOOR }

@onready var tile_map = $TileMapLayer

func _ready():
	if NetworkManager.is_server():
		var maze_seed = randi()
		print("🏗️ Generating maze with seed: ", maze_seed)
		generate_maze.rpc(maze_seed)

@rpc("authority", "call_local", "reliable")
func generate_maze(maze_seed: int):
	seed(maze_seed)
	print("🎲 Using seed: ", maze_seed)
	
	_initialize_grid()
	_prims_algorithm()
	_build_tilemap()
	
	print("✅ Maze generated!")

func _initialize_grid():
	maze_grid = []
	for y in range(MAZE_HEIGHT):
		var row = []
		for x in range(MAZE_WIDTH):
			row.append(CellType.WALL)
		maze_grid.append(row)

func _prims_algorithm():
	var walls_list = []
	var start_x = MAZE_WIDTH / 2
	var start_y = MAZE_HEIGHT / 2
	
	maze_grid[start_y][start_x] = CellType.FLOOR
	_add_walls(start_x, start_y, walls_list)
	
	while walls_list.size() > 0:
		var wall = walls_list[randi() % walls_list.size()]
		walls_list.erase(wall)
		
		var wx = wall.x
		var wy = wall.y
		var neighbors = _get_floor_neighbors(wx, wy)
		
		if neighbors.size() == 1:
			maze_grid[wy][wx] = CellType.FLOOR
			_add_walls(wx, wy, walls_list)

func _add_walls(x: int, y: int, walls_list: Array):
	var directions = [Vector2i(0, -1), Vector2i(0, 1), Vector2i(-1, 0), Vector2i(1, 0)]
	
	for dir in directions:
		var nx = x + dir.x
		var ny = y + dir.y
		
		if _is_valid_cell(nx, ny) and maze_grid[ny][nx] == CellType.WALL:
			var wall = Vector2i(nx, ny)
			if wall not in walls_list:
				walls_list.append(wall)

func _get_floor_neighbors(x: int, y: int) -> Array:
	var neighbors = []
	var directions = [Vector2i(0, -1), Vector2i(0, 1), Vector2i(-1, 0), Vector2i(1, 0)]
	
	for dir in directions:
		var nx = x + dir.x
		var ny = y + dir.y
		
		if _is_valid_cell(nx, ny) and maze_grid[ny][nx] == CellType.FLOOR:
			neighbors.append(Vector2i(nx, ny))
	
	return neighbors

func _is_valid_cell(x: int, y: int) -> bool:
	return x >= 0 and x < MAZE_WIDTH and y >= 0 and y < MAZE_HEIGHT

func _build_tilemap():
	if not tile_map:
		print("❌ No TileMapLayer!")
		return
	
	tile_map.clear()
	
	for y in range(MAZE_HEIGHT):
		for x in range(MAZE_WIDTH):
			if maze_grid[y][x] == CellType.WALL:
				# Only set wall tiles - floors are empty
				tile_map.set_cell(Vector2i(x, y), 0, Vector2i(0, 0))
	
	print("✅ Tilemap built!")

func get_random_floor_position() -> Vector2:
	var floor_cells = []
	
	for y in range(MAZE_HEIGHT):
		for x in range(MAZE_WIDTH):
			if maze_grid[y][x] == CellType.FLOOR:
				floor_cells.append(Vector2i(x, y))
	
	if floor_cells.size() > 0:
		var cell = floor_cells[randi() % floor_cells.size()]
		return Vector2(cell.x * CELL_SIZE + CELL_SIZE / 2, cell.y * CELL_SIZE + CELL_SIZE / 2)
	
	return Vector2(CELL_SIZE * 2, CELL_SIZE * 2)

func get_spawn_positions() -> Array:
	var positions = []
	var floor_cells = []
	
	for y in range(MAZE_HEIGHT):
		for x in range(MAZE_WIDTH):
			if maze_grid[y][x] == CellType.FLOOR:
				floor_cells.append(Vector2i(x, y))
	
	if floor_cells.size() >= 4:
		var corners = [
			_find_floor_in_area(1, 1, MAZE_WIDTH/2, MAZE_HEIGHT/2),
			_find_floor_in_area(MAZE_WIDTH/2, 1, MAZE_WIDTH-1, MAZE_HEIGHT/2),
			_find_floor_in_area(1, MAZE_HEIGHT/2, MAZE_WIDTH/2, MAZE_HEIGHT-1),
			_find_floor_in_area(MAZE_WIDTH/2, MAZE_HEIGHT/2, MAZE_WIDTH-1, MAZE_HEIGHT-1)
		]
		
		for corner in corners:
			if corner != Vector2.ZERO:
				positions.append(corner)
	
	while positions.size() < 4:
		var cell = floor_cells[randi() % floor_cells.size()]
		var pos = Vector2(cell.x * CELL_SIZE + CELL_SIZE / 2, cell.y * CELL_SIZE + CELL_SIZE / 2)
		if pos not in positions:
			positions.append(pos)
	
	return positions

func _find_floor_in_area(x1: int, y1: int, x2: int, y2: int) -> Vector2:
	for y in range(y1, y2):
		for x in range(x1, x2):
			if _is_valid_cell(x, y) and maze_grid[y][x] == CellType.FLOOR:
				return Vector2(x * CELL_SIZE + CELL_SIZE / 2, y * CELL_SIZE + CELL_SIZE / 2)
	return Vector2.ZERO

func world_to_grid(world_pos: Vector2) -> Vector2i:
	return Vector2i(int(world_pos.x / CELL_SIZE), int(world_pos.y / CELL_SIZE))

func grid_to_world(grid_pos: Vector2i) -> Vector2:
	return Vector2(grid_pos.x * CELL_SIZE + CELL_SIZE / 2, grid_pos.y * CELL_SIZE + CELL_SIZE / 2)

func is_walkable(world_pos: Vector2) -> bool:
	var grid_pos = world_to_grid(world_pos)
	if not _is_valid_cell(grid_pos.x, grid_pos.y):
		return false
	return maze_grid[grid_pos.y][grid_pos.x] == CellType.FLOOR


#==================================================================================================
#==================================================================================================
func _add_border_walls():
	# Top border (row -1)
	for x in range(-1, MAZE_WIDTH + 1):
		var wall = ColorRect.new()
		wall.color = Color.BLACK
		wall.position = Vector2(x * CELL_SIZE, -CELL_SIZE)
		wall.size = Vector2(CELL_SIZE, CELL_SIZE)
		add_child(wall)
	
	# Bottom border (row MAZE_HEIGHT)
	for x in range(-1, MAZE_WIDTH + 1):
		var wall = ColorRect.new()
		wall.color = Color.BLACK
		wall.position = Vector2(x * CELL_SIZE, MAZE_HEIGHT * CELL_SIZE)
		wall.size = Vector2(CELL_SIZE, CELL_SIZE)
		add_child(wall)
	
	# Left border (column -1)
	for y in range(MAZE_HEIGHT):
		var wall = ColorRect.new()
		wall.color = Color.BLACK
		wall.position = Vector2(-CELL_SIZE, y * CELL_SIZE)
		wall.size = Vector2(CELL_SIZE, CELL_SIZE)
		add_child(wall)
	
	# Right border (column MAZE_WIDTH)
	for y in range(MAZE_HEIGHT):
		var wall = ColorRect.new()
		wall.color = Color.BLACK
		wall.position = Vector2(MAZE_WIDTH * CELL_SIZE, y * CELL_SIZE)
		wall.size = Vector2(CELL_SIZE, CELL_SIZE)
		add_child(wall)
	
	# Add collision
	_add_border_collision()

func _add_border_collision():
	# Top
	var top = StaticBody2D.new()
	var top_col = CollisionShape2D.new()
	var top_shape = RectangleShape2D.new()
	top_shape.size = Vector2((MAZE_WIDTH+2)*64, 64)
	top_col.shape = top_shape
	top_col.position = Vector2(MAZE_WIDTH*32, -32)
	top.add_child(top_col)
	add_child(top)
	
	# Bottom
	var bot = StaticBody2D.new()
	var bot_col = CollisionShape2D.new()
	var bot_shape = RectangleShape2D.new()
	bot_shape.size = Vector2((MAZE_WIDTH+2)*64, 64)
	bot_col.shape = bot_shape
	bot_col.position = Vector2(MAZE_WIDTH*32, MAZE_HEIGHT*64+32)
	bot.add_child(bot_col)
	add_child(bot)
	
	# Left
	var left = StaticBody2D.new()
	var left_col = CollisionShape2D.new()
	var left_shape = RectangleShape2D.new()
	left_shape.size = Vector2(64, MAZE_HEIGHT*64)
	left_col.shape = left_shape
	left_col.position = Vector2(-32, MAZE_HEIGHT*32)
	left.add_child(left_col)
	add_child(left)
	
	# Right
	var right = StaticBody2D.new()
	var right_col = CollisionShape2D.new()
	var right_shape = RectangleShape2D.new()
	right_shape.size = Vector2(64, MAZE_HEIGHT*64)
	right_col.shape = right_shape
	right_col.position = Vector2(MAZE_WIDTH*64+32, MAZE_HEIGHT*32)
	right.add_child(right_col)
	add_child(right)
	
	print("✅ Border walls with collision added!")
