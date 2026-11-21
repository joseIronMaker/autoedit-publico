"""La base de datos: las partidas sobreviven al cierre del programa.

Un archivo .db no es un JSON: aqui se GUARDA con INSERT y se PREGUNTA con SELECT,
y la pregunta la responde la base, no un for.
"""
import sqlite3

DB = "juego.db"

con = sqlite3.connect(DB)          # si el archivo no existe, lo crea
con.execute("CREATE TABLE IF NOT EXISTS partidas(jugador TEXT, intentos INT)")

# la clase siempre empieza limpia, para que la consulta de abajo de lo mismo
con.execute("DELETE FROM partidas")

partidas = [("Ana", 4), ("Luis", 7), ("Jose", 3), ("Sofia", 5), ("Ana", 2)]
con.executemany("INSERT INTO partidas VALUES (?,?)", partidas)
con.commit()                       # sin commit, lo guardado se pierde

total = con.execute("SELECT COUNT(*) FROM partidas").fetchone()[0]
print(f"guardadas {total} partidas en {DB}")

# menos intentos = mejor partida: ordenar y quedarse con las 2 primeras
mejores = con.execute(
    "SELECT jugador, intentos FROM partidas ORDER BY intentos LIMIT 2"
).fetchall()

print("\nlas 2 mejores:")
for puesto, (jugador, intentos) in enumerate(mejores, start=1):
    veces = "intento" if intentos == 1 else "intentos"
    print(f"  {puesto}. {jugador}: {intentos} {veces}")

con.close()
