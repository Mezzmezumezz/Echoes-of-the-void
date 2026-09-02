# scripts/PauseMenu.gd
# PAUSA + SETTINGS in-game
extends CanvasLayer

var _is_paused: bool = false
@onready var panel: Panel = $Panel

func _ready():
	visible = false
	process_mode = Node.PROCESS_MODE_ALWAYS

func _unhandled_input(event):
	if event.is_action_pressed("ui_cancel") or event.is_action_pressed("pause"):
		if not _is_paused:
			pause()
		else:
			resume()
		get_viewport().set_input_as_handled()

func pause():
	_is_paused = true
	visible = true
	if panel: panel.visible = true
	get_tree().paused = true
	Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)

func resume():
	_is_paused = false
	visible = false
	if panel: panel.visible = false
	get_tree().paused = false
	Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)

func _on_resume_pressed(): resume()
func _on_skill_tree_pressed():
	# Abrir skill tree desde pausa
	if has_node("/root/SkillTreeManager"):
		get_node("/root/SkillTreeManager").open()
func _on_menu_pressed():
	get_tree().paused = false
	get_tree().change_scene_to_file("res://scenes/MainMenu.tscn")
func _on_quit_pressed(): get_tree().quit()
