# scripts/MinorEnemy.gd
# ENEMIGO MENOR - Echo Slime / Resonant Husk
# Enemigo tutorial: patrulla, ataca al ritmo, enseña ventanas PERFECT/GOOD
extends CharacterBody2D

@export var enemy_name: String = "EchoSlime"
@export var max_hp: int = 70
@export var patrol_distance: float = 160.0
@export var move_speed: float = 70.0
@export var contact_damage: int = 12
@export var attack_cooldown: float = 1.6

var hp: int
var _start_x: float
var _dir: float = 1.0
var _attack_timer: float = 0.0
var _stun_timer: float = 0.0
var _is_dead: bool = false

var resonance: Node
@onready var sprite: ColorRect = $Sprite
@onready var hp_bar: ProgressBar = $HpBar
@onready var label: Label = $Label
@onready var detection: Area2D = $DetectionArea

func _ready():
	hp = max_hp
	_start_x = global_position.x
	add_to_group("enemies")
	add_to_group("boss") # para que el player lo detecte con su hitbox genérico
	if has_node("/root/ResonanceManager"):
		resonance = get_node("/root/ResonanceManager")
		if resonance.has_signal("beat_pulse"):
			resonance.connect("beat_pulse", _on_beat)
	if hp_bar:
		hp_bar.max_value = max_hp
		hp_bar.value = hp
		hp_bar.visible = false
	if label:
		label.text = enemy_name
		label.add_theme_font_size_override("font_size", 9)
	print("[Enemy] %s en %.0f,%.0f" % [enemy_name, global_position.x, global_position.y])

func _physics_process(delta):
	if _is_dead: return

	_attack_timer -= delta
	_stun_timer -= delta

	# Gravedad
	if not is_on_floor():
		velocity.y += 1100 * delta
	else:
		velocity.y = 0

	# Si está stuneado, no patrulla
	if _stun_timer > 0:
		velocity.x = move_toward(velocity.x, 0, 800 * delta)
		if sprite: sprite.color = Color(0.5, 0.5, 1.0)
		move_and_slide()
		return

	# Patrulla simple
	velocity.x = _dir * move_speed
	# Girar al llegar al límite
	if global_position.x > _start_x + patrol_distance:
		_dir = -1
		if sprite: sprite.scale.x = -abs(sprite.scale.x)
	elif global_position.x < _start_x - patrol_distance:
		_dir = 1
		if sprite: sprite.scale.x = abs(sprite.scale.x)

	# Detectar jugador cerca para atacar (solo en beat)
	var player = get_tree().get_first_node_in_group("player")
	if player and global_position.distance_to(player.global_position) < 200 and is_on_floor():
		# Mirar al jugador
		_dir = sign(player.global_position.x - global_position.x)
		if _dir == 0: _dir = 1
		velocity.x = _dir * move_speed * 0.6
		if sprite:
			sprite.scale.x = _dir * abs(sprite.scale.x)
		# Ataque se hace en _on_beat, no aquí

	move_and_slide()

	# Pincho si el jugador toca
	if player and global_position.distance_to(player.global_position) < 28:
		if _attack_timer <= 0 and player.has_method("take_damage"):
			player.take_damage(contact_damage)
			_attack_timer = 0.8
			# Feedback
			_flash(Color(1,0.5,0.5))

func _on_beat(beat_count: int):
	if _is_dead or _stun_timer > 0: return
	# Ataca cada 2 beats si el jugador está cerca
	if beat_count % 2 != 0: return
	var player = get_tree().get_first_node_in_group("player")
	if player == null: return
	var dist = global_position.distance_to(player.global_position)
	if dist > 240 or dist < 25: return

	# Ataque a distancia corta: salto hacia el jugador (tutorial de parry)
	if dist < 140:
		velocity.y = -180
		velocity.x = _dir * 140
		# Pulso visual al ritmo
		if sprite:
			var t = create_tween()
			t.tween_property(sprite, "scale", Vector2(1.15, 0.85), 0.08)
			t.tween_property(sprite, "scale", Vector2.ONE, 0.12)
			sprite.color = Color(1, 0.7, 0.3)
			await get_tree().create_timer(0.15).timeout
			if not _is_dead: sprite.color = Color(0.8, 1.0, 0.5)

func take_damage(amount: int, weapon_name: String = ""):
	if _is_dead: return
	hp -= amount
	hp = max(0, hp)
	if hp_bar:
		hp_bar.visible = true
		hp_bar.value = hp

	# Feedback: flash + hitstop corto + shake si eres Kairo
	_flash(Color.WHITE)
	var hsm = get_node_or_null("/root/HitStopManager")
	if hsm:
		hsm.hit_stop(0.04, 0.18)
	else:
		Engine.time_scale = 0.18
		await get_tree().create_timer(0.04, true, false, true).timeout
		Engine.time_scale = 1.0

	# Stun si daño alto (enseña que PERFECT stunea)
	if amount >= 22:
		_stun_timer = 0.7
		print("[Enemy] %s STUN por %d dmg!" % [enemy_name, amount])

	# Knockback
	var player = get_tree().get_first_node_in_group("player")
	if player:
		var dir = sign(global_position.x - player.global_position.x)
		if dir == 0: dir = _dir
		velocity.x = dir * 160
		velocity.y = -90
		_dir = -dir

	if hp <= 0:
		_die()
	else:
		print("[Enemy] %s HP %d/%d (-%d %s)" % [enemy_name, hp, max_hp, amount, weapon_name])
		# Mostrar daño flotante
		_spawn_damage_number(amount)

func _spawn_damage_number(amount: int):
	var lbl = Label.new()
	lbl.text = str(amount)
	lbl.add_theme_font_size_override("font_size", 14)
	lbl.position = Vector2(-10, -50)
	lbl.modulate = Color(1, 0.9, 0.3) if amount > 22 else Color.WHITE
	add_child(lbl)
	var t = create_tween()
	t.tween_property(lbl, "position", lbl.position + Vector2(randf_range(-10,10), -28), 0.5)
	t.parallel().tween_property(lbl, "modulate", Color(1,1,1,0), 0.5)
	t.tween_callback(lbl.queue_free)

func _flash(col: Color):
	if sprite:
		var prev = sprite.color
		sprite.color = col
		await get_tree().create_timer(0.08).timeout
		if not _is_dead:
			sprite.color = Color(0.8, 1.0, 0.5)

func _die():
	_is_dead = true
	print("[Enemy] %s derrotado!" % enemy_name)
	if label: label.text = "DEFEATED"
	collision_layer = 0
	collision_mask = 0
	if sprite:
		var t = create_tween()
		t.tween_property(sprite, "color", Color(0.3, 0.3, 0.3, 0.4), 0.3)
		t.parallel().tween_property(sprite, "scale", Vector2(1.3, 0.2), 0.3)
	# Dar energía + echoes
	var player = get_tree().get_first_node_in_group("player")
	if player and player.has_node("WeaponSystem"):
		var ws = player.get_node("WeaponSystem")
		if ws.has_method("recharge"):
			ws.recharge(20)
	# Echoes para skill tree
	if has_node("/root/GameManager"):
		var gm = get_node("/root/GameManager")
		gm.add_echoes(randi_range(12, 24))
		print("[Enemy] +Echoes, total:", gm.echoes)
	# Desaparecer
	await get_tree().create_timer(0.6).timeout
	queue_free()
