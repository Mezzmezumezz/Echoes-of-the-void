# scripts/ResonanceShard.gd
# COLECCIONABLE - Fragmentos de resonancia escondidos por el mapa
extends Area2D

@export var shard_value: int = 1

var _collected: bool = false
var _base_y: float

func _ready():
	body_entered.connect(_on_body_entered)
	_base_y = position.y
	# Float animation
	var t = create_tween().set_loops()
	t.tween_property(self, "position:y", _base_y - 6, 0.8).set_trans(Tween.TRANS_SINE)
	t.tween_property(self, "position:y", _base_y, 0.8).set_trans(Tween.TRANS_SINE)

func _on_body_entered(body: Node):
	if _collected: return
	if body.is_in_group("player"):
		_collected = true
		var gm = get_node_or_null("/root/GameManager")
		if gm:
			gm.resonance_shards += shard_value
			gm.save_game()
			print("[Shard] +%d shard(s), total: %d" % [shard_value, gm.resonance_shards])
		# Efecto de recolección
		var t = create_tween()
		t.tween_property(self, "scale", Vector2(2, 2), 0.15)
		t.parallel().tween_property(self, "modulate", Color(1, 1, 1, 0), 0.15)
		t.tween_callback(queue_free)
