import { ChannelState } from "../../shared/utils/viewerChannelSettings";
import { ShowControls, GlobalViewerSettings } from "./types";

/** Global viewer settings that are not currently controlled by any UI */
// TODO double-check that this is exhaustive
interface View3dInternalGlobalSettings {
  pixelSamplingRate: number;
  stepSizePrimaryRayVoxels: number;
  stepSizeSecondaryRayVoxels: number;
  flipVolume: [number, number, number];
}

/** Per-channel settings that are not currently controlled by any UI */
// TODO double-check that this is exhaustive
interface View3dInternalChannelSettings {
  specular: [number, number, number];
  emissive: [number, number, number];
  glossiness: number;
}

// TODO: how to create a type error when one of this type's dependent interfaces
// (RenderConfig, UserSelectionState, etc.) changes, to signal the need for a
// new version and a converter from the old version?
export interface SavedState {
  stateVersion: 1;

  // TODO switch to LoadSpec or similar
  baseUrl: string;
  cellId: string;
  cellDownloadHref: string;
  cellPath: string;
  fovDownloadHref: string;
  fovPath: string;

  // Which UI elements are rendered
  showControls: ShowControls;
  // Global (not per-channel) viewer settings which may be changed in the UI
  viewerSettings: GlobalViewerSettings & View3dInternalGlobalSettings;
  // Per-channel settings
  // TODO check if this state needs reorganization
  channelSettings: (ChannelState & View3dInternalChannelSettings)[];
  // TODO camera
}
