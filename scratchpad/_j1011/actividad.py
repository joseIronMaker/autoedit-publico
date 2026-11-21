"""Actividad por keyframe de la PANTALLA (y 213..825) y de la CARA (y 1022..1920):
dónde cambia algo aunque José calle, y cuándo la silla está vacía."""
import json, re, subprocess, numpy as np
W, HS, HC = 136, 77, 113
p = subprocess.run(["ffmpeg", "-v", "info", "-skip_frame", "nokey", "-i", "fuente.mp4",
                    "-filter_complex",
                    f"[0:v]showinfo,split[a][b];[a]crop=1080:612:0:213,scale={W}:{HS},format=gray[s];"
                    f"[b]crop=1080:898:0:1022,scale={W}:{HC},format=gray[c];[s][c]vstack",
                    "-vsync", "0", "-f", "rawvideo", "-"], capture_output=True)
H = HS + HC
a = np.frombuffer(p.stdout, np.uint8).astype(np.float32)
n = len(a) // (W * H); a = a[: n * W * H].reshape(n, H, W)
ts = [float(m) for m in re.findall(r"pts_time:([\d.]+)", p.stderr.decode())][:n]
s, c = a[:, :HS], a[:, HS:]
ds = [0.0] + [float(np.abs(s[i] - s[i - 1]).mean()) for i in range(1, n)]
dc = [0.0] + [float(np.abs(c[i] - c[i - 1]).mean()) for i in range(1, n)]
json.dump({"t": ts, "diff": ds, "cara": dc}, open("actividad.json", "w"))
np.save("cara_kf.npy", c.astype(np.uint8))
print(n, "keyframes", ts[:3], ts[-1])
