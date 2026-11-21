#!/usr/bin/env bash
# Repositorio de juguete para las clases de git: tres "fotos" del juego, siempre igual.
set -e; R="$HOME/curso_git"; rm -rf "$R"; mkdir -p "$R"; cd "$R"
git init -q -b main; git config user.name "José"; git config user.email "jose@ejemplo.com"
printf 'print("hola")\n' > juego.py; git add .; git commit -q -m "primer programa"
printf 'import random\nsecreto = random.randint(1, 20)\nprint("adivina")\n' > juego.py; git add .; git commit -q -m "el juego elige un número"
printf 'import random\nsecreto = random.randint(1, 20)\nintentos = 0\nprint("adivina")\n' > juego.py
printf '__pycache__/\n*.db\n.env\n' > .gitignore; git add .; git commit -q -m "contador de intentos y gitignore"
printf 'import random\nsecreto = random.randint(1, 20)\nintentos = 0\nprint("adivina el número del 1 al 20")\n' > juego.py   # cambio SIN commit
