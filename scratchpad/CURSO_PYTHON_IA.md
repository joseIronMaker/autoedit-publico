# Curso: Programación básica con IA — Python (TikTok)

**Formato**: 24 clases verticales de 2:00–3:30, publicadas como serie en TikTok.
**Herramientas**: Claude Code y Codex CLI. **Lenguaje**: Python. **Nada de web.**
**Proyectos que el alumno termina**: un juego de terminal, un juego con ventana,
una app de escritorio con datos guardados, y una app que consume una API real.

## Por qué NO se parece al de Platzi

El de ellos es web (HTML/CSS/JS + Vercel), en clases de 5–13 min, con sus ejemplos y su
marca. Este es Python, en piezas de 2–3 min, con proyectos distintos (juegos, escritorio,
APIs), guion propio, ejemplos propios y los recursos visuales del canal. Se enseñan los
mismos CONCEPTOS —que no son de nadie— con expresión propia.

## Arco: qué sabe hacer el alumno al final de cada módulo

| Módulo | Al terminar, el alumno… | Clases |
|---|---|---|
| 1. Dirigir la máquina | corre su primer programa y sabe qué hace cada herramienta | 4 |
| 2. El vocabulario mínimo | lee código ajeno y sabe qué hace cada línea | 6 |
| 3. Tu primer juego | tiene dos juegos suyos, uno con ventana | 4 |
| 4. Una app de escritorio | tiene una app con botones que guarda datos | 4 |
| 5. Conectar con el mundo | su app trae datos de internet | 4 |
| 6. No perder el trabajo | sabe leer un error y versionar su código | 2 |

## Temario

### Módulo 1 — Dirigir la máquina
1. **Tu primer programa de Python en dos minutos** · 2:00 — qué es un programa, cómo se
   ejecuta, y la primera orden corriendo en pantalla.
2. **Qué es Python y por qué se aprende primero** · 2:30 — lenguaje interpretado, para qué
   sirve de verdad (datos, automatización, juegos), qué NO es.
3. **Instala Python y abre tu terminal** · 3:00 — instalación real en Windows, la terminal
   sin misterio, `python --version`, el primer archivo `.py`.
4. **Claude Code y Codex: qué hace cada uno** · 2:30 — agente en tu terminal vs. agente que
   edita tu proyecto; cuándo usar cuál; qué NO hay que dejarles decidir.

### Módulo 2 — El vocabulario mínimo
5. **Variables: cajas con nombre** · 2:00
6. **Tipos de datos: número, texto, verdadero o falso** · 2:30 — y por qué `"2" + "2"` da 22.
7. **`print()` e `input()`: tu programa te habla y te escucha** · 2:00
8. **`if` / `else`: cómo decide tu código** · 2:30
9. **Bucles `for` y `while`: repetir sin copiar y pegar** · 2:30
10. **Funciones: ponerle nombre a un pedazo de trabajo** · 2:30

### Módulo 3 — Tu primer juego
11. **Adivina el número: tu primer juego completo** · 3:00 — el alumno lo pide, lo lee y lo
    corrige; la IA teclea, él decide.
12. **Listas y diccionarios: guardar muchas cosas** · 2:30
13. **Piedra, papel o tijera con reglas de verdad** · 3:00 — aleatoriedad, marcador, empates.
14. **Un juego con ventana: pygame en tres minutos** · 3:30 — ventana, dibujo, teclado.

### Módulo 4 — Una app de escritorio
15. **Qué es una app de escritorio (y por qué tkinter)** · 2:00
16. **Tu primera ventana con botones** · 3:00
17. **Guardar datos: archivos y JSON** · 3:00 — que la app recuerde al cerrarla.
18. **Convertir tu app en un `.exe` para regalarla** · 2:30

### Módulo 5 — Conectar con el mundo
19. **Qué es una API y por qué todo la usa** · 2:30
20. **Tu primera petición con `requests`** · 2:30
21. **Leer JSON y sacar solo lo que te importa** · 3:00
22. **App del clima: API + ventana, funcionando** · 3:30 — el proyecto final.

### Módulo 6 — No perder el trabajo
23. **Leer un error sin miedo: el traceback** · 2:30
24. **Depurar el código que escribió la IA** · 3:00 — el hábito que separa a quien dirige
    de quien copia.

## Formato de cada clase

- **Voz**: clon de ElevenLabs `YjGzFI8kOmWe2VYw17Zx`, `speed 0.80` (≈150 ppm, el ritmo del
  referente). Toma única por clase.
- **Estructura fija de 2–3 min**: gancho (5 s, la pregunta que el alumno tiene) → DEFINE la
  cosa → MECANISMO en verbos de proceso → se ve corriendo de verdad → el error típico →
  cierre con la pregunta de la siguiente clase (CTA implícito).
- **Visual**: la mascota del canal como profesora (`branding/mascota/profesor.png`), recortes
  y fotos editoriales de Codex ($0), diagramas Remotion, y **pantalla REAL** cada vez que se
  vea Python, Claude Code o Codex corriendo — grabada, nunca dibujada.
- **Español MEXICANO** en el guion: *computadora*, *checar*, *se te queda*, *ahorita*;
  nunca *ordenador*, *vale* ni *vosotros*. El acento lo pone la voz, el registro lo pone el texto.
- **Subtítulos**: palabra a palabra, grandes y centrados, como el referente.
- **Música**: cama hard techno del canal, bajo la voz a 0.45.
- **Continuidad**: cada clase abre con una frase de una línea que enlaza con la anterior.

## Cómo se produce

1. Las clases de CONCEPTO salen del pipeline generativo (`autoedit-gen`) con la voz nueva.
2. Las clases con DEMO usan grabación real de pantalla de José (obs), montada con el
   pipeline de grabados; la narración va con la misma voz clonada, escrita DESPUÉS de mirar
   los frames.
3. Se produce por módulos, no de golpe: módulo 1 completo → revisión → siguiente.
