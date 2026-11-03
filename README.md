# Echoes of the Void — Web (web-echoes/)

Port web fiel a la idea original Godot: platformer rítmico 9500px, 6 bosses, 3 armas, 8 skills + 4 de boss, slimes, 5 shards, 3 locks, shade Hollow-Knight, tutorial, minimapa, save en localStorage.

Buscado en internet: Kenney Pixel Platformer 18×18 CC0 (https://kenney.nl/assets/pixel-platformer). No se descarga nada: el juego dibuja pixel-art procedural en ese estilo para funcionar offline con doble clic. Para usar los PNG reales, ponlos en `web-echoes/assets/` y cámbialos en `game.js:R()`.

## Abrir
Doble clic en `index.html`. Sin servidor, sin npm, solo teclado.

## Música de bosses
- Menú/pausa: `assets/soundtrack_pantalla_de_carga.wav` · Exploración: `assets/soundtrack_principal.wav`.
- Bosses 1-5: fase 1 con `assets/boss_resonator_95bpm.wav` y fase 2 con `assets/boss_resonator_fase2_95bpm.wav`. El `playbackRate` ajusta cada loop al BPM real de la fase sin cambiar el tono.
- Jefe final `EchoPrimordial`: fase 1 con *Blade* (`assets/music/echo_primordial_fase1_blade.mp3`, 150 BPM) y fase 2 con *Into The Void* (`assets/music/echo_primordial_fase2_into_the_void.mp3`, 156 BPM).
- La transición de fase 1→2 dura 6 s: *Into The Void* arranca en 1.0 s para que su drop caiga justo al terminar la cinemática, y el reloj rítmico se re-cuadra en ese instante. El jefe final tiene más HP, más ventanas de invulnerabilidad (fase aérea más frecuente + Velo del Vacío) y piso corrosivo en fase 2.

## Controles
A/D mover · Espacio/W saltar · Shift dash · J/clic atacar (parry al BOMBO) · Q ciclo arma · E/K especial · T skills · H números · Esc pausa · 1-4 o Z-X-C-V piano/notas
