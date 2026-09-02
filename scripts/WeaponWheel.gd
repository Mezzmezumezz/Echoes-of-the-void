# scripts/WeaponWheel.gd
# RUEDA DE ARMAS ESTILO GTA 5 - Echoes of the Void
# Mantén Q o rueda del mouse, selecciona con mouse/ stick, cámara lenta
extends CanvasLayer

var _is_open: bool = false
var _center: Vector2 = Vector2(960, 540)
var _selected: int = 0
var _weapon_system: Node
var _panel: Control
var _slices: Array[Control] = []
var _center_label: Label

func _ready():
	visible = false
	# Crear UI procedural
	_panel = Control.new()
	_panel.size = Vector2(1920,1080)
	add_child(_panel)
	var bg = ColorRect.new()
	bg.size = Vector2(1920,1080)
	bg.color = Color(0,0,0,0.55)
	_panel.add_child(bg)

	_center_label = Label.new()
	_center_label.position = Vector2(960-80, 540-16)
	_center_label.size = Vector2(160,32)
	_center_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_center_label.add_theme_font_size_override("font_size", 20)
	_panel.add_child(_center_label)

	# 3 slices para 3 armas
	var names = ["PulseBlade","VoidWave","EchoShot"]
	var colors = [Color(0.2,0.9,1), Color(0.7,0.3,1), Color(1,0.85,0.2)]
	for i in 3:
		var slice = ColorRect.new()
		slice.size = Vector2(180, 80)
		# Posiciones en círculo 120°
		var ang = deg_to_rad(-90 + i*120)
		var r = 160
		slice.position = _center + Vector2(cos(ang), sin(ang)) * r - Vector2(90,40)
		slice.color = colors[i] * Color(1,1,1,0.9)
		_panel.add_child(slice)
		var lbl = Label.new()
		lbl.text = names[i]
		lbl.position = Vector2(10,10)
		lbl.add_theme_font_size_override("font_size", 14)
		slice.add_child(lbl)
		var desc = Label.new()
		desc.text = ["Corta","Media","Larga"][i]
		desc.position = Vector2(10,30)
		desc.add_theme_font_size_override("font_size", 10)
		slice.add_child(desc)
		var key = Label.new()
		key.text = "Q"
		key.position = Vector2(10,50)
		slice.add_child(key)
		_slices.append(slice)

	var hint = Label.new()
	hint.text = "Mantén Q + Mueve Mouse | Rueda del Mouse para cambiar | Click para confirmar"
	hint.position = Vector2(640, 1000)
	hint.add_theme_font_size_override("font_size", 13)
	_panel.add_child(hint)

func _process(_delta):
	# Input abrir/cerrar
	var want_open = Input.is_action_pressed("weapon_switch") or Input.is_key_pressed(KEY_TAB)
	if want_open and not _is_open:
		_open()
	elif not want_open and _is_open:
		_close(true)

	if _is_open:
		_update_selection()
		# Rueda mouse también cambia
		if Input.is_action_just_pressed("weapon_next"):
			_selected = (_selected + 1) % 3
		if Input.is_action_just_pressed("weapon_prev"):
			_selected = (_selected -1 +3)%3

func _open():
	if _weapon_system == null:
		var p = get_tree().get_first_node_in_group("player")
		if p and p.has_node("WeaponSystem"):
			_weapon_system = p.get_node("WeaponSystem")
			_selected = _weapon_system.current_idx
	_is_open = true
	visible = true
	Engine.time_scale = 0.22
	Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
	_update_selection()
	print("[Wheel] Abierta")

func _close(apply: bool):
	_is_open = false
	visible = false
	Engine.time_scale = 1.0
	if apply and _weapon_system:
		_weapon_system.switch_to(_selected)
		print("[Wheel] Seleccionada: ", _weapon_system.current_weapon)

func _update_selection():
	var mouse_pos = get_viewport().get_mouse_position()
	var dir = mouse_pos - _center
	if dir.length() < 40:
		return # zona muerta central
	var ang = rad_to_deg(dir.angle()) + 90
	ang = fposmod(ang, 360)
	_selected = int(ang / 120) % 3
	# Resaltar
	for i in 3:
		_slices[i].color = _slices[i].color * (1.2 if i==_selected else 0.6)
		_slices[i].color.a = 1.0
		_slices[i].scale = Vector2(1.08,1.08) if i==_selected else Vector2.ONE
	if _weapon_system:
		var names = _weapon_system.weapons
		_center_label.text = names[_selected]
