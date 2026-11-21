import React from "react";
import { Composition } from "remotion";
import { DURACION, Perro } from "./perro/Perro";

export const Root: React.FC = () => (
  <Composition id="Perro" component={Perro} width={1080} height={1920} fps={30} durationInFrames={Math.ceil(DURACION * 30)} />
);
