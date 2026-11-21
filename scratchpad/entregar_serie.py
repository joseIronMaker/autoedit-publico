"""Entrega la serie a Descargas de Windows: mp4 + copy de TikTok en texto plano."""
import json
import shutil
from pathlib import Path

DEST = Path("/mnt/c/Users/USUARIO/Downloads")
MAPA = [
    ("gen_dl_neurona_recta", "dl1_neurona_recta"),
    ("gen_dl_activacion_no_basta", "dl2_activacion"),
    ("gen_dl_apilar_curvas", "dl3_apilar_curvas"),
    ("gen_dl_loss_error", "dl4_loss"),
    ("gen_dl_gradient_descent", "dl5_gradient_descent"),
    ("gen_dl_backpropagation", "dl6_backpropagation"),
    ("gen_dl_learning_rate", "dl7_learning_rate"),
    ("gen_dl_overfitting", "dl8_overfitting"),
]
# sobras de versiones anteriores que ya no corresponden a la numeración de la serie
OBSOLETOS = ["dl2_perceptron.mp4", "dl3_activacion.mp4"]

for stem, name in MAPA:
    final = Path("videos") / f"{stem}_final.mp4"
    if not final.exists():
        print(f"FALTA {final}")
        continue
    shutil.copy2(final, DEST / f"{name}.mp4")
    copys = json.loads((Path("videos") / f"{stem}.autoedit" / "copys.json").read_text())
    n = name.split("_")[0]
    (DEST / f"{n}_copy_tiktok.txt").write_text(copys["tiktok"].strip() + "\n",
                                               encoding="utf-8")
    print(f"{name}.mp4 + {n}_copy_tiktok.txt")

for o in OBSOLETOS:
    p = DEST / o
    if p.exists():
        p.unlink()
        print(f"borrado obsoleto: {o}")
