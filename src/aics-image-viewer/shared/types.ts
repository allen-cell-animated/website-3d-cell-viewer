import React from "react";

export type AxisName = "x" | "y" | "z";

export type IsosurfaceFormat = "GLTF" | "STL";

export type Styles = { [key: string]: React.CSSProperties };

export type MetadataEntry = string | number | boolean | null | MetadataRecord;
export type MetadataRecord = { [key: string]: MetadataEntry };

export interface MetadataFormat {
  unit?: string;
  tooltip?: string;
  displayName?: string;
}
export type MetadataFormatRecord = { [key: string]: MetadataFormat | MetadataFormatRecord };
