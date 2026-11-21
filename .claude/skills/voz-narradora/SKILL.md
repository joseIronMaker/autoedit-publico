---
name: voz-narradora
description: Elige, dirige y graba la narración de una pieza del motor `estudio/` (Gemini TTS, casting con escucha de Gemini 4 Argon). Úsala para grabar una voz nueva, cambiar de narradora o probar motores como VoiceStudio.
---

# Voz de narración

La voz vale tanto como la animación, y yo no puedo oírla: **quien decide de oído es José**. Mi
trabajo es llegarle con una toma ya sin errores.

## Voz actual

`es-419-commercial-6` con `gemini-3.8-flash-lite-tts`. Mexicana, grave y aterciopelada. Ganó el
casting de noviembre de 2026 con 7/10 frente al nivel de r6 (Argon); el modelo Flash completo
leyó "mapar" en la misma prueba, y Lite salió más natural además de más barato.
Herramientas: `estudio/voces/narra.py` (una toma), `casting2.py` (comparar voces).

## Dirección

- **Estilo corto.** Una línea: "Narradora de documental: voz limpia, cálida y segura. Ritmo tranquilo
  con intención. Sin susurrar." Las direcciones largas producen deriva.
- **No metas `<breath>` ni pidas susurro:** en las pruebas la dejaron teatral, con jadeos y estiramientos.
  Controla el ritmo con la puntuación: un punto, una coma, unos puntos suspensivos.
- **Una sola toma** para todo el guion: el timbre se mantiene. Las pausas largas se INSERTAN después
  en la mezcla (`PAUSAS` en `tiempos.py`), donde se controlan al milisegundo.
- **Velocidad medida, no estimada.** r6 va a 162 ppm, r2 a 130. Gemini calculó 125-135 ppm para r6, así
  que cuenta palabras. Ajusta con `atempo` si hace falta (hasta ~1.1 no se nota).

## Antes de animar encima

Pásale la toma completa a Gemini 4 Argon junto con el guion y pídele errores de lectura con marca
de tiempo. Regrabar después de animar obliga a rehacer toda la sincronía.

## Otra voz

Para una voz nueva, haz un casting con la misma frase larga, compara con un fragmento de referencia
y entrega a José 2-3 finalistas para escuchar. La biblioteca tiene 2,000+ voces (`client.voices.list`);
las 15 femeninas mexicanas están en `estudio/voces/biblioteca_es.json`.

## Lo que no se hace

- **No clonar a nadie sin permiso**, ni la voz de los referentes. Se analiza qué hace funcionar su
  interpretación y se dirige una voz propia hacia ahí.
- **La voz de José** sí se puede replicar: Gemini pide 10-30 s de muestra más un consentimiento
  hablado por él mismo.

## VoiceStudio (pendiente, requiere a José)

Se evaluó en noviembre de 2026. Puede correr en Colab sin escritorio, pero:

- Su motor por defecto (OmniVoice) figura como **no comercial** en su propio inventario de licencias,
  y el canal aspira a monetizar. No usar en contenido que genere recompensas.
- Colab prohíbe `creating deepfakes` y conectar proxies remotos, y en el nivel gratis restringe manejarlo
  por una interfaz web externa: si se usa, se genera **dentro de celdas**, sin túneles.
- Falta que José inicie sesión de Google en el Chrome del puente.
- OmniVoice no acepta dirección emocional. Para un narrador expresivo, el candidato abierto a probar es
  Chatterbox `es-mx-latam` (MIT).
