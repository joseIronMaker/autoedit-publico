---
description: Crea una SERIE con el método `estudio/`: temario, guiones de una sola voz, biblia visual y un capítulo escrito a mano por cada idea.
argument-hint: <tema de la serie> [nº de capítulos]
---
Diseña y produce una serie sobre: **$ARGUMENTS**. El número de capítulos lo decide el tema, salvo que José lo fije.

El modelo es `estudio/serie/`, que produjo «Cómo aprende una máquina»:

1. **Tú escribes todos los guiones** en un solo archivo (`guiones.py`): una sola voz y el rigor revisado contra la
   fuente. Cada capítulo con idea propia, giro y frase final cerrada, más su copy.
2. **Biblia** (`biblia.md`): lo que une a la serie, y una imagen central distinta para cada capítulo.
3. **Voces y música en lote**, escuchadas con Gemini antes de animar. Regrabar después obliga a rehacer la sincronía.
   Lyria mete voces aunque se le prohíba: cada pista se comprueba.
4. **Un capítulo tuyo primero** para validar la base. Después reparte con `encargo.md`, tres agentes a la vez como máximo.
5. **Mira cada resultado.** Ningún capítulo se da por bueno solo por pasar `kit_termina.sh`.
6. **Publica** solo con la orden de José: `sube_serie.sh`, en orden, con el patrón de 19:00 y 20:00.
