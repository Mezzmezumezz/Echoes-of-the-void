# scripts/WeaponSystem.gd
# SISTEMA DE ARMAS Y LOADOUT MEJORADO - Echoes of the Void
# 3 armas con identidad única, combo, rango y especiales consumiendo energía rítmica
extends Node
class_name WeaponSystem

signal weapon_changed(new_weapon: String, stats: Dictionary)
signal energy_changed(value: float)
signal special_used(weapon: String)

@export var energy_max: float = 100.0
@export var energy_per_perfect: float = 12.0
@export var energy_per_good: float = 6.0
@export var energy_cost_on_miss: float = 8.0

var weapons: Array[String] = ["PulseBlade", "VoidWave", "EchoShot"]
var current_idx: int = 0
var energy: float = 100.0
var current_weapon: String:
	get: return weapons[current_idx]

# Stats por arma: daño base, rango, cooldown, tipo, color
var weapon_stats: Dictionary = {
	"PulseBlade": {
		"base_damage": 26,
		"range": 70.0,          # melee corto
		"cooldown": 0.22,
		"hitbox_size": Vector2(60, 36),
		"color": Color(0.2, 0.9, 1.0),
		"special_cost": 25.0,
		"special_damage": 55,
		"desc": "Espada de pulso. 3-hit combo. Rápida, corta distancia. Fuerte vs Resonator."
	},
	"VoidWave": {
		"base_damage": 20,
		"range": 420.0,         # onda media
		"cooldown": 0.38,
		"hitbox_size": Vector2(90, 24),
		"color": Color(0.7, 0.3, 1.0),
		"special_cost": 30.0,
		"special_damage": 48,
		"desc": "Onda expansiva. Proyectil que atraviesa. Media distancia. Fuerte vs BassTitan."
	},
	"EchoShot": {
		"base_damage": 14,
		"range": 700.0,         # largo alcance
		"cooldown": 0.14,
		"hitbox_size": Vector2(22, 12),
		"color": Color(1.0, 0.85, 0.2),
		"special_cost": 35.0,
		"special_damage": 16, # x3 burst = 48
		"desc": "Ráfaga triple de eco. Rápida, largo alcance. Fuerte vs ChoirWarden."
	}
}

# Tabla de efectividad: arma -> boss_type -> multiplicador
var effectiveness: Dictionary = {
	"PulseBlade": {"Resonator": 1.6, "BassTitan": 0.7, "ChoirWarden": 1.0, "VoidHarvester": 0.9, "EchoPrime": 1.2, "EchoPrimordial": 1.4, "Slime": 1.2},
	"VoidWave":   {"Resonator": 0.8, "BassTitan": 1.6, "ChoirWarden": 1.0, "VoidHarvester": 1.5, "EchoPrime": 1.1, "EchoPrimordial": 1.3, "Slime": 1.0},
	"EchoShot":   {"Resonator": 1.0, "BassTitan": 0.9, "ChoirWarden": 1.6, "VoidHarvester": 1.2, "EchoPrime": 1.4, "EchoPrimordial": 1.1, "Slime": 1.3}
}

func _ready():
	energy = energy_max

func get_stats(weapon: String = "") -> Dictionary:
	if weapon == "": weapon = current_weapon
	return weapon_stats.get(weapon, weapon_stats["PulseBlade"])

func try_attack(timing: Dictionary, target_boss_type: String = "Resonator", combo_mult: float = 1.0) -> Dictionary:
	var stats = get_stats()
	var base_dmg = stats["base_damage"]
	var resonance_mult = timing.multiplier
	var weapon_mult = 1.0
	if effectiveness.has(current_weapon) and effectiveness[current_weapon].has(target_boss_type):
		weapon_mult = effectiveness[current_weapon][target_boss_type]

	var final_dmg = int(base_dmg * resonance_mult * weapon_mult * combo_mult)

	# Recarga / coste según timing
	match timing.result:
		"PERFECT":
			energy = min(energy_max, energy + energy_per_perfect)
		"GOOD":
			energy = min(energy_max, energy + energy_per_good)
		"MISS":
			energy = max(0, energy - energy_cost_on_miss)

	emit_signal("energy_changed", energy)
	print("[Weapon] %s vs %s | %s (%.1fms) | Dmg: %d (base %d x%.1f*%.1f*combo%.1f) | EN: %.0f" % [current_weapon, target_boss_type, timing.result, timing.diff_ms, final_dmg, base_dmg, resonance_mult, weapon_mult, combo_mult, energy])
	return {"damage": final_dmg, "timing": timing, "weapon": current_weapon, "stats": stats, "weapon_mult": weapon_mult}

func try_special(timing: Dictionary) -> Dictionary:
	var stats = get_stats()
	var cost = stats["special_cost"]
	var gm = get_node_or_null("/root/GameManager")
	if gm and gm.has_skill("energy_efficiency"):
		cost = cost * 0.7
	if energy < cost:
		print("[Weapon] Energía insuficiente para especial (%s necesita %.0f)" % [current_weapon, cost])
		return {"ok": false}
	# Bonus si es al beat
	var timing_bonus = 1.5 if timing.result == "PERFECT" else (1.2 if timing.result == "GOOD" else 0.8)
	energy -= cost
	emit_signal("energy_changed", energy)
	emit_signal("special_used", current_weapon)
	var dmg = int(stats["special_damage"] * timing_bonus)
	print("[Weapon] ESPECIAL %s | %s | Dmg: %d" % [current_weapon, timing.result, dmg])
	return {"ok": true, "damage": dmg, "weapon": current_weapon, "timing": timing}

func recharge(amount: float):
	energy = min(energy_max, energy + amount)
	emit_signal("energy_changed", energy)

func can_use_special() -> bool:
	return energy >= get_stats()["special_cost"]

func switch_weapon():
	current_idx = (current_idx + 1) % weapons.size()
	emit_signal("weapon_changed", current_weapon, get_stats())
	print("[Weapon] Cambiado a: ", current_weapon, " | ", get_stats()["desc"])

func switch_to(index: int):
	if index >= 0 and index < weapons.size():
		current_idx = index
		emit_signal("weapon_changed", current_weapon, get_stats())

func _unhandled_input(event):
	if event.is_action_pressed("weapon_switch"):
		switch_weapon()
