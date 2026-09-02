# scripts/PlayerKairo.gd
# KAIRO - Entidad de Frecuencias Sonoras (MEJORADO v2)
# Movimiento HK + Combate rítmico con combo 3-hit, hitbox real y especiales
extends CharacterBody2D

@export_group("Movimiento - Hollow Knight")
@export var max_speed: float = 300.0
@export var acceleration: float = 2200.0
@export var friction: float = 2400.0
@export var air_acceleration: float = 1400.0
@export var air_friction: float = 600.0
@export var gravity: float = 1600.0
@export var jump_force: float = -460.0
@export var fall_gravity_mult: float = 1.35

@export_group("Game Feel")
@export var coyote_time: float = 0.15
@export var jump_buffer: float = 0.12
@export var dash_speed: float = 680.0
@export var dash_duration: float = 0.17
@export var dash_cooldown: float = 0.45
@export var hit_stop_duration: float = 0.06

@export_group("Combate")
@export var combo_window: float = 0.9
@export var hitbox_duration: float = 0.14

@export_group("Vida")
@export var max_hp: int = 100
var hp: int

# --- Estado interno ---
var _coyote_timer: float = 0.0
var _buffer_timer: float = 0.0
var _is_dashing: bool = false
var _dash_timer: float = 0.0
var _dash_cooldown_timer: float = 0.0
var is_invulnerable: bool = false
var _facing: float = 1.0

# Combate
var _combo_idx: int = 0
var _combo_timer: float = 0.0
var _attack_cooldown: float = 0.0
var _is_attacking: bool = false

# Referencias
var resonance: Node
var weapon_system: Node
@onready var sprite: ColorRect = $Sprite
@onready var camera: Camera2D = $Camera2D
@onready var dash_particles: GPUParticles2D = $DashParticles
@onready var hp_label: Label = $HUD/HpLabel
@onready var weapon_label: Label = $HUD/WeaponLabel
@onready var energy_bar: ProgressBar = $HUD/EnergyBar
@onready var combo_label: Label = $HUD/ComboLabel
@onready var attack_area: Area2D = $AttackArea
@onready var attack_shape: CollisionShape2D = $AttackArea/CollisionShape2D

func _ready():
	hp = max_hp
	if has_node("/root/ResonanceManager"):
		resonance = get_node("/root/ResonanceManager")
	elif has_node("../ResonanceManager"):
		resonance = get_node("../ResonanceManager")
	else:
		push_warning("[KAIRO] ResonanceManager no encontrado")

	weapon_system = $WeaponSystem
	if weapon_system.has_signal("energy_changed"):
		weapon_system.connect("energy_changed", _on_energy_changed)
	if weapon_system.has_signal("weapon_changed"):
		weapon_system.connect("weapon_changed", _on_weapon_changed)

	# Setup hitbox si existe
	if attack_area:
		attack_area.monitoring = false
		attack_area.monitorable = false
		if attack_shape: attack_shape.disabled = true
		# Conectar señal para detectar hits
		if not attack_area.is_connected("body_entered", _on_hitbox_body):
			attack_area.connect("body_entered", _on_hitbox_body)
		if not attack_area.is_connected("area_entered", _on_hitbox_area):
			attack_area.connect("area_entered", _on_hitbox_area)

	_update_hud()
	_update_weapon_hitbox()
	print("[KAIRO] v2 listo | HP: ", hp, " | Combo 3-hit + Hitbox real")

func _physics_process(delta):
	var input_dir = Input.get_axis("move_left", "move_right")
	if input_dir != 0:
		_facing = sign(input_dir)
		if sprite: sprite.scale.x = _facing * abs(sprite.scale.x)
		if attack_area: attack_area.scale.x = _facing

	# Timers
	if is_on_floor():
		_coyote_timer = coyote_time
	else:
		_coyote_timer -= delta
		var g = gravity * (fall_gravity_mult if velocity.y > 0 else 1.0)
		velocity.y += g * delta

	if Input.is_action_just_pressed("jump"):
		_buffer_timer = jump_buffer
	else:
		_buffer_timer -= delta

	_dash_cooldown_timer -= delta
	_attack_cooldown -= delta
	_combo_timer -= delta
	if _combo_timer <= 0 and _combo_idx != 0:
		_combo_idx = 0
		_update_combo_hud()

	if _is_dashing:
		_dash_timer -= delta
		if _dash_timer <= 0:
			_end_dash()

	# Salto Coyote+Buffer
	if _buffer_timer > 0 and _coyote_timer > 0 and not _is_dashing:
		_do_jump()
	if Input.is_action_just_released("jump") and velocity.y < 0:
		velocity.y *= 0.45

	# Movimiento
	if not _is_dashing:
		var accel = acceleration if is_on_floor() else air_acceleration
		var fric = friction if is_on_floor() else air_friction
		if input_dir != 0:
			velocity.x = move_toward(velocity.x, input_dir * max_speed, accel * delta)
		else:
			velocity.x = move_toward(velocity.x, 0, fric * delta)
		if sprite and not _is_attacking:
			if not is_on_floor():
				sprite.color = Color(0.6, 0.8, 1.0)
			elif abs(velocity.x) > 10:
				sprite.color = Color(0.2, 0.9, 0.6)
			else:
				sprite.color = Color(0.9, 0.9, 1.0)

	# Dash
	if Input.is_action_just_pressed("dash") and _dash_cooldown_timer <= 0 and not _is_dashing:
		_start_dash(input_dir)

	# Ataques
	if Input.is_action_just_pressed("attack") and _attack_cooldown <= 0:
		_try_attack()
	if Input.is_action_just_pressed("special"):
		_try_special()

	move_and_slide()
	if position.y > 3000:
		take_damage(999)

# --- MOVIMIENTO ---
func _do_jump():
	velocity.y = jump_force
	_buffer_timer = 0
	_coyote_timer = 0
	_screen_shake(2.0)
	if sprite:
		var t = create_tween()
		t.tween_property(sprite, "scale", Vector2(1.2, 0.8), 0.08)
		t.tween_property(sprite, "scale", Vector2(1, 1), 0.12)

func _start_dash(input_dir: float):
	if resonance == null: return
	var timing = resonance.evaluate_timing()
	_is_dashing = true
	_dash_timer = dash_duration
	_dash_cooldown_timer = dash_cooldown
	var dash_dir = input_dir if input_dir != 0 else _facing
	velocity.x = dash_dir * dash_speed
	velocity.y = 0
	if timing.result == "PERFECT":
		is_invulnerable = true
		heal(8)
		weapon_system.recharge(15)
		_screen_shake(7.0)
		_hit_stop(0.08)
		_spawn_dash_effect(Color.CYAN)
		print("[KAIRO] DASH PERFECT! +8 HP + i-frames")
	elif timing.result == "GOOD":
		is_invulnerable = true
		heal(4)
		weapon_system.recharge(8)
		_screen_shake(5.0)
		_hit_stop(0.04)
		_spawn_dash_effect(Color.AQUAMARINE)
		print("[KAIRO] DASH GOOD! +4 HP")
	else:
		is_invulnerable = false
		_screen_shake(2.0)
		_spawn_dash_effect(Color(1, 0.3, 0.3, 0.5))
		print("[KAIRO] DASH MISS - vulnerable")
	if dash_particles:
		dash_particles.emitting = true
		dash_particles.process_material.direction = Vector3(-dash_dir, 0, 0)

func _end_dash():
	_is_dashing = false
	is_invulnerable = false
	velocity.x *= 0.55
	if dash_particles: dash_particles.emitting = false

# --- COMBATE MEJORADO ---
func _try_attack():
	if resonance == null: return
	var timing = resonance.evaluate_timing()
	var stats = weapon_system.get_stats()
	# Cooldown por arma
	_attack_cooldown = stats["cooldown"]
	# Penalizar si es MISS
	if timing.result == "MISS":
		_attack_cooldown *= 1.35

	# Combo: solo avanza si fue PERFECT/GOOD, si es MISS resetea
	if timing.result == "MISS":
		_combo_idx = 0
	else:
		_combo_idx = (_combo_idx % 3) + 1
	_combo_timer = combo_window

	var combo_mult = 1.0
	if _combo_idx == 3:
		combo_mult = 1.6 # tercer golpe potenciado
		_screen_shake(10.0)
	elif _combo_idx == 2:
		combo_mult = 1.15

	# Decidir tipo de objetivo cercano para efectividad
	var target_type = _get_nearest_enemy_type()
	var result = weapon_system.try_attack(timing, target_type, combo_mult)

	_is_attacking = true
	_update_combo_hud()
	_update_weapon_hitbox()

	# Feedback visual por timing + arma
	var col: Color = stats["color"]
	match timing.result:
		"PERFECT":
			_screen_shake(6.0 + _combo_idx * 1.5)
			_hit_stop(hit_stop_duration + 0.02 * _combo_idx)
			_spawn_attack_effect(col, timing.result, _combo_idx)
		"GOOD":
			_screen_shake(4.0)
			_hit_stop(0.03)
			_spawn_attack_effect(col.lightened(0.3), timing.result, _combo_idx)
		"MISS":
			_screen_shake(1.5)
			_spawn_attack_effect(Color(0.5,0.5,0.5), timing.result, _combo_idx)
			_combo_idx = 0

	# Activar hitbox real por arma
	_activate_hitbox(stats, result.damage, timing.result)

	# Si es arma a distancia (VoidWave/EchoShot), spawnear proyectil
	if weapon_system.current_weapon == "VoidWave":
		_spawn_wave_projectile(result.damage, timing.result)
	elif weapon_system.current_weapon == "EchoShot":
		_spawn_echo_burst(result.damage, timing.result)

	# Si es combo 3 y perfect, stunea brevemente
	if _combo_idx == 3 and timing.result == "PERFECT":
		weapon_system.recharge(10)
		print("[KAIRO] COMBO x3 PERFECT! Finisher!")

	await get_tree().create_timer(hitbox_duration).timeout
	_is_attacking = false

func _try_special():
	if resonance == null or weapon_system == null: return
	var timing = resonance.evaluate_timing()
	var res = weapon_system.try_special(timing)
	if not res.ok:
		_screen_shake(1.0)
		_spawn_attack_effect(Color(1,0.3,0.3), "MISS", 0)
		return

	# Especial por arma
	match weapon_system.current_weapon:
		"PulseBlade":
			# Giro 360 alrededor
			_spawn_spin_attack(res.damage, timing.result)
		"VoidWave":
			# Onda expansiva grande
			_spawn_big_wave(res.damage)
		"EchoShot":
			# Ráfaga triple mejorada
			for i in 3:
				_spawn_echo_burst(res.damage, timing.result, 0.08 * i)

	_screen_shake(12.0)
	_hit_stop(0.12)
	_spawn_attack_effect(Color.GOLD, "PERFECT", 3)

func _activate_hitbox(stats: Dictionary, damage: int, timing_result: String):
	if attack_area == null or attack_shape == null:
		# Fallback por distancia (compatibilidad)
		_try_hit_boss_fallback(damage, timing_result)
		return
	# Ajustar tamaño según arma y combo
	var base_size: Vector2 = stats["hitbox_size"]
	if _combo_idx == 3:
		base_size *= 1.35
	elif _combo_idx == 2:
		base_size *= 1.15
	var shape = attack_shape.shape
	if shape is RectangleShape2D:
		shape.size = base_size
	# Offset al frente
	attack_shape.position = Vector2(base_size.x * 0.35, -6)

	# Activar
	attack_area.monitoring = true
	attack_shape.disabled = false
	# Guardar daño para callbacks
	attack_area.set_meta("dmg", damage)
	attack_area.set_meta("weapon", weapon_system.current_weapon)
	attack_area.set_meta("timing", timing_result)

	await get_tree().create_timer(hitbox_duration).timeout
	attack_area.monitoring = false
	attack_shape.disabled = true

func _on_hitbox_body(body: Node):
	if not attack_area.monitoring: return
	if body == self: return
	if not (body.is_in_group("enemies") or body.is_in_group("boss")): return
	if body.has_method("take_damage"):
		var dmg = attack_area.get_meta("dmg", 20)
		var wp = attack_area.get_meta("weapon", "")
		# Solo golpear una vez por activación
		attack_area.monitoring = false
		# Pequeño cooldown para no multi-hit
		body.take_damage(dmg, wp)

func _on_hitbox_area(area: Node):
	var parent = area.get_parent()
	if parent and (parent.is_in_group("enemies") or parent.is_in_group("boss")):
		_on_hitbox_body(parent)

func _spawn_wave_projectile(damage: int, timing: String):
	var proj = Area2D.new()
	proj.add_to_group("player_projectile")
	var col = ColorRect.new()
	col.size = Vector2(18, 10)
	col.color = weapon_system.get_stats()["color"]
	proj.add_child(col)
	var shape = CollisionShape2D.new()
	var rect = RectangleShape2D.new()
	rect.size = Vector2(18, 10)
	shape.shape = rect
	proj.add_child(shape)
	get_tree().current_scene.add_child(proj)
	proj.global_position = global_position + Vector2(28 * _facing, -8)
	proj.monitoring = true
	# Movimiento
	var tween = proj.create_tween()
	var target = proj.global_position + Vector2(weapon_system.get_stats()["range"] * _facing, 0)
	tween.tween_property(proj, "global_position", target, 0.45)
	tween.tween_callback(proj.queue_free)
	# Daño al tocar
	shape.get_parent().connect("body_entered", func(b):
		if b.is_in_group("enemies") or b.is_in_group("boss"):
			if b.has_method("take_damage"):
				b.take_damage(damage, weapon_system.current_weapon)
				proj.queue_free()
	)

func _spawn_echo_burst(damage: int, timing: String, delay: float = 0.0):
	await get_tree().create_timer(delay).timeout
	for i in 3:
		var proj = Area2D.new()
		var col = ColorRect.new()
		col.size = Vector2(14, 6)
		col.color = Color(1,0.9,0.3)
		proj.add_child(col)
		var shape = CollisionShape2D.new()
		var r = RectangleShape2D.new()
		r.size = Vector2(14,6)
		shape.shape = r
		proj.add_child(shape)
		get_tree().current_scene.add_child(proj)
		proj.global_position = global_position + Vector2(26 * _facing, -6 + (i-1)*8)
		var tween = proj.create_tween()
		tween.tween_property(proj, "global_position", proj.global_position + Vector2(560 * _facing, (i-1)*18), 0.38)
		tween.tween_callback(proj.queue_free)
		shape.get_parent().connect("body_entered", func(b):
			if b.has_method("take_damage") and (b.is_in_group("boss") or b.is_in_group("enemies")):
				b.take_damage(int(damage*0.6), weapon_system.current_weapon)
		)
		await get_tree().create_timer(0.05).timeout

func _spawn_spin_attack(damage: int, timing: String):
	# Hitbox grande circular temporal
	var area = Area2D.new()
	area.monitoring = true
	var shape = CollisionShape2D.new()
	var circle = CircleShape2D.new()
	circle.radius = 78
	shape.shape = circle
	area.add_child(shape)
	var visual = ColorRect.new()
	visual.size = Vector2(156,156)
	visual.position = Vector2(-78,-78)
	visual.color = Color(0.2,0.9,1,0.5)
	area.add_child(visual)
	add_child(area)
	area.global_position = global_position
	area.connect("body_entered", func(b):
		if b.has_method("take_damage") and (b.is_in_group("boss") or b.is_in_group("enemies")):
			b.take_damage(damage, weapon_system.current_weapon)
	)
	var t = create_tween()
	t.tween_property(visual, "rotation", TAU, 0.28)
	t.parallel().tween_property(visual, "color", Color(0.2,0.9,1,0), 0.28)
	t.tween_callback(area.queue_free)

func _spawn_big_wave(damage: int):
	var wave = ColorRect.new()
	wave.size = Vector2(20, 20)
	wave.color = Color(0.7,0.3,1,0.6)
	wave.position = global_position + Vector2(-10,-10)
	get_tree().current_scene.add_child(wave)
	wave.global_position = global_position
	var t = create_tween()
	t.tween_property(wave, "size", Vector2(240,240), 0.45)
	t.parallel().tween_property(wave, "position", wave.position - Vector2(110,110), 0.45)
	t.parallel().tween_property(wave, "color", Color(0.7,0.3,1,0), 0.45)
	t.tween_callback(wave.queue_free)
	# Daño en área
	for b in get_tree().get_nodes_in_group("enemies") + get_tree().get_nodes_in_group("boss"):
		if b.global_position.distance_to(global_position) < 120:
			if b.has_method("take_damage"):
				b.take_damage(damage, weapon_system.current_weapon)

func _get_nearest_enemy_type() -> String:
	var nearest_type = "Resonator"
	var best_dist = 9999.0
	for b in get_tree().get_nodes_in_group("enemies") + get_tree().get_nodes_in_group("boss"):
		var d = global_position.distance_to(b.global_position)
		if d < best_dist and d < 400:
			best_dist = d
			if "boss_type" in b:
				nearest_type = b.boss_type
			elif "enemy_name" in b:
				nearest_type = "Slime"
	return nearest_type

func _try_hit_boss_fallback(damage: int, timing: String):
	for boss in get_tree().get_nodes_in_group("boss"):
		if boss.has_method("take_damage") and global_position.distance_to(boss.global_position) < 220:
			boss.take_damage(damage, weapon_system.current_weapon)

# --- VIDA Y FEEDBACK ---
func heal(amount: int):
	hp = min(max_hp, hp + amount)
	_update_hud()
	var t = create_tween()
	if sprite:
		t.tween_property(sprite, "modulate", Color(0.5, 1, 0.5), 0.1)
		t.tween_property(sprite, "modulate", Color.WHITE, 0.15)

func take_damage(amount: int):
	if is_invulnerable or (_is_dashing and is_invulnerable):
		print("[KAIRO] Daño bloqueado por i-frames")
		return
	hp -= amount
	hp = max(0, hp)
	_update_hud()
	_screen_shake(10.0)
	_hit_stop(0.1)
	print("[KAIRO] HP: ", hp, "/", max_hp)
	if hp <= 0:
		_die()
	else:
		if sprite:
			var t = create_tween()
			t.tween_property(sprite, "modulate", Color(1, 0.3, 0.3), 0.08)
			t.tween_property(sprite, "modulate", Color.WHITE, 0.15)

func _die():
	print("[KAIRO] MUERTE")
	velocity = Vector2.ZERO
	set_physics_process(false)
	if sprite: sprite.color = Color(0.3, 0.3, 0.3)
	await get_tree().create_timer(1.0).timeout
	get_tree().reload_current_scene()

func _screen_shake(intensity: float):
	if camera == null: return
	var tween = create_tween()
	tween.tween_property(camera, "offset", Vector2(randf_range(-intensity, intensity), randf_range(-intensity, intensity)), 0.04)
	tween.tween_property(camera, "offset", Vector2.ZERO, 0.12)

func _hit_stop(duration: float):
	Engine.time_scale = 0.15
	await get_tree().create_timer(duration, true, false, true).timeout
	Engine.time_scale = 1.0

func _spawn_dash_effect(col: Color):
	if sprite:
		var tween = create_tween()
		tween.tween_property(sprite, "modulate", col, 0.05)
		tween.tween_property(sprite, "modulate", Color.WHITE, 0.15)

func _spawn_attack_effect(col: Color, timing: String, combo: int):
	var rect = ColorRect.new()
	var w = 50 + combo * 14
	var h = 30 + combo * 6
	rect.size = Vector2(w, h)
	rect.color = col
	rect.position = Vector2(20 * _facing, -10 - combo*2)
	# Texto timing
	var lbl = Label.new()
	lbl.text = timing + (" x%d" % combo if combo>1 else "")
	lbl.add_theme_font_size_override("font_size", 10)
	lbl.position = Vector2(2,2)
	rect.add_child(lbl)
	add_child(rect)
	var t = create_tween()
	t.tween_property(rect, "position", rect.position + Vector2(12*_facing, -12), 0.12)
	t.parallel().tween_property(rect, "color", Color(col.r, col.g, col.b, 0), 0.18)
	t.tween_callback(rect.queue_free)

func _update_hud():
	if hp_label: hp_label.text = "HP: %d / %d" % [hp, max_hp]
	if energy_bar: energy_bar.value = weapon_system.energy if weapon_system else 100
	if weapon_label and weapon_system:
		weapon_label.text = "%s" % weapon_system.current_weapon

func _update_combo_hud():
	if combo_label:
		if _combo_idx > 0:
			combo_label.text = "COMBO x%d" % _combo_idx
			combo_label.modulate = Color.GOLD if _combo_idx==3 else Color.WHITE
		else:
			combo_label.text = ""

func _update_weapon_hitbox():
	if weapon_system and attack_shape and attack_shape.shape is RectangleShape2D:
		var stats = weapon_system.get_stats()
		attack_shape.shape.size = stats["hitbox_size"]

func _on_energy_changed(v: float):
	if energy_bar: energy_bar.value = v

func _on_weapon_changed(w: String, stats: Dictionary):
	if weapon_label: weapon_label.text = "%s" % w
	_update_weapon_hitbox()
	_update_hud()
	# Flash color del arma
	if sprite:
		var t = create_tween()
		t.tween_property(sprite, "color", stats["color"], 0.12)
		t.tween_property(sprite, "color", Color.WHITE, 0.18)
