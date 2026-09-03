# scripts/HitStopManager.gd
# Singleton centralizado para hit-stop - evita conflictos de Engine.time_scale
extends Node

var _active: bool = false
var _queue: Array = []

func hit_stop(duration: float = 0.09, scale: float = 0.08):
	_queue.append({"duration": duration, "scale": scale})
	if not _active:
		_process_queue()

func _process_queue():
	if _queue.is_empty():
		_active = false
		Engine.time_scale = 1.0
		return
	_active = true
	var entry = _queue.pop_front()
	Engine.time_scale = entry["scale"]
	await get_tree().create_timer(entry["duration"] * 1.25, true, false, true).timeout
	Engine.time_scale = 1.0
	await get_tree().create_timer(0.01, true, false, true).timeout
	_process_queue()
