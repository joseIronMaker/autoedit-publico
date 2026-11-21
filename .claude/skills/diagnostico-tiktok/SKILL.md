---
name: diagnostico-tiktok
description: Diagnostica por qué el canal de TikTok de José no crece. Abre TikTok Studio con el navegador MCP, lee vistas y FUENTES DE TRÁFICO por video, y aplica el árbol de decisión 2026 (cold-start vs shadowban vs "AI slop"). Úsala cuando José pregunte por qué un video o el canal fracasó, o para revisar métricas reales antes de cambiar la estrategia.
---

# Diagnóstico del canal de TikTok

## Leer las métricas reales (navegador MCP)
Requiere Chrome con puerto 9222 y sesión de TikTok en `~/.autoedit-chrome`.
1. `https://www.tiktok.com/tiktokstudio/content` — lista de posts (vistas/likes/comentarios por
   video; "Public" habilitado = en vivo, deshabilitado = programado).
2. `https://www.tiktok.com/tiktokstudio/analytics/overview` — agregado 7/28 días y, lo más
   importante, **Fuente de tráfico** (Para ti / Perfil personal / Búsqueda / Sonido).
3. Video individual: `.../tiktokstudio/analytics/video/<id>` (a veces redirige al home; entra
   por la lista de contenido).

**Ojo:** `take_snapshot` de estas páginas se pasa de tokens. Usa `evaluate_script` para extraer
SOLO lo que necesitas (regex a elementos específicos, no todo el DOM).

## Árbol de decisión 2026 — la señal clave es % desde "Para ti" (FYP)
| Lo que ves | Diagnóstico | Acción |
|---|---|---|
| FYP 70-95% | Sano | Es tema/retención, no distribución |
| FYP ~20-30% + resto de "Perfil personal", en varios videos | **Cold-start** (cuenta nueva, lote de prueba diminuto que no retiene). NO es ban | Mejorar retención + calentar cuenta |
| FYP = 0% en varios videos | Posible shadowban / inelegibilidad | Revisar "Estado de la cuenta" (app) y avisos "no elegible para Para ti"; apelar |
| ~1 vista literal | Revisión/procesamiento, cuenta privada, o supresión total (a veces es tu propia vista) | Esperar / revisar privacidad y estado |
| 200-500 y se estanca | Normal en cuenta nueva | El problema es retención, no ban |

## Benchmarks y funnel (jul-2026)
**Regla de José 120/120**: >120 likes en 120 min = éxito; 2h sin ~1 like/min = muerto (para
cuenta chica, úsala como aspiración; el checkpoint real de 24h es retención + engagement).
**Benchmarks 2026**: retención media 40%+ (video 30-60s) / 50%+ (<30s); caída >30% en los
primeros 3s = hook fallido; finalización ≈70% = umbral de push viral; ~35% completion +
engagement ≥1.5% de viewers → pool de 5-10k; replay rate >1.2 = excepcional; ER TikTok sano
2.5-8% (marca personal exitosa >7%).
**Funnel de diagnóstico (Módulo 10)**: bajo alcance → horarios/tendencias · interacción <1% →
CTA/preguntas/storytelling · muchas visitas y pocos follows → bio y perfil · tráfico sin
conversión → CTA del caption.
**Marca personal — éxito**: crecimiento orgánico + ER >7% (superior a la media del nicho) +
seguidores ALINEADOS con el nicho. **Fracaso**: audiencia falsa (alto % de bots entre
seguidores) y estancamiento (views/engagement planos o en caída constante).
**Cómo leer métricas (M10)**: contextualiza SIEMPRE antes de interpretar; los promedios
ocultan — busca la distribución completa; combina cuantitativo (Studio) + cualitativo
(comentarios, quién comparte). **Reporte mensual**: rendimiento vs mes anterior + top 3
contenidos por métrica objetivo + embudo hasta acción final; cada insight con próximo paso.
**Dónde mirar en Studio por video**: avg watch time, watched full video, el segundo exacto de
la caída ("Most viewers stopped watching at X"), fuente de tráfico, new followers, y demografía
(Viewers). SIEMPRE volcar los números a `experiments.jsonl` (campo `resultados`) — es el bucle
de análisis §7 del plan.

## Baseline medido del canal (para comparar los siguientes)
Video 1 (`gen_dos_tipos_de_ia`, 19-jul-2026, 24h): 187 views · FYP 83.8% (distribución SANA,
no ban) · 6 likes (3.2%) · 0 comments/shares/saves · avg watch 8.92s/35s (25%) · full 3.8% ·
caída masiva en 0:02 (hook host) · 1 follower · push murió a la hora 5. Audiencia: México
95.8%, 66% hombres, 71% de 25-44. → Diagnóstico: distribución OK; el cuello es el SEGUNDO 2
(por eso la regla cold-open) y la ausencia de señales sociales (comentarios).

## Causas raíz que YA vimos (la semana 1 fracasó: ~11 vistas/video, FYP 24%)
1. Contenido 100% IA (foto-IA + voz TTS) = "input mínimo" → **NO elegible para "Para ti"**
   (política oficial de TikTok). Fix: demo real (skill `grabar-demo`), menos foto-IA.
2. Voz TTS robótica **baja la retención** (retención = señal #1 del algoritmo). Fix: voz natural
   (skill `voz-tts`).
3. Subir por **automatización de navegador en LOTE** = comportamiento inauténtico (riesgo ToS).
   Fix: subir nativo desde el celular, 1-2/día, presente la 1ª hora.

## Mitos descartados con fuente oficial (no perder tiempo ahí)
- La etiqueta **"Made with AI" NO baja alcance** (ocultarla sí, hasta −73%). Mantenerla.
- **Programar NO penaliza** (los programados hasta rinden más). Lo que penaliza es la
  automatización de navegador, no el schedule.

Datos completos y fuentes: memoria `canal-fracaso-semana1-rediseno`. Ver también skill
`formato-viral-2026` para la solución.
