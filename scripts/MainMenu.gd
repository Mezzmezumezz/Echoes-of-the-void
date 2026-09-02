# scripts/MainMenu.gd
# MENÚ PRINCIPAL + SETTINGS + Mouse - Echoes of the Void
extends Control

@onready var title: Label = $Title
@onready var subtitle: Label = $Subtitle
@onready var echo_label: Label = $EchoLabel

func _ready():
	Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
	# Pixelart filter nearest
	var bg = ColorRect.new()
	bg.size = Vector2(1920,1080)
	bg.color = Color(0.05,0.07,0.12)
	add_child(bg)
	move_child(bg,0)
	# Actualizar echoes
	if has_node("/root/GameManager"):
		var gm = get_node("/root/GameManager")
		if echo_label: echo_label.text = "Echoes: %d" % gm.echoes

func _on_play_pressed():
	get_tree().change_scene_to_file("res://scenes/Main.tscn")

func _on_skill_tree_pressed():
	# Abrir skill tree overlay sin cambiar escena
	if has_node("/root/SkillTree"):
		get_node("/root/SkillTree").open()
	else:
		var st = preload("res://scripts/SkillTreeManager.gd").new()
		add_child(st)
		st.open()

func _on_settings_pressed():
	$SettingsPanel.visible = not $SettingsPanel.visible

func _on_quit_pressed():
	get_tree().quit()

func _on_volume_changed(value: float):
	AudioServer.set_bus_volume_db(0, linear_to_db(value))
func _on_fullscreen_toggled(pressed: bool):
	if pressed:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)
	else:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED)
func _on_bpm_detect_toggled(pressed: bool):
	if has_node("/root/ResonanceManager"):
		get_node("/root/ResonanceManager").auto_detect_bpm = pressed
