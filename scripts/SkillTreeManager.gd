# scripts/SkillTreeManager.gd
# SKILL TREE + MENU - Echoes of the Void
# Árbol simple con 8 skills, compra con Echoes, mouse compatible
extends CanvasLayer

var _is_open: bool = false
var _game_manager: Node
var _echoes_label: Label
var _grid: GridContainer
var _buttons: Dictionary = {}

func _ready():
	visible = false
	_game_manager = get_node_or_null("/root/GameManager")
	_build_ui()
	if _game_manager and _game_manager.has_signal("echoes_changed"):
		_game_manager.connect("echoes_changed", _on_echoes_changed)

func _build_ui():
	var bg = ColorRect.new()
	bg.size = Vector2(1920,1080)
	bg.color = Color(0.06,0.06,0.09,0.96)
	add_child(bg)

	var title = Label.new()
	title.text = "ÁRBOL DE RESONANCIA"
	title.position = Vector2(760, 40)
	title.add_theme_font_size_override("font_size", 28)
	add_child(title)

	_echoes_label = Label.new()
	_echoes_label.position = Vector2(860, 80)
	_echoes_label.add_theme_font_size_override("font_size", 18)
	add_child(_echoes_label)
	_update_echoes_label()

	var hint = Label.new()
	hint.text = "Click para desbloquear | ESC para cerrar | Mouse compatible"
	hint.position = Vector2(720, 1040)
	add_child(hint)

	_grid = GridContainer.new()
	_grid.position = Vector2(520, 140)
	_grid.size = Vector2(880, 760)
	_grid.columns = 3
	_grid.add_theme_constant_override("h_separation", 24)
	_grid.add_theme_constant_override("v_separation", 18)
	add_child(_grid)

	# Crear botones por skill (excluir boss rewards que se desbloquean automáticamente)
	for id in _game_manager.skill_data.keys():
		var data = _game_manager.skill_data[id]
		if data.get("boss_reward", false): continue  # Estos se desbloquean al derrotar jefes
		var panel = Panel.new()
		panel.custom_minimum_size = Vector2(270, 150)
		_grid.add_child(panel)

		var name_lbl = Label.new()
		name_lbl.text = data["name"]
		name_lbl.position = Vector2(12, 12)
		name_lbl.add_theme_font_size_override("font_size", 13)
		panel.add_child(name_lbl)

		var desc = Label.new()
		desc.text = data["desc"]
		desc.position = Vector2(12, 34)
		desc.size = Vector2(246, 40)
		desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		desc.add_theme_font_size_override("font_size", 11)
		panel.add_child(desc)

		var cost = Label.new()
		cost.text = "%d Echoes" % data["cost"]
		cost.position = Vector2(12, 90)
		cost.add_theme_font_size_override("font_size", 12)
		panel.add_child(cost)

		var btn = Button.new()
		btn.text = "Desbloquear"
		btn.position = Vector2(12, 112)
		btn.size = Vector2(246, 28)
		btn.pressed.connect(func(): _try_unlock(id))
		panel.add_child(btn)
		_buttons[id] = {"panel": panel, "btn": btn, "cost": cost}

	_update_all_buttons()

func _try_unlock(id: String):
	if _game_manager.unlock_skill(id):
		_update_all_buttons()
		_update_echoes_label()
		# Feedback
		var btn = _buttons[id]["btn"]
		btn.text = "¡DESBLOQUEADO!"
		btn.disabled = true
		_buttons[id]["panel"].modulate = Color(0.6,1,0.6)
	else:
		# Shake si no puede
		var panel = _buttons[id]["panel"]
		var t = create_tween()
		t.tween_property(panel, "position", panel.position + Vector2(6,0), 0.06)
		t.tween_property(panel, "position", panel.position - Vector2(6,0), 0.06)
		t.tween_property(panel, "position", panel.position, 0.06)

func _update_all_buttons():
	for id in _buttons.keys():
		var btn = _buttons[id]["btn"]
		var panel = _buttons[id]["panel"]
		if _game_manager.has_skill(id):
			btn.text = "DESBLOQUEADO"
			btn.disabled = true
			panel.modulate = Color(0.7,1,0.7)
		elif _game_manager.can_unlock(id):
			btn.disabled = false
			btn.text = "Desbloquear"
			panel.modulate = Color.WHITE
		else:
			btn.disabled = true
			btn.text = "Bloqueado"
			panel.modulate = Color(0.6,0.6,0.6)

func _update_echoes_label():
	if _game_manager and _echoes_label:
		_echoes_label.text = "Echoes: %d" % _game_manager.echoes

func _on_echoes_changed(_v): _update_echoes_label()

func open():
	_is_open = true
	visible = true
	Engine.time_scale = 0.0
	Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
	_update_all_buttons()
	_update_echoes_label()

func close():
	_is_open = false
	visible = false
	Engine.time_scale = 1.0

func _unhandled_input(event):
	if event.is_action_pressed("ui_cancel") or event.is_action_pressed("skill_tree"):
		if _is_open:
			close()
			get_viewport().set_input_as_handled()
	if event.is_action_pressed("skill_tree"):
		if not _is_open:
			open()
			get_viewport().set_input_as_handled()
