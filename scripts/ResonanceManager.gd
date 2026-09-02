# scripts/ResonanceManager.gd
# GESTOR DE RITMO Y BPM - Echoes of the Void
# Nodo Autoload. Controla el pulso musical dinámico y evalúa timing tipo Guitar Hero / Osu!
# Attach: Autoload (Project Settings > Autoload) o como hijo de Main
extends Node

signal beat_pulse(beat_count: int)
signal action_evaluated(result: String, multiplier: float, diff_ms: float)

enum Timing { PERFECT, GOOD, MISS }

# --- CONFIGURACIÓN EXPORTABLE ---
@export var bpm: float = 120.0 : set = set_bpm
@export var perfect_window_ms: float = 50.0  # Ventana PERFECT ±50ms
@export var good_window_ms: float = 110.0    # Ventana GOOD ±110ms
@export var debug_log: bool = false

var beat_interval: float = 0.5
var _beat_timer: float = 0.0
var beat_count: int = 0
var _last_beat_time: float = 0.0

# Placeholder feedback
var beat_ui: ColorRect
var beat_label: Label
var audio_tick: AudioStreamPlayer
var _pulse_tween: Tween

func _ready():
	beat_interval = 60.0 / bpm
	_setup_placeholder_ui()
	_setup_placeholder_audio()
	print("[ResonanceManager] Iniciado | BPM: ", bpm, " | Interval: ", beat_interval)

func _setup_placeholder_ui():
	var canvas = CanvasLayer.new()
	canvas.name = "ResonanceCanvas"
	add_child(canvas)

	var panel = ColorRect.new()
	panel.name = "BeatPanel"
	panel.size = Vector2(260, 70)
	panel.position = Vector2(1920 - 280, 20)
	panel.color = Color(0.08, 0.08, 0.12, 0.85)
	canvas.add_child(panel)

	beat_ui = ColorRect.new()
	beat_ui.name = "BeatPulse"
	beat_ui.size = Vector2(60, 60)
	beat_ui.position = Vector2(1920 - 90, 25)
	beat_ui.color = Color(0.2, 0.6, 1.0, 0.6)
	canvas.add_child(beat_ui)

	beat_label = Label.new()
	beat_label.position = Vector2(1920 - 260, 30)
	beat_label.size = Vector2(160, 50)
	beat_label.text = "BPM: %d\nBEAT: 0" % int(bpm)
	beat_label.add_theme_font_size_override("font_size", 16)
	canvas.add_child(beat_label)

	# Barra de ritmo visual (Line2D pulso)
	var info = Label.new()
	info.text = "ATK/DASH al pulso = PERFECT"
	info.position = Vector2(20, 20)
	info.add_theme_font_size_override("font_size", 14)
	canvas.add_child(info)

var _tick_normal: AudioStreamWAV
var _tick_accent: AudioStreamWAV

func _setup_placeholder_audio():
	audio_tick = AudioStreamPlayer.new()
	audio_tick.name = "TickPlayer"
	audio_tick.volume_db = -4.0
	add_child(audio_tick)
	# Generar beeps procedurales sin archivos externos
	_tick_normal = _generate_beep(780.0, 0.07)
	_tick_accent = _generate_beep(1100.0, 0.11)
	audio_tick.stream = _tick_normal
	# Para usar tu música luego: audio_tick.stream = load("res://music/boss1.ogg") y sincroniza bpm

func _generate_beep(freq: float, duration: float) -> AudioStreamWAV:
	var sample_rate = 44100
	var num_samples = int(sample_rate * duration)
	var wav = AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = sample_rate
	wav.stereo = false
	var data = PackedByteArray()
	data.resize(num_samples * 2)
	for i in range(num_samples):
		var t = float(i) / float(sample_rate)
		# envolvente con decay para que no haga click
		var env = 1.0 - float(i) / float(num_samples)
		env = pow(env, 0.6)
		var s = sin(TAU * freq * t) * 0.35 * env
		var val = int(s * 32767)
		data[i * 2] = val & 0xFF
		data[(i * 2) + 1] = (val >> 8) & 0xFF
	wav.data = data
	return wav

func _process(delta):
	_beat_timer += delta
	if _beat_timer >= beat_interval:
		_beat_timer -= beat_interval
		beat_count += 1
		_last_beat_time = Time.get_ticks_msec() / 1000.0
		emit_signal("beat_pulse", beat_count)
		_pulse_feedback()

func _pulse_feedback():
	if beat_ui:
		if _pulse_tween: _pulse_tween.kill()
		_pulse_tween = create_tween()
		# Pulso blanco -> azul
		beat_ui.color = Color(1, 1, 1, 1.0)
		beat_ui.scale = Vector2(1.25, 1.25)
		_pulse_tween.tween_property(beat_ui, "color", Color(0.2, 0.6, 1.0, 0.6), 0.2)
		_pulse_tween.parallel().tween_property(beat_ui, "scale", Vector2.ONE, 0.2)
		# Cada 4 beats (compás) más grande
		if beat_count % 4 == 0:
			beat_ui.color = Color(1, 0.9, 0.3, 1.0)

	if beat_label:
		beat_label.text = "BPM: %d\nBEAT: %d" % [int(bpm), beat_count]

	# Sonido procedural: accent cada 4 beats
	if audio_tick:
		audio_tick.stream = _tick_accent if beat_count % 4 == 0 else _tick_normal
		audio_tick.pitch_scale = 1.0
		audio_tick.play()

# --- API PÚBLICA ---
func set_bpm(new_bpm: float):
	bpm = clamp(new_bpm, 60.0, 220.0)
	beat_interval = 60.0 / bpm
	if beat_label:
		beat_label.text = "BPM: %d\nBEAT: %d" % [int(bpm), beat_count]
	if debug_log:
		print("[Resonance] BPM -> ", bpm)

# Evalúa el timing actual respecto al beat más cercano
# Retorna: {result: "PERFECT"/"GOOD"/"MISS", multiplier: float, diff_ms: float}
func evaluate_timing() -> Dictionary:
	var now = Time.get_ticks_msec() / 1000.0
	# Distancia al beat más cercano (con wrap)
	var time_since_beat = fposmod(now - _last_beat_time + beat_interval * 0.5, beat_interval) - beat_interval * 0.5
	var abs_diff_ms = abs(time_since_beat) * 1000.0

	var result: String
	var mult: float
	if abs_diff_ms <= perfect_window_ms:
		result = "PERFECT"
		mult = 1.5
	elif abs_diff_ms <= good_window_ms:
		result = "GOOD"
		mult = 1.2
	else:
		result = "MISS"
		mult = 0.6 # daño reducido fuera de ritmo como pediste

	emit_signal("action_evaluated", result, mult, abs_diff_ms)
	if debug_log:
		print("[Timing] %s | %.1f ms | x%s" % [result, abs_diff_ms, mult])
	return {"result": result, "multiplier": mult, "diff_ms": abs_diff_ms}

func get_timing_multiplier() -> float:
	return evaluate_timing().multiplier

# Para bosses: interpolar BPM suavemente entre fases
func tween_bpm(target_bpm: float, duration: float = 2.0):
	var tween = create_tween()
	tween.tween_property(self, "bpm", target_bpm, duration)
