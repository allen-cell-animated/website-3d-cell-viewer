import { RenderConfig, UserSelectionState } from "./types";

interface View3dInternalState {
  pixelSamplingRate: number;
  exposure: number;
  fov: number;
  flipVolume: [number, number, number];
  stepSizePrimaryRayVoxels: number;
  stepSizeSecondaryRayVoxels: number;
  // wait - is this per-channel?
  specular: [number, number, number][];
  emissive: [number, number, number][];
  glossiness: number[];
}

// TODO: how to create a type error when one of this type's dependent interfaces
// (RenderConfig, UserSelectionState, etc.) changes, to signal the need for a
// new version and a converter from the old version?
export interface SavedState {
  stateVersion: number;

  baseUrl: string;
  cellId: string;
  cellDownloadHref: string;
  cellPath: string;
  fovDownloadHref: string;
  fovPath: string;

  // Which UI elements are rendered
  renderConfig: RenderConfig;
  // Global (not per-channel) viewer settings which may be changed in the UI
  viewerConfig: UserSelectionState;
  // State which exists in view3d but is not controlled by this component
  view3dInternalState: View3dInternalState;
  // TODO: camera, per-channel settings
}
