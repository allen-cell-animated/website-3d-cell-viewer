import { CSSProperties } from "react";
import { ViewMode } from "./enums";

export type AxisName = "x" | "y" | "z";
export type PerAxis<T> = Record<AxisName, T>;
export const activeAxisMap: { [A in ViewMode]: AxisName | null } = {
  [ViewMode.yz]: "x",
  [ViewMode.xz]: "y",
  [ViewMode.xy]: "z",
  [ViewMode.threeD]: null,
};

export type IsosurfaceFormat = "GLTF" | "STL";

export type Styles = { [key: string]: CSSProperties };
