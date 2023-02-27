import React from "react";

export type AxisName = "x" | "y" | "z";
export type PerAxis<T> = Record<AxisName, T>;

export type IsosurfaceFormat = "GLTF" | "STL";

export type Styles = { [key: string]: React.CSSProperties };
