import React from "react";

export type AxisName = "x" | "y" | "z";

export type IsosurfaceFormat = "GLTF" | "STL";

export type Styles = { [key: string]: React.CSSProperties };

export type MetadataEntry = string | number | boolean | MetadataRecord;
export type MetadataRecord = { [key: string]: MetadataEntry };
