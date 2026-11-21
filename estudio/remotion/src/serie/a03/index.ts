import React from "react";
import { Composition, registerRoot } from "remotion";
import { DURACION, Pieza } from "./Pieza";

const Raiz: React.FC = () => React.createElement(Composition, { id: "A03", component: Pieza, width: 1080, height: 1920, fps: 30, durationInFrames: Math.ceil(DURACION * 30) });
registerRoot(Raiz);
