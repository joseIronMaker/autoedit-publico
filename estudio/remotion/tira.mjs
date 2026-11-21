// Renderiza cuadros sueltos sin hacer el video: node tira.mjs <Comp> <salida.jpg> <cols> t1 t2 t3...
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const [comp, salida, cols, ...tiempos] = process.argv.slice(2);
// ENTRADA=src/serie/c01/index.ts node tira.mjs ... : cada capítulo se compila solo, y uno a medias no rompe a otro.
const serveUrl = await bundle({ entryPoint: path.resolve(process.env.ENTRADA ?? "src/index.ts") });
const browser = await openBrowser("chrome", { browserExecutable: "/usr/bin/google-chrome", chromiumOptions: {} });
const composition = await selectComposition({ serveUrl, id: comp, puppeteerInstance: browser });
const dir = fs.mkdtempSync("/tmp/tira_");
const ini = Date.now();
let i = 0;
for (const t of tiempos) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(Number(t) * composition.fps));
  await renderStill({ composition, serveUrl, frame, output: `${dir}/f${String(i++).padStart(3, "0")}.jpg`, imageFormat: "jpeg", jpegQuality: 88, puppeteerInstance: browser });
}
await browser.close({ silent: true });
console.log(`${tiempos.length} cuadros, ${((Date.now() - ini) / tiempos.length / 1000).toFixed(2)} s/cuadro`);
const filas = Math.ceil(tiempos.length / Number(cols));
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", "1", "-i", `${dir}/f%03d.jpg`, "-vf", `scale=266:-2,drawbox=x=0:y=0:w=iw:h=ih:color=gray@0.35:t=1,tile=${cols}x${filas}:padding=3:color=0x777777`, "-frames:v", "1", salida]);
fs.rmSync(dir, { recursive: true });
