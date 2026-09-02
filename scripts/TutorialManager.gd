# scripts/TutorialManager.gd
# GESTOR DE TUTORIAL - Echoes of the Void
# Muestra mensajes contextuales por zonas. CanvasLayer + Area2D triggers
extends Node

@onready var canvas: CanvasLayer = $Canvas
@onready var panel: Panel = $Canvas/Panel
@onready var title_label: Label = $Canvas/Panel/Title
@onready var desc_label: Label = $Canvas/Panel/Desc
@onready var hint_label: Label = $Canvas/Hint

var _current_zone: String = ""
var _tween: Tween

var _player: Node2D
var _last_hint_x: float = -9999
var _shown: Dictionary = {}

func _ready():
	if canvas == null:
		_create_fallback_ui()
	panel.visible = false
	hint_label.visible = true
	hint_label.text = "Explora hacia la DERECHA → Sigue los carteles"
	_show_hint_temporarily("¡Bienvenido a Echoes of the Void! Ve a la derecha.", 3.0)
	await get_tree().process_frame
	_player = get_tree().get_first_node_in_group("player")

func _process(_delta):
	if _player == null:
		_player = get_tree().get_first_node_in_group("player")
		return
	var x = _player.global_position.x
	# Zonas por posición X (tutorial progresivo)
	if x > 120 and x < 400 and not _shown.has("Move"):
		_shown["Move"] = true
		_on_zone_entered("Move")
	elif x > 500 and x < 800 and not _shown.has("Dash"):
		_shown["Dash"] = true
		_on_zone_entered("Dash")
	elif x > 800 and x < 1050 and not _shown.has("Resonance"):
		_shown["Resonance"] = true
		_on_zone_entered("Resonance")
	elif x > 1050 and x < 1350 and not _shown.has("Combat"):
		_shown["Combat"] = true
		_on_zone_entered("Combat")
	elif x > 1350 and x < 1650 and not _shown.has("Enemy"):
		_shown["Enemy"] = true
		_on_zone_entered("Enemy")
	elif x > 1650 and x < 2100 and not _shown.has("Weapons"):
		_shown["Weapons"] = true
		_on_zone_entered("Weapons")
	elif x > 1750 and x < 2100 and not _shown.has("Energy"):
		# Delay para no pisar Weapons
		await get_tree().create_timer(2.5).timeout
		if not _shown.has("Energy"):
			_shown["Energy"] = true
			_on_zone_entered("Energy")
	elif x > 2250 and not _shown.has("Boss"):
		_shown["Boss"] = true
		_on_zone_entered("Boss")

func _create_fallback_ui():
	canvas = CanvasLayer.new()
	add_child(canvas)
	panel = Panel.new()
	panel.size = Vector2(720, 110)
	panel.position = Vector2(600, 40)
	canvas.add_child(panel)
	title_label = Label.new()
	title_label.position = Vector2(16, 10)
	title_label.add_theme_font_size_override("font_size", 20)
	panel.add_child(title_label)
	desc_label = Label.new()
	desc_label.position = Vector2(16, 38)
	desc_label.size = Vector2(688, 60)
	desc_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	desc_label.add_theme_font_size_override("font_size", 14)
	panel.add_child(desc_label)
	hint_label = Label.new()
	hint_label.position = Vector2(20, 1030)
	hint_label.add_theme_font_size_override("font_size", 14)
	canvas.add_child(hint_label)

func show_tutorial(title: String, desc: String, duration: float = 0.0):
	if _current_zone == title: return
	_current_zone = title
	if _tween: _tween.kill()
	panel.visible = true
	panel.modulate = Color(1,1,1,0)
	title_label.text = title
	desc_label.text = desc
	_tween = create_tween()
	_tween.tween_property(panel, "modulate", Color(1,1,1,1), 0.25)
	if duration > 0:
		await get_tree().create_timer(duration).timeout
		hide_tutorial()

func hide_tutorial():
	if _tween: _tween.kill()
	_tween = create_tween()
	_tween.tween_property(panel, "modulate", Color(1,1,1,0), 0.25)
	_tween.tween_callback(func(): panel.visible = false)

func _show_hint_temporarily(text: String, dur: float):
	hint_label.text = text
	hint_label.modulate = Color(1,1,1,1)
	await get_tree().create_timer(dur).timeout
	var t = create_tween()
	t.tween_property(hint_label, "modulate", Color(1,1,1,0), 0.5)

# Conectado desde los Area2D del tutorial
func _on_zone_entered(zone_name: String):
	match zone_name:
		"Move":
			show_tutorial("01 · MOVIMIENTO", "A/D: moverte | W/ESPACIO: saltar (pulsa de nuevo al caer para Coyote Time 0.15s) | Mantén para salto corto.", 5.0)
		"Dash":
			show_tutorial("02 · DASH RÍTMICO", "SHIFT: dash. ¡SOLO eres invulnerable si lo haces al BEAT! Al ritmo: +HP y recarga. Fuera de ritmo: vulnerable. Mira el pulso arriba-derecha.", 6.0)
		"Resonance":
			show_tutorial("03 · RESONANCIA (CORAZÓN DEL JUEGO)", "Todo va al BPM (95-135). Cuadro pulsa + beep. ATACA/DASH al pulso = PERFECT (oro, x1.5 dmg) / GOOD (blanco, x1.2). Fuera = MISS (gris, x0.6).", 7.0)
		"Combat":
			show_tutorial("04 · COMBATE", "J: atacar | Cada arma tiene 3-hit combo. Si mantienes el ritmo, el 3er golpe hace x1.5. PERFECT stunea enemigos. Prueba con los Slimes.", 6.0)
		"Weapons":
			show_tutorial("05 · LOADOUT ESTRATÉGICO", "Q: cambiar arma | PulseBlade (azul) vs Resonator | VoidWave (morado) vs BassTitan | EchoShot (dorado) vs ChoirWarden. Usa la correcta.", 6.0)
		"Energy":
			show_tutorial("06 · ENERGÍA Y ESPECIAL", "Barra verde = energía. PERFECT/GOOD la recarga. MISS la gasta. E/K: ESPECIAL consume 25-35 energía. Úsalo en fase 2 del boss.", 6.0)
		"Enemy":
			show_tutorial("07 · ENEMIGOS MENORES", "Slimes patrullan y saltan cada 2 beats. Atácalos al pulso para matarlos rápido y recuperar energía. Dash perfecto = parry.", 5.0)
		"Boss":
			show_tutorial("08 · BOSS RUSH", "El Resonator cambia de fase al 50% HP y acelera el BPM. Verás telegrafía amarilla 0.3s antes de disparar. ¡Ataca al ritmo y cambia de arma!", 7.0)

func _on_zone_exited(_zone_name: String):
	# No ocultar inmediatamente, deja que expire
	pass
