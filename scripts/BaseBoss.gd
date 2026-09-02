# scripts/BaseBoss.gd
# BOSS FSM MEJORADO - Echoes of the Void v2
# Múltiples patrones rítmicos con telegrafía, fases dinámicas y defensas por arma
extends CharacterBody2D

enum State { IDLE, TELEGRAPH, ATTACK, STUNNED, TRANSITION, DEAD }
enum Pattern { SINGLE, DOUBLE, WAVE, PULSE }

@export var boss_name: String = "Resonator"
@export var boss_type: String = "Resonator"
@export var max_hp: int = 500
@export var bpm_phase_1: float = 95.0
@export var bpm_phase_2: float = 135.0
@export var phase_2_threshold: float = 0.5
@export var contact_damage: int = 18

var hp: int
var state: State = State.IDLE
var _state_timer: float = 0.0
var _attack_cooldown: float = 1.1
var _next_pattern: Pattern = Pattern.SINGLE
var is_stunned: bool = false
var _in_phase2: bool = false

var resonance: Node
@onready var sprite: ColorRect = $Sprite
@onready var hp_bar: ProgressBar = $HpBar
@onready var label: Label = $Label

func _ready():
	hp = max_hp
	add_to_group("boss")
	if has_node("/root/ResonanceManager"):
		resonance = get_node("/root/ResonanceManager")
		if resonance.has_signal("beat_pulse"):
			resonance.connect("beat_pulse", _on_beat)
	if hp_bar:
		hp_bar.max_value = max_hp
		hp_bar.value = hp
	if label:
		label.text = boss_name
	_update_bpm_for_phase()
	print("[Boss] %s listo | HP %d | BPM %.0f | Patrones: SINGLE/DOUBLE/WAVE/PULSE" % [boss_name, hp, bpm_phase_1])

func _physics_process(delta):
	_state_timer += delta
	_attack_cooldown -= delta

	match state:
		State.IDLE:
			if _attack_cooldown <= 0 and _state_timer > 0.5:
				_choose_pattern()
				_change_state(State.TELEGRAPH)
		State.TELEGRAPH:
			if _state_timer > 0.35: # ventana de telegrafía
				_execute_pattern(_next_pattern)
				_change_state(State.ATTACK)
		State.ATTACK:
			if _state_timer > 0.4:
				_change_state(State.IDLE)
				_attack_cooldown = 0.85 if _in_phase2 else 1.15
		State.STUNNED:
			if _state_timer > 1.4:
				_change_state(State.IDLE)
		State.TRANSITION:
			if _state_timer > 2.2:
				_change_state(State.IDLE)
		State.DEAD:
			return

	# Gravedad
	if not is_on_floor():
		velocity.y += 900 * delta
	else:
		velocity.y = 0
	move_and_slide()

	# Daño por contacto
	var player = get_tree().get_first_node_in_group("player")
	if player and player.has_method("take_damage"):
		if global_position.distance_to(player.global_position) < 42 and _attack_cooldown < 0.2:
			if state != State.STUNNED and state != State.DEAD:
				player.take_damage(contact_damage)
				_attack_cooldown = 0.9

func _on_beat(beat_count: int):
	if state == State.DEAD: return
	# Pulso visual al ritmo + vibración leve en fase 2
	if beat_count % 2 == 0 and sprite:
		var t = create_tween()
		var s = 1.1 if _in_phase2 else 1.06
		t.tween_property(sprite, "scale", Vector2(s, s), 0.07)
		t.tween_property(sprite, "scale", Vector2.ONE, 0.13)
	# En fase 2, cada 4 beats hace un pulso extra
	if _in_phase2 and beat_count % 4 == 0 and state == State.IDLE:
		_attack_cooldown -= 0.15

func _choose_pattern():
	# Elige patrón según fase, distancia y arma del jugador
	var player = get_tree().get_first_node_in_group("player")
	var dist = 9999.0
	if player: dist = global_position.distance_to(player.global_position)
	var r = randf()

	if not _in_phase2:
		# Fase 1: simple, enseña telegrafía
		if dist < 110:
			_next_pattern = Pattern.WAVE
		elif r < 0.7:
			_next_pattern = Pattern.SINGLE
		else:
			_next_pattern = Pattern.DOUBLE
	else:
		# Fase 2: más agresiva y variada
		if r < 0.3:
			_next_pattern = Pattern.SINGLE
		elif r < 0.55:
			_next_pattern = Pattern.DOUBLE
		elif r < 0.8:
			_next_pattern = Pattern.WAVE
		else:
			_next_pattern = Pattern.PULSE

func _execute_pattern(p: Pattern):
	match p:
		Pattern.SINGLE:
			_telegraph_line(Color.YELLOW, 0.3)
			await get_tree().create_timer(0.32).timeout
			_spawn_projectile(1)
		Pattern.DOUBLE:
			_telegraph_line(Color.ORANGE, 0.3)
			await get_tree().create_timer(0.32).timeout
			_spawn_projectile(2)
		Pattern.WAVE:
			_telegraph_ground(Color(1,0.3,0.5,0.6))
			await get_tree().create_timer(0.33).timeout
			_spawn_wave()
		Pattern.PULSE:
			_telegraph_circle(Color(1,0.8,0.2,0.5))
			await get_tree().create_timer(0.34).timeout
			_spawn_pulse()

	print("[Boss] %s ejecuta %s | Fase %s" % [boss_name, Pattern.keys()[p], "2" if _in_phase2 else "1"])

func _telegraph_line(col: Color, dur: float):
	var line = ColorRect.new()
	line.size = Vector2(900, 4)
	line.color = col
	line.position = Vector2(-900, 6)
	add_child(line)
	var t = create_tween()
	t.tween_property(line, "color", Color(col.r, col.g, col.b, 0.15), dur)
	t.tween_callback(line.queue_free)

func _telegraph_ground(col: Color):
	var rect = ColorRect.new()
	rect.size = Vector2(520, 18)
	rect.color = col
	rect.position = Vector2(-520, 34)
	add_child(rect)
	var t = create_tween()
	t.tween_property(rect, "color", Color(col.r,col.g,col.b,0), 0.32)
	t.tween_callback(rect.queue_free)
	# Sonido warning
	if resonance:
		pass

func _telegraph_circle(col: Color):
	var circ = ColorRect.new()
	circ.size = Vector2(36,36)
	circ.position = Vector2(-18,-18)
	circ.color = col
	add_child(circ)
	var t = create_tween()
	t.tween_property(circ, "scale", Vector2(6,6), 0.32)
	t.parallel().tween_property(circ, "color", Color(col.r,col.g,col.b,0), 0.32)
	t.parallel().tween_property(circ, "position", Vector2(-108,-108), 0.32)
	t.tween_callback(circ.queue_free)

func _spawn_projectile(count: int):
	var base_spawn = global_position + Vector2(-30, 8)
	for i in count:
		var proj = Area2D.new()
		proj.add_to_group("enemy_projectile")
		proj.monitoring = true
		proj.monitorable = true
		proj.collision_layer = 4
		proj.collision_mask = 1
		var col = ColorRect.new()
		col.size = Vector2(18, 18)
		col.color = Color(1, 0.2, 0.4) if not _in_phase2 else Color(1, 0.8, 0.2)
		proj.add_child(col)
		var col_shape = CollisionShape2D.new()
		var rect = RectangleShape2D.new()
		rect.size = Vector2(18,18)
		col_shape.shape = rect
		proj.add_child(col_shape)
		var y_offset = 0.0
		if count > 1:
			y_offset = -11 if i==0 else 11
		var spawn_pos = base_spawn + Vector2(0, y_offset)
		get_tree().current_scene.add_child(proj)
		proj.global_position = spawn_pos

		var player = get_tree().get_first_node_in_group("player")
		var dir = Vector2.LEFT
		if player:
			var to_player = player.global_position - spawn_pos
			dir = to_player.normalized()
			dir.y = clamp(dir.y, -0.22, 0.22)
			dir = dir.normalized()
			if spawn_pos.distance_to(player.global_position) < 70:
				dir = Vector2(-sign(spawn_pos.x - player.global_position.x), -0.05).normalized()
		else:
			dir = Vector2.LEFT
		proj.set_meta("dir", dir)

		# Colisión con jugador - con reflect si tiene skill
		proj.connect("body_entered", func(b):
			if b.is_in_group("player") and b.has_method("take_damage"):
				if "is_invulnerable" in b and b.is_invulnerable:
					# Reflect si tiene skill
					var gm = get_node_or_null("/root/GameManager")
					var can_reflect = gm and gm.has_skill("parry_reflect")
					if can_reflect:
						print("[Boss] Proyectil REFLEJADO!")
						proj.remove_from_group("enemy_projectile")
						proj.add_to_group("player_projectile")
						col.color = Color.CYAN
						proj.set_meta("reflected", true)
						# Nuevo tween inverso hacia boss
						var t2 = proj.create_tween()
						t2.tween_property(proj, "global_position", proj.global_position + Vector2(900, -40) * -dir.x, 0.7)
						t2.tween_callback(func():
							# Si toca boss, daño
							for boss in get_tree().get_nodes_in_group("boss"):
								if proj.global_position.distance_to(boss.global_position) < 60 and boss.has_method("take_damage"):
									boss.take_damage(35, "Reflected")
							proj.queue_free()
						)
						if b.has_method("heal"):
							b.heal(4)
						return
					else:
						print("[Boss] Proyectil parryeado (sin reflect)!")
						proj.queue_free()
						if b.has_method("heal"):
							b.heal(3)
						return
				b.take_damage(16 if not _in_phase2 else 20)
				proj.queue_free()
			# Si es reflejado y toca boss
			if b.is_in_group("boss") and proj.has_meta("reflected"):
				if b.has_method("take_damage"):
					b.take_damage(38, "Reflected")
					proj.queue_free()
		)

		var target = proj.global_position + dir * 950
		var tween = proj.create_tween()
		tween.set_trans(Tween.TRANS_LINEAR)
		tween.tween_property(proj, "global_position", target, 1.25)
		tween.tween_callback(proj.queue_free)

func _spawn_wave():
	# Onda terrestre que avanza por el suelo
	var wave = Area2D.new()
	wave.monitoring = true
	var col = ColorRect.new()
	col.size = Vector2(32, 22)
	col.color = Color(1, 0.3, 0.5, 0.85)
	wave.add_child(col)
	var shape = CollisionShape2D.new()
	var rect = RectangleShape2D.new()
	rect.size = Vector2(32,22)
	shape.shape = rect
	wave.add_child(shape)
	get_tree().current_scene.add_child(wave)
	wave.global_position = global_position + Vector2(-10, 32)
	wave.connect("body_entered", func(b):
		if b.is_in_group("player") and b.has_method("take_damage"):
			if "is_invulnerable" in b and b.is_invulnerable:
				return
			b.take_damage(22)
			# No destruir, la onda sigue
	)

	var tween = wave.create_tween()
	tween.tween_property(wave, "global_position", wave.global_position + Vector2(-700, 0), 1.0)
	tween.tween_callback(wave.queue_free)
	# Salto del boss para efecto
	velocity.y = -260

func _spawn_pulse():
	# Pulso expansivo circular que empuja
	var pulse = Area2D.new()
	pulse.monitoring = true
	var vis = ColorRect.new()
	vis.size = Vector2(40,40)
	vis.position = Vector2(-20,-20)
	vis.color = Color(1,0.85,0.2,0.55)
	pulse.add_child(vis)
	var shape = CollisionShape2D.new()
	var circle = CircleShape2D.new()
	circle.radius = 20
	shape.shape = circle
	pulse.add_child(shape)
	get_tree().current_scene.add_child(pulse)
	pulse.global_position = global_position
	pulse.connect("body_entered", func(b):
		if b.is_in_group("player") and b.has_method("take_damage"):
			b.take_damage(14)
			if b is CharacterBody2D:
				var dir = sign(b.global_position.x - global_position.x)
				if dir==0: dir=1
				b.velocity.x = dir * 380
				b.velocity.y = -220
	)
	var t = create_tween()
	t.tween_property(vis, "scale", Vector2(8,8), 0.55)
	t.parallel().tween_property(vis, "position", Vector2(-160,-160), 0.55)
	t.parallel().tween_property(vis, "color", Color(1,0.85,0.2,0), 0.55)
	t.parallel().tween_property(shape.shape, "radius", 160, 0.55)
	t.tween_callback(pulse.queue_free)
	# En fase 2 el pulso spawnea minions
	if _in_phase2 and randf() < 0.6:
		_spawn_minions(1)

func _spawn_minions(count: int):
	for i in count:
		var slime = CharacterBody2D.new()
		slime.set_script(load("res://scripts/MinorEnemy.gd"))
		slime.position = global_position + Vector2(randf_range(-50,50), -20)
		slime.set("enemy_name", "Spawn")
		slime.set("max_hp", 45)
		get_tree().current_scene.add_child(slime)
		# Delay para que no spawneen dentro del boss
		slime.global_position = global_position + Vector2(-40 - i*30, 0)
		print("[Boss] Spawn slime ", i)

func take_damage(amount: int, weapon_name: String = ""):
	if state == State.DEAD: return
	hp -= amount
	hp = max(0, hp)
	if hp_bar: hp_bar.value = hp
	Engine.time_scale = 0.22
	await get_tree().create_timer(0.05, true, false, true).timeout
	Engine.time_scale = 1.0
	if sprite:
		var t = create_tween()
		t.tween_property(sprite, "color", Color.WHITE, 0.05)
		t.tween_property(sprite, "color", Color(1, 0.3, 0.5) if not _in_phase2 else Color(1,0.7,0.2), 0.1)
	# Stun si daño alto o combo finisher
	if amount >= 32:
		_change_state(State.STUNNED)
		print("[Boss] STUN! (%.d dmg)" % amount)
	# Mostrar número de daño
	_spawn_damage_number(amount, weapon_name)
	_check_phase_transition()
	if hp <= 0:
		_die()
	else:
		print("[Boss] HP %d/%d (-%d %s)" % [hp, max_hp, amount, weapon_name])

func _spawn_damage_number(amount: int, weapon: String):
	var lbl = Label.new()
	lbl.text = "%d" % amount
	lbl.add_theme_font_size_override("font_size", 16)
	lbl.position = Vector2(randf_range(-18,18), -62)
	add_child(lbl)
	var col = Color.WHITE
	if amount >= 32: col = Color.GOLD
	elif "PulseBlade" in weapon: col = Color.CYAN
	lbl.modulate = col
	var t = create_tween()
	t.tween_property(lbl, "position", lbl.position + Vector2(0, -34), 0.6)
	t.parallel().tween_property(lbl, "modulate", Color(col.r,col.g,col.b,0), 0.6)
	t.tween_callback(lbl.queue_free)

func _check_phase_transition():
	var ratio = float(hp) / max_hp
	if ratio < phase_2_threshold and not _in_phase2:
		_in_phase2 = true
		_change_state(State.TRANSITION)
		if resonance:
			resonance.tween_bpm(bpm_phase_2, 1.6)
		if label: label.text = boss_name + " - ENRAGED!"
		if sprite: sprite.color = Color(1, 0.55, 0.15)
		print("[Boss] ¡FASE 2! BPM %.0f -> %.0f" % [bpm_phase_1, bpm_phase_2])
		# Curar un poco y hacer pulso inicial
		await get_tree().create_timer(0.6).timeout
		_spawn_pulse()

func _update_bpm_for_phase():
	if resonance:
		resonance.set_bpm(bpm_phase_1)

func _change_state(new_state: State):
	state = new_state
	_state_timer = 0.0
	if new_state == State.STUNNED:
		is_stunned = true
		if sprite: sprite.color = Color(0.5, 0.5, 1.0)
	else:
		is_stunned = false

func _die():
	state = State.DEAD
	print("[Boss] %s DERROTADO!" % boss_name)
	if label: label.text = "DEFEATED"
	if has_node("/root/GameManager"):
		get_node("/root/GameManager").add_echoes(180)
	if sprite:
		var t = create_tween()
		t.tween_property(sprite, "color", Color(0.2, 0.2, 0.2, 0.4), 0.5)
		t.tween_property(sprite, "scale", Vector2(1.4, 0.2), 0.5)
	await get_tree().create_timer(1.0).timeout
	print("[Boss] Arma desbloqueada: ", boss_type)
	# Desbloquear área siguiente (puerta)
	var door = get_tree().get_first_node_in_group("boss_door")
	if door: door.queue_free()
