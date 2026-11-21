"""Graba una TERMINAL REAL de Windows corriendo comandos reales dentro de WSL.

Por qué así y no con una animación: el curso enseña Claude Code, Python y vim, y la regla
del canal dice que una herramienta real se muestra con material real. La tarjeta de
terminal dibujada (typewriter de Remotion) es una recreación: el texto era verdadero pero
la terminal no existía.

Por qué no se graba desde WSL: no hay emulador de terminal instalado y `x11grab` sobre el
`:0` de WSLg sale NEGRO — cada ventana WSLg se compone del lado de Windows y el root X está
vacío. El único camino es el puente que ya se usa para Chrome: PowerShell.

Cuatro trampas, todas pagadas el 31-ago-2026:
  1. La directiva de grupo es AllSigned → todo va por `-EncodedCommand`.
  2. `wt.exe` trata el `;` como separador de PESTAÑAS y se come comillas y paréntesis: el
     comando se escribe en un .sh y la terminal corre `bash ese-archivo`.
  3. La ventana NO se puede identificar por título: `--title` y la secuencia de escape se
     ignoran (el perfil trae suppressApplicationTitle), así que todas se llaman igual que
     la de José. Se identifica por POSICIÓN — la del SEGUNDO MONITOR es la mía.
  4. `PrintWindow` devuelve negro con Windows Terminal (se dibuja por GPU), así que se
     copia la región de pantalla: por eso el segundo monitor tiene que estar libre.

    .venv/bin/python scratchpad/graba_terminal.py salida.mp4 --cmd "python3 hola.py" --seg 12
"""
import argparse
import base64
import shutil
import subprocess
import tempfile
import time
from pathlib import Path

DISTRO = "Ubuntu-24.04"
CAP_WIN = r"C:\autoedit-cap"
CAP_WSL = Path("/mnt/c/autoedit-cap")
POS = (1935, 15)        # segundo monitor (1920,0 · 1280x720)
MONITOR2_X = 1920

_TIPOS = '''
Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices; using System.Text;
public struct RECT { public int L, T, R, B; }
public class W {
  public delegate bool Cb(IntPtr h, IntPtr p);
  [DllImport("user32.dll")] public static extern bool EnumWindows(Cb c, IntPtr p);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr a, int x, int y, int cx, int cy, uint f);
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr c);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr h, int a, out RECT r, int s);
}
"@
'''

BUSCA = _TIPOS + f'''
[void][W]::SetThreadDpiAwarenessContext([IntPtr]::new(-4))
$hit = [IntPtr]::Zero; $rr = New-Object RECT
$cb = [W+Cb]{{ param($h,$p)
  if ([W]::IsWindowVisible($h)) {{
    $sb = New-Object System.Text.StringBuilder 256
    [void][W]::GetWindowText($h, $sb, 256)
    $r = New-Object RECT
    [void][W]::GetWindowRect($h, [ref]$r)
    if ($r.L -ge {MONITOR2_X} -and ($r.R - $r.L) -gt 300 -and ($r.B - $r.T) -gt 200 -and $sb.ToString() -ne "Program Manager") {{ $script:hit = $h; $script:rr = $r; return $false }}
  }}
  return $true
}}
[void][W]::EnumWindows($cb, [IntPtr]::Zero)
if ($hit -eq [IntPtr]::Zero) {{ Write-Output "SIN VENTANA"; exit 0 }}
[void][W]::SetWindowPos($hit, [IntPtr]::new(-1), 0, 0, 0, 0, 0x0013)
Write-Output ("{{0}} {{1}} {{2}} {{3}}" -f $rr.L, $rr.T, ($rr.R - $rr.L), ($rr.B - $rr.T))
'''

MINIMIZA_CHROME = _TIPOS + '''
[void][W]::SetThreadDpiAwarenessContext([IntPtr]::new(-4))
$n = 0
$cb = [W+Cb]{ param($h,$p)
  if ([W]::IsWindowVisible($h)) {
    $sb = New-Object System.Text.StringBuilder 256
    [void][W]::GetWindowText($h, $sb, 256)
    $t = $sb.ToString()
    if ($t -like "*Chrome*" -or $t -like "*TikTok*" -or $t -like "*ElevenLabs*") { [void][W]::ShowWindow($h, 6); $script:n++ }
  }
  return $true
}
[void][W]::EnumWindows($cb, [IntPtr]::Zero)
Write-Output ("chrome minimizados: " + $n)
'''

BUSCA_TITULO = _TIPOS + '''
[void][W]::SetThreadDpiAwarenessContext([IntPtr]::new(-4))
$hit = [IntPtr]::Zero; $rr = New-Object RECT
$cb = [W+Cb]{ param($h,$p)
  if ([W]::IsWindowVisible($h)) {
    $sb = New-Object System.Text.StringBuilder 256
    [void][W]::GetWindowText($h, $sb, 256)
    $t = $sb.ToString()
    $r = New-Object RECT
    [void][W]::GetWindowRect($h, [ref]$r)
    if ($t -like "*__TITULO__*" -and ($r.R - $r.L) -gt 150 -and ($r.B - $r.T) -gt 100) {
      $script:hit = $h; $script:rr = $r; return $false
    }
  }
  return $true
}
[void][W]::EnumWindows($cb, [IntPtr]::Zero)
if ($hit -eq [IntPtr]::Zero) { Write-Output "SIN VENTANA"; exit 0 }
[void][W]::SetWindowPos($hit, [IntPtr]::new(-1), 0, 0, 0, 0, 0x0013)
# GetWindowRect incluye el borde invisible de redimensionar (y con WSLg son ~35 px por la
# derecha): por ahí se colaba un trozo del escritorio de José. DWMWA_EXTENDED_FRAME_BOUNDS
# (9) devuelve el marco que de verdad se ve.
$fr = New-Object RECT
if ([W]::DwmGetWindowAttribute($hit, 9, [ref]$fr, 16) -eq 0 -and ($fr.R - $fr.L) -gt 100) {
  $rr = $fr
}
Write-Output ("{0} {1} {2} {3}" -f $rr.L, $rr.T, ($rr.R - $rr.L), ($rr.B - $rr.T))
'''

CIERRA = _TIPOS + f'''
[void][W]::SetThreadDpiAwarenessContext([IntPtr]::new(-4))
$cb = [W+Cb]{{ param($h,$p)
  if ([W]::IsWindowVisible($h)) {{
    $sb = New-Object System.Text.StringBuilder 256
    [void][W]::GetWindowText($h, $sb, 256)
    $r = New-Object RECT
    [void][W]::GetWindowRect($h, [ref]$r)
    if ($r.L -ge {MONITOR2_X} -and ($r.R - $r.L) -gt 300 -and ($r.B - $r.T) -gt 200 -and $sb.ToString() -ne "Program Manager") {{ [void][W]::SendMessage($h, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) }}
  }}
  return $true
}}
[void][W]::EnumWindows($cb, [IntPtr]::Zero)
Write-Output limpio
'''


def ps(script: str, timeout: int = 600) -> str:
    enc = base64.b64encode(script.encode("utf-16-le")).decode("ascii")
    r = subprocess.run(["powershell.exe", "-NoProfile", "-NonInteractive",
                        "-EncodedCommand", enc], capture_output=True, timeout=timeout)
    if r.returncode != 0:
        raise SystemExit(f"powershell falló: {r.stderr.decode('utf-8', 'replace')[:300]}")
    return r.stdout.decode("utf-8", "replace")


def main() -> None:
    # UNA grabación de pantalla a la vez: el CIERRA de una cerraría la terminal de la otra
    # (la corrección de la clase 12 y las capturas de la 13 podían coincidir)
    import fcntl
    _lock = open("/tmp/pantalla.lock", "w")
    fcntl.flock(_lock, fcntl.LOCK_EX)
    ap = argparse.ArgumentParser()
    ap.add_argument("salida")
    ap.add_argument("--cmd", required=True, help="comando bash a correr DENTRO de WSL")
    ap.add_argument("--cwd", default="/home/jose/tiktok")
    ap.add_argument("--seg", type=float, default=14.0)
    ap.add_argument("--fps", type=int, default=5)
    ap.add_argument("--titulo", default=None,
                    help="grabar la ventana cuyo título contenga esto (apps con GUI)")
    ap.add_argument("--cols", type=int, default=46)   # 72 no se lee en un celular
    ap.add_argument("--filas", type=int, default=30)
    ap.add_argument("--region", action="store_true",
                    help="graba TODO el segundo monitor en vez de la ventana de la terminal: "
                         "para apps con ventana propia (tkinter, pygame), que se colocan ahí "
                         "con sus coordenadas absolutas")
    a = ap.parse_args()

    sesion = f"s{int(time.time())}"
    (CAP_WSL / sesion).mkdir(parents=True, exist_ok=True)
    # el guion de la captura NO va en el cwd de la lección: Claude lo leía y lo comentaba
    guion_sh = Path(tempfile.gettempdir()) / f"_cap_{sesion}.sh"
    # la espera final cubre TODA la grabación: si el comando termina antes, la ventana se
    # cerraba a media captura y la cola quedaba en negro — y como la escena se compone con
    # la cola del video, salían terminales vacías (clase 1, 31-ago-2026)
    if a.titulo:
        # La ventana de WSLg nace ENCIMA de la terminal que la lanzó y no se deja mover ni
        # traer al frente (la pinta el compositor de WSLg, no Windows). Lo que SÍ funciona:
        # soltar la app con setsid y dejar que la terminal se cierre — la ventana se queda
        # sola en el segundo monitor y ahí CopyFromScreen la captura perfectamente.
        guion_sh.write_text("#!/usr/bin/env bash\n"
                            f"cd {a.cwd}\nclear\n"
                            f"setsid {a.cmd} > /dev/null 2>&1 &\nsleep 0.5\n",
                            encoding="utf-8")
    else:
        guion_sh.write_text("#!/usr/bin/env bash\n"
                            f"cd {a.cwd}\nclear\nsleep 1.2\n{a.cmd}\n"
                            # el bucle de captura tarda MÁS que su propio reloj (guardar
                            # cada PNG cuesta milisegundos de más): con `seg + 6` la
                            # terminal se cerraba antes de acabar la grabación y los
                            # últimos segundos salían con el ESCRITORIO de Windows y su
                            # barra de tareas — 35 escenas de 75 así. La cierra igual el
                            # CIERRA de la escena siguiente, así que sobra margen.
                            f"sleep {a.seg * 2 + 30:.0f}\n", encoding="utf-8")

    ps(CIERRA, timeout=90)          # ninguna terminal vieja en el segundo monitor
    time.sleep(0.8)
    args = ",".join(f'"{x}"' for x in [
        "-w", "new", "--pos", f"{POS[0]},{POS[1]}", "--size", f"{a.cols},{a.filas}",
        # `bash -lc "bash archivo"` NO sirve: wt parte el argumento en el espacio y bash
        # acaba abriendo una shell interactiva (se grababa un prompt vacío). El archivo va
        # como argumento suelto.
        "wsl.exe", "-d", DISTRO, "--", "bash", "-l", str(guion_sh)])
    ps(f'Start-Process -FilePath "wt.exe" -ArgumentList @({args})\nWrite-Output ok', timeout=90)

    if a.titulo:
        # el Chrome del puente a TikTok se queda ABIERTO tras subir y quedaba detrás de la
        # ventana del juego/app (clases 15 y 16: se veía TikTok Studio por los bordes).
        # Se minimiza cualquier Chrome antes de buscar la ventana.
        print("   " + ps(MINIMIZA_CHROME, timeout=90).strip().splitlines()[-1], flush=True)
        # WSLg no obedece SDL_VIDEO_WINDOW_POS: la ventana del juego aparece donde el
        # compositor quiere y tarda en salir. Se la busca POR TÍTULO y se graba SU
        # rectángulo — así no sale el escritorio ni la barra de tareas.
        rect = "SIN VENTANA"
        # el ejecutable de PyInstaller tarda en arrancar la primera vez (se descomprime
        # solo): hasta 60 s esperando la ventana
        for intento in range(60):
            time.sleep(1.0)
            rect = ps(BUSCA_TITULO.replace("__TITULO__", a.titulo),
                      timeout=90).strip().splitlines()[-1]
            if "SIN VENTANA" not in rect:
                time.sleep(0.8)
                break
        if "SIN VENTANA" in rect:
            raise SystemExit(f"la ventana '{a.titulo}' nunca apareció")
        x, y, w, h = (int(v) for v in rect.split())
        # WSLg devuelve el rectángulo CON el borde invisible de redimensionar, que suele
        # ser negativo: recortarlo evita grabar escritorio que no es de la ventana
        if x < 0:
            w += x; x = 0
        if y < 0:
            h += y; y = 0
        # el rectángulo de una ventana de WSLg trae la SOMBRA alrededor, y por ahí se
        # colaba lo que hubiera detrás — una vez, el TikTok Studio de José con el número
        # de publicaciones a la vista. Se recorta con margen medido sobre los frames.
        x, y, w, h = x + 14, y + 12, w - 30, h - 44
        print(f"   ventana '{a.titulo}' {w}x{h} en ({x},{y})", flush=True)
    elif a.region:
        x, y, w, h = 1920, 0, 1920, 1080   # el segundo monitor en píxeles FÍSICOS
        print(f"   región completa {w}x{h} en ({x},{y})", flush=True)
    else:
        rect = "SIN VENTANA"
        for _ in range(8):
            time.sleep(1.0)
            rect = ps(BUSCA, timeout=90).strip().splitlines()[-1]
            if "SIN VENTANA" not in rect:
                break
        if "SIN VENTANA" in rect:
            raise SystemExit("no hay terminal en el segundo monitor (¿está libre?)")
        x, y, w, h = (int(v) for v in rect.split())
        x, y, w, h = x + 8, y + 1, w - 16, h - 9  # los bordes redondeados dejan escritorio
        print(f"   ventana {w}x{h} en ({x},{y})", flush=True)

    n = int(a.seg * a.fps)
    espera = int(1000 / a.fps)      # PowerShell en español usa coma decimal: enteros de ms
    bucle = _TIPOS + f'''
[void][W]::SetThreadDpiAwarenessContext([IntPtr]::new(-4))
Add-Type -AssemblyName System.Windows.Forms,System.Drawing
$dir = "{CAP_WIN}\\{sesion}"
$bmp = New-Object System.Drawing.Bitmap {w}, {h}
$g = [System.Drawing.Graphics]::FromImage($bmp)
for ($i = 0; $i -lt {n}; $i++) {{
  $g.CopyFromScreen({x}, {y}, 0, 0, $bmp.Size)
  $bmp.Save(("$dir\\{{0:D4}}.png" -f $i))
  Start-Sleep -Milliseconds {espera}
}}
Write-Output "cuadros {n}"
'''
    print("   " + ps(bucle, timeout=int(a.seg) + 240).strip().splitlines()[-1], flush=True)
    try:
        ps(CIERRA, timeout=90)
    except Exception as e:
        print(f"   (no pude cerrar la ventana: {str(e)[:60]})", flush=True)
    guion_sh.unlink(missing_ok=True)

    cuadros = sorted((CAP_WSL / sesion).glob("*.png"))
    if len(cuadros) < 4:
        raise SystemExit(f"solo {len(cuadros)} cuadros: la captura no salió")
    # una captura NEGRA es el fallo mudo: se ve como éxito y no lo es
    from PIL import Image, ImageStat
    luz = max(ImageStat.Stat(Image.open(c).convert("L")).mean[0] for c in cuadros[::5])
    if luz < 4:
        raise SystemExit("la captura salió NEGRA (¿la ventana se abrió detrás de algo?)")

    salida = Path(a.salida)
    salida.parent.mkdir(parents=True, exist_ok=True)
    w0, h0 = Image.open(cuadros[0]).size
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(a.fps),
                    "-i", str(CAP_WSL / sesion / "%04d.png"),
                    "-vf", f"crop={w0 - w0 % 2}:{h0 - h0 % 2}:0:0",
                    "-r", "30", "-c:v", "libx264", "-crf", "18", "-preset", "medium",
                    "-pix_fmt", "yuv420p", str(salida)], check=True)
    shutil.rmtree(CAP_WSL / sesion, ignore_errors=True)
    print(f"✔ {salida.name}  {len(cuadros)} cuadros", flush=True)


if __name__ == "__main__":
    main()
