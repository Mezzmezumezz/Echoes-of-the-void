# scripts/PlayerKairo.gd
# KAIRO v3 - Entidad de Frecuencias Sonoras
# HK + WallJump + DoubleJump + Sombra Osu + Intensidad + Parry Reflect + Combo GOOD
extends CharacterBody2D

@export_group("Movimiento HK")
@export var max_speed: float = 300.0
@export var acceleration: float = 2200.0
@export var friction: float = 2400.0
@export var air_acceleration: float = 1400.0
@export var air_friction: float = 600.0
@export var gravity: float = 1600.0
@export var jump_force: float = -460.0
@export var fall_gravity_mult: float = 1.35
@export var wall_slide_speed: float = 90.0
@export var wall_jump_force: Vector2 = Vector2(340, -400)

@export_group("Game Feel INTENSO")
@export var coyote_time: float = 0.15
@export var jump_buffer: float = 0.12
@export var dash_speed: float = 680.0
@export var dash_duration: float = 0.17
@export var dash_cooldown: float = 0.45
@export var hit_stop_duration: float = 0.09 # más intenso
@export var shake_intense_mult: float = 1.6

@export_group("Combate")
@export var combo_window: float = 0.95
@export var hitbox_duration: float = 0.14

@export_group("Vida")
@export var max_hp_base: int = 100
var max_hp: int = 100
var hp: int

# Estado interno
var _coyote_timer: float = 0.0
var _buffer_timer: float = 0.0
var _is_dashing: bool = false
var _dash_timer: float = 0.0
var _dash_cooldown_timer: float = 0.0
var is_invulnerable: bool = false
var _facing: float = 1.0
var _has_double_jumped: bool = false
var _is_wall_sliding: bool = false
var _wall_dir: float = 0.0

# Combate
var _combo_idx: int = 0
var _combo_timer: float = 0.0
var _attack_cooldown: float = 0.0
var _is_attacking: bool = false

var resonance: Node
var weapon_system: Node
var game_manager: Node
@onready var sprite: ColorRect = $Sprite
@onready var camera: Camera2D = $Camera2D
@onready var dash_particles: GPUParticles2D = $DashParticles
@onready var hp_label: Label = $HUD/HpLabel
@onready var weapon_label: Label = $HUD/WeaponLabel
@onready var energy_bar: ProgressBar = $HUD/EnergyBar
@onready var combo_label: Label = $HUD/ComboLabel
@onready var echoes_label: Label = $HUD/EchoesLabel
@onready var attack_area: Area2D = $AttackArea
@onready var attack_shape: CollisionShape2D = $AttackArea/CollisionShape2D
@onready var wall_ray_left: RayCast2D = $WallRayLeft
@onready var wall_ray_right: RayCast2D = $WallRayRight

func _ready():
	# Skill checks
	game_manager = get_node_or_null("/root/GameManager")
	if game_manager:
		max_hp = max_hp_base + game_manager.max_hp_bonus
	else:
		max_hp = max_hp_base
	hp = max_hp

	if has_node("/root/ResonanceManager"):
		resonance = get_node("/root/ResonanceManager")
	elif has_node("../ResonanceManager"):
		resonance = get_node("../ResonanceManager")

	weapon_system = $WeaponSystem
	if weapon_system.has_signal("energy_changed"):
		weapon_system.connect("energy_changed", _on_energy_changed)
	if weapon_system.has_signal("weapon_changed"):
		weapon_system.connect("weapon_changed", _on_weapon_changed)
	if game_manager and game_manager.has_signal("echoes_changed"):
		game_manager.connect("echoes_changed", _on_echoes_changed)

	if attack_area:
		attack_area.monitoring = false
		if attack_shape: attack_shape.disabled = true
		if not attack_area.is_connected("body_entered", _on_hitbox_body):
			attack_area.connect("body_entered", _on_hitbox_body)
		if not attack_area.is_connected("area_entered", _on_hitbox_area):
			attack_area.connect("area_entered", _on_hitbox_area)

	# Crear raycasts para wall si no existen
	if wall_ray_left == null:
		wall_ray_left = RayCast2D.new()
		wall_ray_left.name = "WallRayLeft"
		wall_ray_left.target_position = Vector2(-14, 0)
		wall_ray_left.enabled = true
		add_child(wall_ray_left)
	if wall_ray_right == null:
		wall_ray_right = RayCast2D.new()
		wall_ray_right.name = "WallRayRight"
		wall_ray_right.target_position = Vector2(14, 0)
		wall_ray_right.enabled = true
		add_child(wall_ray_right)

	_update_hud()
	_update_weapon_hitbox()
	print("[KAIRO v3] HP:", hp, "/", max_hp, " WallJump:", has_skill("wall_jump"), " Double:", has_skill("double_jump"))

func has_skill(id: String) -> bool:
	if game_manager == null: return false
	return game_manager.has_skill(id)

func _physics_process(delta):
	var input_dir = Input.get_axis("move_left", "move_right")
	if input_dir != 0:
		_facing = sign(input_dir)
		if sprite: sprite.scale.x = _facing * abs(sprite.scale.x)
		if attack_area: attack_area.scale.x = _facing

	# Timers
	if is_on_floor():
		_coyote_timer = coyote_time
		_has_double_jumped = false
		_is_wall_sliding = false
	else:
		_coyote_timer -= delta
		var g = gravity * (fall_gravity_mult if velocity.y > 0 else 1.0)
		# Wall slide reduce gravedad
		if _is_wall_sliding:
			g = min(g, wall_slide_speed * 12)
			velocity.y = min(velocity.y, wall_slide_speed)
		velocity.y += g * delta

	# Wall detection (solo si habilidad desbloqueada)
	if has_skill("wall_jump"):
		_check_wall_slide(input_dir)

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

	# Salto lógico: suelo -> wall -> double
	if _buffer_timer > 0:
		if _coyote_timer > 0 and not _is_dashing:
			_do_jump()
		elif _is_wall_sliding and has_skill("wall_jump"):
			_do_wall_jump()
		elif not is_on_floor() and has_skill("double_jump") and not _has_double_jumped and not _is_wall_sliding:
			_do_double_jump()

	if Input.is_action_just_released("jump") and velocity.y < 0:
		velocity.y *= 0.42

	# Movimiento horizontal
	if not _is_dashing:
		var accel = acceleration if is_on_floor() else air_acceleration
		var fric = friction if is_on_floor() else air_friction
		if _is_wall_sliding:
			velocity.x = 0
		else:
			if input_dir != 0:
				velocity.x = move_toward(velocity.x, input_dir * max_speed, accel * delta)
			else:
				velocity.x = move_toward(velocity.x, 0, fric * delta)
		if sprite and not _is_attacking and not _is_wall_sliding:
			if not is_on_floor():
				sprite.color = Color(0.6, 0.8, 1.0)
			elif abs(velocity.x) > 10:
				sprite.color = Color(0.2, 0.9, 0.6)
			else:
				sprite.color = Color(0.9, 0.9, 1.0)

	if Input.is_action_just_pressed("dash") and _dash_cooldown_timer <= 0 and not _is_dashing:
		_start_dash(input_dir)
	if Input.is_action_just_pressed("attack") and _attack_cooldown <= 0:
		_try_attack()
	if Input.is_action_just_pressed("special"):
		_try_special()

	move_and_slide()
	if position.y > 3200:
		take_damage(999)

func _check_wall_slide(input_dir: float):
	_is_wall_sliding = false
	_wall_dir = 0
	if is_on_floor() or velocity.y < -80:
		return
	var wall_left = wall_ray_left.is_colliding() if wall_ray_left else is_on_wall() and input_dir < 0
	var wall_right = wall_ray_right.is_colliding() if wall_ray_right else is_on_wall() and input_dir > 0
	# También usar is_on_wall() como fallback
	if is_on_wall():
		if input_dir < -0.2 and get_wall_normal().x > 0.5:
			wall_left = true
		if input_dir > 0.2 and get_wall_normal().x < -0.5:
			wall_right = true
	if (wall_left and input_dir < -0.1) or (wall_right and input_dir > 0.1):
		_is_wall_sliding = true
		_wall_dir = -1 if wall_left else 1
		if sprite:
			sprite.color = Color(0.9, 0.6, 0.2)
			sprite.scale.x = -_wall_dir * abs(sprite.scale.x)
			_facing = -_wall_dir

func _do_jump():
	velocity.y = jump_force
	_buffer_timer = 0
	_coyote_timer = 0
	_has_double_jumped = false
	_screen_shake(4.0 * shake_intense_mult)
	if sprite:
		var t = create_tween()
		t.tween_property(sprite, "scale", Vector2(1.25, 0.75), 0.09)
		t.tween_property(sprite, "scale", Vector2(1, 1), 0.14)

func _do_wall_jump():
	velocity.y = wall_jump_force.y
	velocity.x = -_wall_dir * wall_jump_force.x
	_buffer_timer = 0
	_is_wall_sliding = false
	_has_double_jumped = false
	_screen_shake(7.0 * shake_intense_mult)
	_hit_stop(0.06)
	print("[KAIRO] Wall Jump")
	if sprite:
		var t = create_tween()
		t.tween_property(sprite, "scale", Vector2(0.9, 1.2), 0.08)
		t.tween_property(sprite, "scale", Vector2(1,1), 0.12)

func _do_double_jump():
	velocity.y = jump_force * 0.92
	_has_double_jumped = true
	_buffer_timer = 0
	_screen_shake(5.5 * shake_intense_mult)
	_spawn_dash_effect(Color(0.8, 0.6, 1.0))
	print("[KAIRO] Double Jump")
	if sprite:
		var t = create_tween()
		t.tween_property(sprite, "rotation", _facing * 0.5, 0.1)
		t.tween_property(sprite, "rotation", 0, 0.15)

func _start_dash(input_dir: float):
	if resonance == null: return
	var timing = resonance.evaluate_timing()
	_is_dashing = true
	_dash_timer = dash_duration
	_dash_cooldown_timer = dash_cooldown
	var dash_dir = input_dir if input_dir != 0 else _facing
	velocity.x = dash_dir * dash_speed
	velocity.y = 0
	# Intensificado
	if timing.result == "PERFECT":
		is_invulnerable = true
		var heal_amt = 10 if has_skill("dash_heal") else 8
		heal(heal_amt)
		weapon_system.recharge(16)
		_screen_shake(11.0 * shake_intense_mult)
		_hit_stop(0.11)
		_spawn_dash_effect(Color.CYAN)
		print("[KAIRO] DASH PERFECT+")
	elif timing.result == "GOOD":
		is_invulnerable = true
		heal(5)
		weapon_system.recharge(9)
		_screen_shake(8.0 * shake_intense_mult)
		_hit_stop(0.06)
		_spawn_dash_effect(Color.AQUAMARINE)
	else:
		is_invulnerable = false
		_screen_shake(3.5 * shake_intense_mult)
		_spawn_dash_effect(Color(1, 0.3, 0.3, 0.5))
	if dash_particles:
		dash_particles.emitting = true
		dash_particles.process_material.direction = Vector3(-dash_dir, 0, 0)

func _end_dash():
	_is_dashing = false
	is_invulnerable = false
	velocity.x *= 0.55
	if dash_particles: dash_particles.emitting = false

# --- COMBATE v3 con GOOD mantiene pero menos bonus ---
func _try_attack():
	if resonance == null: return
	var timing = resonance.evaluate_timing()
	var stats = weapon_system.get_stats()
	_attack_cooldown = stats["cooldown"]
	if timing.result == "MISS":
		_attack_cooldown *= 1.4

	# Combo: PERFECT avanza normal, GOOD avanza pero con penalización, MISS resetea
	if timing.result == "PERFECT":
		_combo_idx = (_combo_idx % 3) + 1
	elif timing.result == "GOOD":
		# GOOD mantiene pero si tenías combo 2, a veces no sube a 3 si no tienes skill
		if has_skill("combo_master"):
			_combo_idx = (_combo_idx % 3) + 1
		else:
			# 70% chance de avanzar, si no se queda igual
			if _combo_idx < 2 or randf() > 0.35:
				_combo_idx = (_combo_idx % 3) + 1
			else:
				_combo_idx = max(1, _combo_idx)
	else:
		_combo_idx = 0
	_combo_timer = combo_window

	var combo_mult = 1.0
	# Diferenciar combo por timing del golpe final (timing.multiplier ya usado en weapon_system.try_attack)
	if _combo_idx == 3:
		if timing.result == "PERFECT":
			combo_mult = 1.7
		elif timing.result == "GOOD":
			combo_mult = 1.28
		else:
			combo_mult = 1.0
		_screen_shake(14.0 * shake_intense_mult)
	elif _combo_idx == 2:
		combo_mult = 1.22 if timing.result == "PERFECT" else 1.12

	var target_type = _get_nearest_enemy_type()
	var result = weapon_system.try_attack(timing, target_type, combo_mult)

	_is_attacking = true
	_update_combo_hud()
	_update_weapon_hitbox()

	var col: Color = stats["color"]
	match timing.result:
		"PERFECT":
			_screen_shake((7.5 + _combo_idx*2.2) * shake_intense_mult)
			_hit_stop(hit_stop_duration + 0.024 * _combo_idx)
			_spawn_attack_effect(col, timing.result, _combo_idx)
		"GOOD":
			_screen_shake(5.5 * shake_intense_mult)
			_hit_stop(0.05)
			_spawn_attack_effect(col.lightened(0.28), timing.result, _combo_idx)
		"MISS":
			_screen_shake(2.2 * shake_intense_mult)
			_spawn_attack_effect(Color(0.5,0.5,0.5), timing.result, _combo_idx)
			_combo_idx = 0

	_activate_hitbox(stats, result.damage, timing.result)

	if weapon_system.current_weapon == "VoidWave":
		_spawn_wave_projectile(result.damage, timing.result)
	elif weapon_system.current_weapon == "EchoShot":
		_spawn_echo_burst(result.damage, timing.result)

	if _combo_idx == 3 and timing.result == "PERFECT":
		weapon_system.recharge(12)
		print("[KAIRO] COMBO FINISHER PERFECT!")

	await get_tree().create_timer(hitbox_duration).timeout
	_is_attacking = false

func _try_special():
	if resonance == null or weapon_system == null: return
	var timing = resonance.evaluate_timing()
	# Eficiencia skill -30% coste gestionado en WeaponSystem si tienes el skill
	if has_skill("energy_efficiency"):
		pass
	var res = weapon_system.try_special(timing)
	if not res.ok:
		_screen_shake(2.0 * shake_intense_mult)
		return
	match weapon_system.current_weapon:
		"PulseBlade": _spawn_spin_attack(res.damage, timing.result)
		"VoidWave": _spawn_big_wave(res.damage)
		"EchoShot":
			for i in 3:
				_spawn_echo_burst(res.damage, timing.result, 0.07 * i)
	_screen_shake(16.0 * shake_intense_mult)
	_hit_stop(0.16)
	_spawn_attack_effect(Color.GOLD, "PERFECT", 3)

func _activate_hitbox(stats: Dictionary, damage: int, timing_result: String):
	if attack_area == null or attack_shape == null:
		_try_hit_boss_fallback(damage, timing_result)
		return
	var base_size: Vector2 = stats["hitbox_size"]
	if _combo_idx == 3:
		base_size *= 1.42
	elif _combo_idx == 2:
		base_size *= 1.18
	var shape = attack_shape.shape
	if shape is RectangleShape2D:
		shape.size = base_size
	attack_shape.position = Vector2(base_size.x * 0.36, -6)
	attack_area.monitoring = true
	attack_shape.disabled = false
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
		attack_area.monitoring = false
		body.take_damage(dmg, wp)
		# Agregar echoes si enemigo muere es manejado por enemigo

func _on_hitbox_area(area: Node):
	var parent = area.get_parent()
	if parent and (parent.is_in_group("enemies") or parent.is_in_group("boss")):
		_on_hitbox_body(parent)

func _spawn_wave_projectile(damage: int, _timing: String):
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
	var tween = proj.create_tween()
	var target = proj.global_position + Vector2(weapon_system.get_stats()["range"] * _facing, 0)
	tween.tween_property(proj, "global_position", target, 0.45)
	tween.tween_callback(proj.queue_free)
	proj.connect("body_entered", func(b):
		if b.is_in_group("enemies") or b.is_in_group("boss"):
			if b.has_method("take_damage"):
				b.take_damage(damage, weapon_system.current_weapon)
				proj.queue_free()
	)

func _spawn_echo_burst(damage: int, _timing: String, delay: float = 0.0):
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
		proj.connect("body_entered", func(b):
			if b.has_method("take_damage") and (b.is_in_group("boss") or b.is_in_group("enemies")):
				b.take_damage(int(damage*0.6), weapon_system.current_weapon)
		)
		await get_tree().create_timer(0.05).timeout

func _spawn_spin_attack(damage: int, _timing: String):
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
	get_tree().current_scene.add_child(wave)
	wave.global_position = global_position
	var t = create_tween()
	t.tween_property(wave, "size", Vector2(260,260), 0.48)
	t.parallel().tween_property(wave, "position", wave.position - Vector2(120,120), 0.48)
	t.parallel().tween_property(wave, "color", Color(0.7,0.3,1,0), 0.48)
	t.tween_callback(wave.queue_free)
	for b in get_tree().get_nodes_in_group("enemies") + get_tree().get_nodes_in_group("boss"):
		if b.global_position.distance_to(global_position) < 130:
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

func _try_hit_boss_fallback(damage: int, _timing: String):
	for boss in get_tree().get_nodes_in_group("boss"):
		if boss.has_method("take_damage") and global_position.distance_to(boss.global_position) < 220:
			boss.take_damage(damage, weapon_system.current_weapon)

# --- VIDA, ECHOES, SOMBRA ---
func heal(amount: int):
	var bonus = 0
	if has_skill("dash_heal"): bonus = 2
	hp = min(max_hp, hp + amount + bonus)
	_update_hud()
	var t = create_tween()
	if sprite:
		t.tween_property(sprite, "modulate", Color(0.5, 1, 0.5), 0.1)
		t.tween_property(sprite, "modulate", Color.WHITE, 0.15)

func take_damage(amount: int):
	if is_invulnerable:
		# Parry reflect si skill
		if has_skill("parry_reflect"):
			_try_reflect_nearby_projectiles()
			print("[KAIRO] Parry REFLECT!")
		else:
			print("[KAIRO] Daño bloqueado i-frames")
		return
	hp -= amount
	hp = max(0, hp)
	_update_hud()
	_screen_shake(14.0 * shake_intense_mult)
	_hit_stop(0.13)
	print("[KAIRO] HP:", hp, "/", max_hp)
	if hp <= 0:
		_die()
	else:
		if sprite:
			var t = create_tween()
			t.tween_property(sprite, "modulate", Color(1, 0.25, 0.25), 0.09)
			t.tween_property(sprite, "modulate", Color.WHITE, 0.16)

func _try_reflect_nearby_projectiles():
	for proj in get_tree().get_nodes_in_group("enemy_projectile"):
		if proj.global_position.distance_to(global_position) < 85:
			# Reflejar: invertir dirección y cambiar a player projectile
			proj.remove_from_group("enemy_projectile")
			proj.add_to_group("player_projectile")
			if proj.has_node("ColorRect"):
				proj.get_node("ColorRect").color = Color.CYAN
			# Buscar tween y revertir (simplificado: nuevo tween opuesto)
			var t = proj.create_tween()
			t.tween_property(proj, "global_position", proj.global_position + Vector2(700 * _facing, -30), 0.6)
			# Darle daño reflejado
			# Se manejará cuando golpee al boss

func _die():
	print("[KAIRO] MUERTE - Creando sombra")
	if game_manager:
		game_manager.on_player_death(global_position)
		# Spawnear sombra visual
		# Instanciar como Area2D con script
		var shade_node = Area2D.new()
		shade_node.set_script(load("res://scripts/ShadowShade.gd"))
		shade_node.global_position = global_position
		get_tree().current_scene.add_child(shade_node)
	velocity = Vector2.ZERO
	set_physics_process(false)
	if sprite: sprite.color = Color(0.2, 0.2, 0.2)
	await get_tree().create_timer(1.1).timeout
	get_tree().reload_current_scene()

func _screen_shake(intensity: float):
	if camera == null: return
	intensity *= shake_intense_mult
	var tween = create_tween()
	tween.tween_property(camera, "offset", Vector2(randf_range(-intensity, intensity), randf_range(-intensity*0.7, intensity*0.7)), 0.045)
	tween.tween_property(camera, "offset", Vector2(randf_range(-intensity*0.6, intensity*0.6), randf_range(-intensity*0.6, intensity*0.6)), 0.07)
	tween.tween_property(camera, "offset", Vector2.ZERO, 0.14)

func _hit_stop(duration: float):
	duration *= 1.25
	Engine.time_scale = 0.08
	await get_tree().create_timer(duration, true, false, true).timeout
	Engine.time_scale = 1.0

func _spawn_dash_effect(col: Color):
	if sprite:
		var tween = create_tween()
		tween.tween_property(sprite, "modulate", col, 0.06)
		tween.tween_property(sprite, "modulate", Color.WHITE, 0.16)

func _spawn_attack_effect(col: Color, timing: String, combo: int):
	var rect = ColorRect.new()
	var w = 58 + combo * 16
	var h = 34 + combo * 7
	rect.size = Vector2(w, h)
	rect.color = col
	rect.position = Vector2(22 * _facing, -12 - combo*2)
	var lbl = Label.new()
	lbl.text = timing + (" x%d" % combo if combo>1 else "")
	lbl.add_theme_font_size_override("font_size", 11)
	lbl.position = Vector2(4,4)
	rect.add_child(lbl)
	add_child(rect)
	var t = create_tween()
	t.tween_property(rect, "position", rect.position + Vector2(14*_facing, -16), 0.14)
	t.parallel().tween_property(rect, "color", Color(col.r, col.g, col.b, 0), 0.22)
	t.tween_callback(rect.queue_free)
	if timing == "PERFECT":
		# Partícula extra intensa
		var p = ColorRect.new()
		p.size = Vector2(6,6)
		p.color = Color.GOLD
		p.position = Vector2(20*_facing, -6)
		add_child(p)
		var tp = create_tween()
		tp.tween_property(p, "position", p.position + Vector2(randf_range(-30,30), -40), 0.35)
		tp.parallel().tween_property(p, "color", Color(1,1,1,0), 0.35)
		tp.tween_callback(p.queue_free)

func _update_hud():
	if hp_label: hp_label.text = "HP: %d / %d" % [hp, max_hp]
	if energy_bar: energy_bar.value = weapon_system.energy if weapon_system else 100
	if weapon_label and weapon_system: weapon_label.text = "%s" % weapon_system.current_weapon
	if echoes_label and game_manager: echoes_label.text = "Echoes: %d" % game_manager.echoes

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
	if sprite:
		var t = create_tween()
		t.tween_property(sprite, "color", stats["color"], 0.13)
		t.tween_property(sprite, "color", Color.WHITE, 0.19)

func _on_echoes_changed(v: int):
	if echoes_label: echoes_label.text = "Echoes: %d" % v
