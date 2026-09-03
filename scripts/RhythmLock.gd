# scripts/RhythmLock.gd
# PUERTA RÍTMICA - Estilo piano tiles para abrir áreas selladas
# Se activa con J cerca, aparecen 4 notas que deben golpearse al ritmo
extends Area2D

@export var lock_id: String = "lock_1"
@export var required_notes: int = 6
@export var time_per_note: float = 0.45
@export var reward_echoes: int = 30

var _is_active: bool = false
var _current_note: int = 0
var _lanes: Array = ["hit_0", "hit_1", "hit_2", "hit_3"]  # A, D, J, E
var _lane_labels: Array = ["A", "D", "J", "E"]
var _lane_colors: Array = [
	Color(0.2, 0.8, 1.0),
	Color(0.8, 0.2, 1.0),
	Color(1.0, 0.8, 0.2),
	Color(0.2, 1.0, 0.4)
]
var _canvas: CanvasLayer
var _tiles: Array = []
var _target_lane: int = -1
var _timer: float = 0.0
var _beat_count: int = 0
var _success: bool = false

var resonance: Node
var game_manager: Node

func _ready():
	body_entered.connect(_on_body_entered)
	body_exited.connect(_on_body_exited)
	if has_node("/root/ResonanceManager"):
		resonance = get_node("/root/ResonanceManager")
	game_manager = get_node_or_null("/root/GameManager")

func _on_body_entered(body: Node):
	if body.is_in_group("player") and body.has_method("take_damage"):
		# Mostrar hint
		pass

func _on_body_exited(body: Node):
	if body.is_in_group("player"):
		_cancel_lock()

func _unhandled_input(event):
	if not _is_active: return
	# Verificar si el jugador presionó alguna tecla de nota
	for i in 4:
		if event.is_action_pressed(_lanes[i]):
			_check_note(i)
			get_viewport().set_input_as_handled()
			return

func _process(delta):
	if not _is_active: return
	_timer -= delta
	if _timer <= 0:
		# Tiempo agotado para esta nota - fallo
		_fail_note()

func start_lock():
	if _is_active: return
	_is_active = true
	_current_note = 0
	_success = true
	_create_ui()
	_show_next_note()
	print("[RhythmLock] Iniciado: %s (%d notas)" % [lock_id, required_notes])

func _create_ui():
	_canvas = CanvasLayer.new()
	add_child(_canvas)

	var bg = ColorRect.new()
	bg.size = Vector2(1920, 1080)
	bg.color = Color(0, 0, 0, 0.7)
	_canvas.add_child(bg)

	var title = Label.new()
	title.text = "RHYTHM LOCK"
	title.position = Vector2(760, 200)
	title.size = Vector2(400, 50)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 32)
	title.add_theme_color_override("font_color", Color.GOLD)
	_canvas.add_child(title)

	var progress = Label.new()
	progress.name = "ProgressLabel"
	progress.text = "%d / %d" % [_current_note, required_notes]
	progress.position = Vector2(810, 270)
	progress.size = Vector2(300, 40)
	progress.horizontal_alignment = HORIZONTAL_CENTER
	progress.add_theme_font_size_override("font_size", 20)
	_canvas.add_child(progress)

	# 4 tiles de notas
	var tile_w = 120
	var tile_h = 300
	var start_x = 960 - (tile_w * 2 + 20)
	for i in 4:
		var tile = ColorRect.new()
		tile.size = Vector2(tile_w, tile_h)
		tile.position = Vector2(start_x + i * (tile_w + 15), 400)
		tile.color = _lane_colors[i] * Color(1, 1, 1, 0.25)
		_canvas.add_child(tile)

		var lbl = Label.new()
		lbl.text = _lane_labels[i]
		lbl.position = Vector2(start_x + i * (tile_w + 15) + tile_w/2 - 8, 530)
		lbl.size = Vector2(20, 30)
		lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		lbl.add_theme_font_size_override("font_size", 24)
		lbl.add_theme_color_override("font_color", Color.WHITE)
		_canvas.add_child(lbl)
		_tiles.append(tile)

	var hint = Label.new()
	hint.text = "Presiona A/D/J/E al ritmo!"
	hint.position = Vector2(710, 740)
	hint.size = Vector2(500, 30)
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint.add_theme_font_size_override("font_size", 16)
	hint.add_theme_color_override("font_color", Color(0.7, 0.7, 0.7))
	_canvas.add_child(hint)

func _show_next_note():
	if _current_note >= required_notes:
		_unlock()
		return

	# Reset tiles
	for i in 4:
		_tiles[i].color = _lane_colors[i] * Color(1, 1, 1, 0.25)

	_target_lane = randi() % 4
	_timer = time_per_note

	# Iluminar tile objetivo
	_tiles[_target_lane].color = _lane_colors[_target_lane]

	# Actualizar progreso
	var prog = _canvas.get_node("ProgressLabel")
	if prog:
		prog.text = "%d / %d" % [_current_note, required_notes]

func _check_note(lane: int):
	if lane == _target_lane:
		# Acierto
		_tiles[lane].color = Color(0.2, 1.0, 0.4, 0.8)
		_current_note += 1
		# Sonido de acierto
		if resonance and resonance.has_method("play_beep"):
			resonance.play_beep(1100, 0.08)
		await get_tree().create_timer(0.1).timeout
		_show_next_note()
	else:
		_fail_note()

func _fail_note():
	# Flash rojo en todas las tiles
	for i in 4:
		_tiles[i].color = Color(1, 0.2, 0.2, 0.6)
	_success = false
	_current_note = 0
	# Sonido de fallo
	if resonance and resonance.has_method("play_beep"):
		resonance.play_beep(200, 0.15)
	await get_tree().create_timer(0.3).timeout
	_show_next_note()

func _unlock():
	_success = true
	_is_active = false
	print("[RhythmLock] ¡Desbloqueado! %s" % lock_id)

	# Recompensa
	if game_manager:
		game_manager.add_echoes(reward_echoes)

	# Efecto visual de éxito
	for i in 4:
		_tiles[i].color = Color.GOLD
		var t = create_tween()
		t.tween_property(_tiles[i], "color", Color(1, 1, 1, 0), 0.5)
		t.tween_callback(_tiles[i].queue_free)

	await get_tree().create_timer(0.6).timeout
	# Eliminar UI y destruir el lock
	if _canvas: _canvas.queue_free()
	queue_free()

func _cancel_lock():
	if not _is_active: return
	_is_active = false
	if _canvas: _canvas.queue_free()
	_current_note = 0
	_success = false
	print("[RhythmLock] Cancelado")
