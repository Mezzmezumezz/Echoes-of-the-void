# AGENTS.md - Echoes of the Void

Godot 4.7 (GDScript, `gl_compatibility`) - no npm/pip/test harness. Entry: `project.godot` → `res://scenes/MainMenu.tscn`.

## Run & Verify

- **Editor (preferred):** Open `project.godot` with Godot 4.7 **standard** build (not `*_mono_*` - mono requires .NET SDK 10.0.5 even though project is GDScript-only; `[dotnet]` was removed to avoid this, but mono still warns). Press Play.
- **Headless check (no test suite):** `& "C:\Users\Profesor\Desktop\Godot_v4.7.2-stable_mono_win64\Godot_v4.7.2-stable_mono_win64_console.exe" --headless --path "C:\Users\Profesor\Documents\game" --check-only` - watch for `Parent path ... vanished` or GDScript errors. Kill process after 5s (it hangs).
- **Cache:** Delete `.godot/` after editing `.tscn`/imports - Godot caches aggressively and stale `load_steps` causes vanishing parents.
- No lint/typecheck/CI. `README.md` is placeholder.

## Architecture

- **Autoloads** (`project.godot:[autoload]`): `ResonanceManager` (`scripts/ResonanceManager.gd` - BPM, `beat_pulse`, `evaluate_timing() -> {result,multiplier,diff_ms}`, procedural `AudioStreamWAV` beeps, `load_music()` detects BPM from filename `*_140bpm.ogg`), `GameManager` (`scripts/GameManager.gd` - `echoes`, shade state, `skill_data` dict, `ConfigFile` save at `user://echoes_save.cfg`).
- **Scenes:** `scenes/MainMenu.tscn` (menu + `MainMenu.gd`) → `scenes/Main.tscn` (8000px open world: ground `scale 335`, 15 platforms, 5 boss arenas at x 2650/4050/5450/6650/7650, walls `group boss_door`). `project.godot:window/size` 1920x1080, `textures/canvas_textures/default_texture_filter=0` (pixel art Nearest).
- **Player:** `scripts/PlayerKairo.gd` (`CharacterBody2D`, group `player`) - Coyote 0.15s, Jump Buffer 0.12s, Wall Slide/RayCast, Double Jump, Dash with beat-synced `is_invulnerable`, 3-hit combo (`_combo_idx`), `AttackArea` (`Area2D` mask 3, `RectangleShape2D` hitbox sized per weapon), `WeaponSystem` child. Reads skills via `GameManager.has_skill()`.
- **Combat:** `scripts/WeaponSystem.gd` (stats `PulseBlade`/`VoidWave`/`EchoShot` + `effectiveness` dict, `try_attack(timing, type, combo_mult)`, `try_special()`), `scripts/BaseBoss.gd` (FSM `IDLE/TELEGRAPH/ATTACK/STUNNED/TRANSITION/DEAD`, 4 patterns `SINGLE/DOUBLE/WAVE/PULSE` with 0.35s telegraph, `group boss`, spawns `enemy_projectile` reflectable if `parry_reflect` skill), `scripts/MinorEnemy.gd` (group `enemies`+`boss`, patrol, beat-synced attack, rewards `echoes`+`recharge(20)`).
- **Systems:** `scripts/WeaponWheel.gd` / `SkillTreeManager.gd` / `PauseMenu.gd` are `CanvasLayer`s in `Main.tscn` (wheel slows `Engine.time_scale 0.22`, skill tree pauses `0.0`), `scripts/ShadowShade.gd` (`Area2D` group `shade`, 4-lane piano minigame `A/D/J/E` on beat), `scripts/TutorialManager.gd` (polls `player.global_position.x` to show 8 zones).

## Conventions & Gotchas

- **`.tscn` is not a script:** No `#` comments - they break the parser and cause `Parent path ... vanished when instantiating`. Use no comments or `;` (engine ignores). `load_steps` must equal `count(ext_resource)+count(sub_resource)` or nodes vanish (Main: 8+5=13).
- **Groups are the API:** `player`, `boss`, `enemies`, `enemy_projectile`/`player_projectile`, `boss_door`, `shade`. `PlayerKairo._get_nearest_enemy_type()` and boss reflect logic rely on these exact strings.
- **Placeholders:** All visuals are `ColorRect`/`ProgressBar`/`Label` + procedural `AudioStreamWAV` - never require external `assets/` or `music/` to run. Replace later but keep filter Nearest.
- **Input:** Defined in `project.godot:[input]` - `move_left/right` (A/D+arrows), `jump` (Space/W), `dash` (Shift), `attack` (J), `weapon_switch` (Q), `special` (E/K), `pause` (Esc), `skill_tree` (T), `hit_0..3` (1-4), `weapon_next/prev` (unused). Add new actions there, not in code.
- **Save:** `GameManager.save_game()` is `ConfigFile` - test with `user://echoes_save.cfg` deletion to reset.
- **.gitignore:** `.godot/`, `export/`, `*.import`, `.mono/`, `data_*/` - don't commit generated. No lockfiles/package manifests to check.
