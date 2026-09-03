# scripts/Minimap.gd
# MINIMAP HUD - Muestra posición del jugador y的位置 de jefes/puertas
extends CanvasLayer

var _map_rect: ColorRect
var _player_dot: ColorRect
var _boss_dots: Array = []
var _door_dots: Array = []
var _world_min: float = 0.0
var _world_max: float = 9300.0
var _map_width: float = 240.0
var _map_height: float = 28.0
var _map_x: float = 1660.0
var _map_y: float = 12.0

func _ready():
	# Fondo del mapa
	_map_rect = ColorRect.new()
	_map_rect.size = Vector2(_map_width, _map_height)
	_map_rect.position = Vector2(_map_x, _map_y)
	_map_rect.color = Color(0.05, 0.05, 0.1, 0.75)
	add_child(_map_rect)

	# Borde
	var border = ColorRect.new()
	border.size = Vector2(_map_width + 4, _map_height + 4)
	border.position = Vector2(_map_x - 2, _map_y - 2)
	border.color = Color(0.3, 0.3, 0.4, 0.6)
	add_child(border)
	move_child(border, 0)

	# Dot del jugador
	_player_dot = ColorRect.new()
	_player_dot.size = Vector2(4, 6)
	_player_dot.color = Color(0.2, 1.0, 0.6)
	add_child(_player_dot)

	# Labels
	var lbl = Label.new()
	lbl.text = "MAP"
	lbl.position = Vector2(_map_x + _map_width / 2 - 16, _map_y + _map_height + 2)
	lbl.size = Vector2(40, 14)
	lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lbl.add_theme_font_size_override("font_size", 9)
	lbl.add_theme_color_override("font_color", Color(0.5, 0.5, 0.6))
	add_child(lbl)

func _process(_delta):
	var player = get_tree().get_first_node_in_group("player")
	if player == null: return

	# Actualizar posición del dot del jugador
	var t = clampf(player.global_position.x / _world_max, 0.0, 1.0)
	_player_dot.position = Vector2(_map_x + t * (_map_width - 4), _map_y + _map_height / 2 - 3)

	# Crear dots de bosses si no existen
	if _boss_dots.is_empty():
		_create_boss_dots()

	# Actualizar dots de bosses (quizas muertos)
	for data in _boss_dots:
		if is_instance_valid(data["node"]):
			var boss = data["node"]
			if "state" in boss and boss.state == 6:  # State.DEAD
				data["dot"].color = Color(0.3, 0.3, 0.3, 0.5)
			else:
				var bt = clampf(boss.global_position.x / _world_max, 0.0, 1.0)
				data["dot"].position.x = _map_x + bt * (_map_width - 4)

func _create_boss_dots():
	var bosses = get_tree().get_nodes_in_group("boss")
	for boss in bosses:
		if not "boss_name" in boss: continue
		var dot = ColorRect.new()
		dot.size = Vector2(5, 5)
		dot.color = Color(1, 0.3, 0.3)
		var bt = clampf(boss.global_position.x / _world_max, 0.0, 1.0)
		dot.position = Vector2(_map_x + bt * (_map_width - 4), _map_y + _map_height / 2 - 2)
		add_child(dot)
		_boss_dots.append({"node": boss, "dot": dot})
