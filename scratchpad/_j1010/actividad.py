"""Actividad de la PANTALLA por keyframe (y 213..825): dónde cambia algo aunque José calle."""
import json, subprocess, numpy as np
W, H = 136, 77
p = subprocess.run(["ffmpeg", "-v", "info", "-skip_frame", "nokey", "-i", "fuente.mp4",
                    "-vf", f"crop=1080:612:0:213,scale={W}:{H},format=gray,showinfo",
                    "-vsync", "0", "-f", "rawvideo", "-"], capture_output=True)
a = np.frombuffer(p.stdout, np.uint8).astype(np.float32)
n = len(a) // (W * H); a = a[: n * W * H].reshape(n, H, W)
import re
ts = [float(m) for m in re.findall(r"pts_time:([\d.]+)", p.stderr.decode())][:n]
d = [0.0] + [float(np.abs(a[i] - a[i - 1]).mean()) for i in range(1, n)]
json.dump({"t": ts, "diff": d}, open("actividad.json", "w"))
print(n, "keyframes", ts[:5], ts[-1])
