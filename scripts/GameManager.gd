# scripts/GameManager.gd
# MANAGER GLOBAL - Echoes of the Void
# Moneda (Echoes), sombra Hollow Knight + minijuego Osu/Piano, skill tree y save
extends Node

signal echoes_changed(amount: int)
signal shade_spawned(pos: Vector2)

var echoes: int = 0 : set = set_echoes
var max_hp_bonus: int = 0
var unlocked_skills: Dictionary = {}
var defeated_bosses: Dictionary = {}  # boss_type -> true si derrotado
var resonance_shards: int = 0  # Coleccionables

# Sombra
var shade_exists: bool = false
var shade_pos: Vector2 = Vector2.ZERO
var shade_echoes: int = 0
var shade_scene: PackedScene = null

# Skill tree definicion
var skill_data: Dictionary = {
	"hp_1": {"name": "Corazón Resonante I", "cost": 120, "desc": "+20 HP max", "requires": []},
	"hp_2": {"name": "Corazón Resonante II", "cost": 250, "desc": "+30 HP max", "requires": ["hp_1"]},
	"dash_heal": {"name": "Eco Vital", "cost": 180, "desc": "Dash PERFECT cura +4 extra", "requires": []},
	"wall_jump": {"name": "Adherencia Sónica", "cost": 100, "desc": "Desbloquea Wall Jump + Wall Slide", "requires": []},
	"double_jump": {"name": "Impulso de Vacío", "cost": 300, "desc": "Doble salto", "requires": ["wall_jump"]},
	"combo_master": {"name": "Maestro de Combo", "cost": 220, "desc": "Combo GOOD también da x1.3", "requires": []},
	"parry_reflect": {"name": "Reverberación", "cost": 200, "desc": "Parry refleja proyectiles", "requires": []},
	"energy_efficiency": {"name": "Flujo Armónico", "cost": 160, "desc": "-30% coste especiales", "requires": []},
	# Habilidades de jefes (se desbloquean al derrotar jefes)
	"boss_ricochet": {"name": "Eco Rebote", "cost": 0, "desc": "Proyectil que rebota en paredes (Especial)", "requires": [], "boss_reward": true},
	"boss_blackhole": {"name": "Agujero Negro", "cost": 0, "desc": "Zona de gravedad que atrae enemigos (Especial)", "requires": [], "boss_reward": true},
	"boss_teleport": {"name": "Traslación", "cost": 0, "desc": "Teletransporte corto (Shift+Dash en aire)", "requires": [], "boss_reward": true},
	"boss_clone": {"name": "Eco Espejo", "cost": 0, "desc": "Crea un clon que ataca (Especial)", "requires": [], "boss_reward": true}
}

func _ready():
	load_game()
	print("[GameManager] Echoes:", echoes)

func add_echoes(amount: int):
	echoes += amount
	emit_signal("echoes_changed", echoes)
	save_game()

func spend_echoes(amount: int) -> bool:
	if echoes >= amount:
		echoes -= amount
		emit_signal("echoes_changed", echoes)
		save_game()
		return true
	return false

func set_echoes(v: int):
	echoes = v
	emit_signal("echoes_changed", echoes)

func on_player_death(pos: Vector2):
	if shade_exists:
		# Si ya había sombra, se pierde para siempre (HK)
		print("[GameManager] Sombra anterior perdida!")
		shade_exists = false
	# Crear nueva sombra con los echoes actuales
	shade_echoes = echoes
	shade_pos = pos
	shade_exists = true
	echoes = 0
	emit_signal("echoes_changed", echoes)
	emit_signal("shade_spawned", pos)
	save_game()
	print("[GameManager] Sombra creada en ", pos, " con ", shade_echoes, " Echoes")

func on_boss_defeated(boss_type: String):
	if defeated_bosses.has(boss_type): return
	defeated_bosses[boss_type] = true
	# Desbloquear habilidad de boss
	var reward_skill = ""
	match boss_type:
		"BassTitan": reward_skill = "boss_ricochet"
		"VoidHarvester": reward_skill = "boss_blackhole"
		"EchoPrime": reward_skill = "boss_teleport"
		"EchoPrimordial": reward_skill = "boss_clone"
		"ChoirWarden": reward_skill = "boss_ricochet"  # Fallback
	if reward_skill != "" and not has_skill(reward_skill):
		unlocked_skills[reward_skill] = true
		print("[GameManager] Habilidad de boss desbloqueada: ", reward_skill)
	save_game()

func try_recover_shade() -> bool:
	if not shade_exists:
		return false
	# Se inicia minijuego piano tiles, si lo pasa recupera
	return true

func recover_shade_success():
	echoes += shade_echoes
	shade_exists = false
	shade_echoes = 0
	emit_signal("echoes_changed", echoes)
	save_game()
	print("[GameManager] ¡Sombra recuperada! Echoes:", echoes)

func recover_shade_fail():
	shade_exists = false
	shade_echoes = 0
	save_game()
	print("[GameManager] Fallaste piano tiles, echoes perdidos")

func has_skill(id: String) -> bool:
	return unlocked_skills.has(id) and unlocked_skills[id]

func can_unlock(id: String) -> bool:
	if has_skill(id): return false
	var data = skill_data.get(id, {})
	if echoes < data.get("cost", 9999): return false
	for req in data.get("requires", []):
		if not has_skill(req): return false
	return true

func unlock_skill(id: String) -> bool:
	if not can_unlock(id): return false
	var cost = skill_data[id]["cost"]
	if not spend_echoes(cost): return false
	unlocked_skills[id] = true
	# Aplicar bonus
	match id:
		"hp_1": max_hp_bonus += 20
		"hp_2": max_hp_bonus += 30
	save_game()
	print("[Skill] Desbloqueado ", id)
	return true

func save_game():
	var cfg = ConfigFile.new()
	cfg.set_value("player", "echoes", echoes)
	cfg.set_value("player", "shade_exists", shade_exists)
	cfg.set_value("player", "shade_pos_x", shade_pos.x)
	cfg.set_value("player", "shade_pos_y", shade_pos.y)
	cfg.set_value("player", "shade_echoes", shade_echoes)
	cfg.set_value("player", "skills", unlocked_skills)
	cfg.set_value("player", "max_hp_bonus", max_hp_bonus)
	cfg.set_value("player", "defeated_bosses", defeated_bosses)
	cfg.set_value("player", "resonance_shards", resonance_shards)
	cfg.save("user://echoes_save.cfg")

func load_game():
	var cfg = ConfigFile.new()
	if cfg.load("user://echoes_save.cfg") != OK:
		return
	echoes = cfg.get_value("player", "echoes", 0)
	shade_exists = cfg.get_value("player", "shade_exists", false)
	shade_pos = Vector2(cfg.get_value("player", "shade_pos_x", 0), cfg.get_value("player", "shade_pos_y", 0))
	shade_echoes = cfg.get_value("player", "shade_echoes", 0)
	unlocked_skills = cfg.get_value("player", "skills", {})
	max_hp_bonus = cfg.get_value("player", "max_hp_bonus", 0)
	defeated_bosses = cfg.get_value("player", "defeated_bosses", {})
	resonance_shards = cfg.get_value("player", "resonance_shards", 0)
