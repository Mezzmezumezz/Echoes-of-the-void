# scripts/ShadowShade.gd
# SOMBRA HK + MINIJUEGO OSU/PIANO TILES - Echoes of the Void
# Al morir dejas sombra con tus Echoes. Al tocarla: secuencia 4 notas al ritmo.
extends Area2D

@export var echoes_amount: int = 0
var _player_in: bool = false
var _minigame_active: bool = false
var _sequence: Array[int] = [] # 0-3 posiciones (4 carriles)
var _current_idx: int = 0
var _tiles: Array[ColorRect] = []
var _canvas: CanvasLayer
var _resonance: Node

func _ready():
	add_to_group("shade")
	collision_layer = 0
	collision_mask = 2
	monitoring = true
	# Visual sombra pixelart placeholder
	var vis = ColorRect.new()
	vis.size = Vector2(24, 32)
	vis.position = Vector2(-12, -16)
	vis.color = Color(0.1, 0.1, 0.15, 0.85)
	add_child(vis)
	var inner = ColorRect.new()
	inner.size = Vector2(16, 16)
	inner.position = Vector2(-8, -8)
	inner.color = Color(0.6, 0.4, 1, 0.6)
	vis.add_child(inner)
	# Pulso
	var t = create_tween().set_loops()
	t.tween_property(vis, "scale", Vector2(1.08, 1.08), 0.6)
	t.tween_property(vis, "scale", Vector2.ONE, 0.6)

	if has_node("/root/ResonanceManager"):
		_resonance = get_node("/root/ResonanceManager")
	if has_node("/root/GameManager"):
		var gm = get_node("/root/GameManager")
		echoes_amount = gm.shade_echoes
		print("[Shade] Creada con ", echoes_amount, " Echoes en ", global_position)

	connect("body_entered", _on_body_entered)
	connect("body_exited", _on_body_exited)

func _on_body_entered(b):
	if b.is_in_group("player") and not _minigame_active:
		_player_in = true
		_show_prompt(true)

func _on_body_exited(b):
	if b.is_in_group("player"):
		_player_in = false
		_show_prompt(false)

func _show_prompt(show: bool):
	if _canvas and _canvas.has_node("Prompt"):
		_canvas.get_node("Prompt").visible = show

func _process(_delta):
	if _player_in and Input.is_action_just_pressed("attack") and not _minigame_active:
		_start_minigame()

	if _minigame_active:
		# Input piano: teclas 1-4 o J/K o A/D mapeadas a carriles
		for i in 4:
			if Input.is_action_just_pressed("hit_%d" % i) or _check_alt_input(i):
				_try_hit(i)

func _check_alt_input(lane: int) -> bool:
	# Mapeo alternativo para teclado sin hit_0-3: J/K/Q/E simulados
	if lane == 0 and Input.is_action_just_pressed("move_left"): return true
	if lane == 1 and Input.is_action_just_pressed("move_right"): return true
	if lane == 2 and Input.is_action_just_pressed("attack"): return true
	if lane == 3 and Input.is_action_just_pressed("special"): return true
	return false

func _start_minigame():
	_minigame_active = true
	_current_idx = 0
	_sequence.clear()
	# Generar secuencia 6 notas aleatorias
	for i in 6:
		_sequence.append(randi() % 4)
	print("[Shade] Minijuego iniciado secuencia:", _sequence)
	_create_ui()
	_highlight_next()

func _create_ui():
	_canvas = CanvasLayer.new()
	add_child(_canvas)
	var panel = ColorRect.new()
	panel.size = Vector2(420, 140)
	panel.position = Vector2(750, 420)
	panel.color = Color(0.08, 0.08, 0.12, 0.92)
	_canvas.add_child(panel)
	var title = Label.new()
	title.text = "¡RECUPERA TU ECO! Toca al RITMO (6 notas)"
	title.position = Vector2(16, 10)
	title.add_theme_font_size_override("font_size", 14)
	panel.add_child(title)
	var hint = Label.new()
	hint.name = "Hint"
	hint.text = "A / D / J / E al BEAT"
	hint.position = Vector2(16, 32)
	hint.add_theme_font_size_override("font_size", 11)
	panel.add_child(hint)

	_tiles.clear()
	for i in 4:
		var tile = ColorRect.new()
		tile.size = Vector2(80, 80)
		tile.position = Vector2(16 + i*100, 55)
		tile.color = Color(0.2, 0.2, 0.25)
		panel.add_child(tile)
		var lbl = Label.new()
		lbl.text = ["A","D","J","E"][i]
		lbl.position = Vector2(32, 30)
		lbl.add_theme_font_size_override("font_size", 18)
		tile.add_child(lbl)
		_tiles.append(tile)

	var prompt = Label.new()
	prompt.name = "Prompt"
	prompt.text = "Presiona J cerca de la sombra para recuperar"
	prompt.position = Vector2(global_position.x - 110, global_position.y - 60)
	prompt.add_theme_font_size_override("font_size", 10)
	prompt.visible = _player_in
	_canvas.add_child(prompt)

func _highlight_next():
	if _current_idx >= _sequence.size():
		_success()
		return
	for i in 4:
		_tiles[i].color = Color(0.2,0.2,0.25)
	var target = _sequence[_current_idx]
	# Pulso al ritmo antes de pedir input
	if _resonance:
		await get_tree().create_timer(0.15).timeout
	_tiles[target].color = Color(1, 0.9, 0.3)
	var t = create_tween()
	t.tween_property(_tiles[target], "scale", Vector2(1.12,1.12), 0.12)
	t.tween_property(_tiles[target], "scale", Vector2.ONE, 0.12)

func _try_hit(lane: int):
	if not _minigame_active: return
	var expected = _sequence[_current_idx]
	var timing = _resonance.evaluate_timing() if _resonance else {"result":"PERFECT", "diff_ms":0}
	# Debe ser PERFECT/GOOD y carril correcto
	if lane != expected:
		_fail("Carril incorrecto")
		return
	if timing.result == "MISS":
		_fail("Fuera de ritmo (MISS %.0fms)" % timing.diff_ms)
		return

	# Acierto
	_tiles[lane].color = Color(0.2, 1, 0.5)
	print("[Shade] Nota %d/%d %s (%.1fms)" % [_current_idx+1, _sequence.size(), timing.result, timing.diff_ms])
	_current_idx += 1
	await get_tree().create_timer(0.18).timeout
	if _current_idx < _sequence.size():
		_highlight_next()
	else:
		_success()

func _success():
	_minigame_active = false
	print("[Shade] ¡ÉXITO! Recuperas echoes")
	if has_node("/root/GameManager"):
		get_node("/root/GameManager").recover_shade_success()
	# Efecto
	var t = create_tween()
	for tile in _tiles:
		t.parallel().tween_property(tile, "color", Color(0.2,1,0.5), 0.2)
	await get_tree().create_timer(0.5).timeout
	queue_free()
	if _canvas: _canvas.queue_free()

func _fail(reason: String):
	_minigame_active = false
	print("[Shade] Fallo: ", reason)
	if has_node("/root/GameManager"):
		get_node("/root/GameManager").recover_shade_fail()
	# Flash rojo
	for tile in _tiles:
		tile.color = Color(1,0.3,0.3)
	await get_tree().create_timer(0.7).timeout
	# Desaparece igualmente pero sin recompensa
	queue_free()
	if _canvas: _canvas.queue_free()
