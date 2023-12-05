import { View3d, Volume } from "@aics/volume-viewer";
import type { RawArrayInfo, RawArrayData } from "@aics/volume-viewer";

import { ImageType, RenderMode, ViewMode } from "../../shared/enums";
import { PerAxis, MetadataRecord } from "../../shared/types";
import { ColorArray } from "../../shared/utils/colorRepresentations";
import { ChannelGrouping, ChannelState, ViewerChannelSettings } from "../../shared/utils/viewerChannelSettings";

/** `typeof useEffect`, but the effect handler takes a `Volume` as an argument */
export type UseImageEffectType = (effect: (image: Volume) => void | (() => void), deps: ReadonlyArray<any>) => void;

type ControlNames =
  | "alphaMaskSlider"
  | "autoRotateButton"
  | "axisClipSliders"
  | "brightnessSlider"
  | "backgroundColorPicker"
  | "boundingBoxColorPicker"
  | "colorPresetsDropdown"
  | "densitySlider"
  | "levelsSliders"
  | "interpolationControl"
  | "saveSurfaceButtons"
  | "fovCellSwitchControls"
  | "viewModeRadioButtons"
  | "resetCameraButton"
  | "showAxesButton"
  | "showBoundingBoxButton"
  | "metadataViewer";
/** Show/hide different elements of the UI */
export type ShowControls = { [K in ControlNames]: boolean };

/** Global (not per-channel) viewer state which may be changed in the UI */
export interface GlobalViewerSettings {
  viewMode: ViewMode;
  renderMode: RenderMode;
  imageType: ImageType;
  showAxes: boolean;
  showBoundingBox: boolean;
  boundingBoxColor: ColorArray;
  backgroundColor: ColorArray;
  autorotate: boolean;
  maskAlpha: number;
  brightness: number;
  density: number;
  levels: [number, number, number];
  interpolationEnabled: boolean;
  // `region` values are in the range [0, 1]. We derive from this the format that the sliders expect
  // (integers between 0 and num_slices - 1) and the format that view3d expects (in [-0.5, 0.5]).
  // This state is only active in 3d mode.
  region: PerAxis<[number, number]>;
  // Store the relative position of the slice in the range [0, 1] for each of 3 axes.
  // This state is active in x,y,z single slice modes.
  slice: PerAxis<number>;
  time: number;
}

export interface AppProps {
  // rawData has a "dtype" which is expected to be "uint8", a "shape":[c,z,y,x] and a "buffer" which is a DataView
  rawData?: RawArrayData;
  // rawDims is the volume dims that normally come from a json file
  rawDims?: RawArrayInfo;

  // replaces / obviates groupToChannelNameMap, channelNameClean, channelNameMapping, filterFunc, initialChannelSettings, defaultSurfacesOn and defaultVolumesOn
  viewerChannelSettings?: ViewerChannelSettings;

  appHeight: string;
  cellId: string;
  cellPath: string;
  fovPath: string;
  showControls?: Partial<ShowControls>;
  viewerSettings?: Partial<GlobalViewerSettings>;
  baseUrl: string;
  cellDownloadHref: string;
  fovDownloadHref: string;
  pixelSize?: [number, number, number];
  canvasMargin: string;
  transform?: {
    translation: [number, number, number];
    rotation: [number, number, number];
  };
  metadata?: MetadataRecord;

  metadataFormatter?: (metadata: MetadataRecord) => MetadataRecord;
  onControlPanelToggle?: (collapsed: boolean) => void;
}

export type ViewerSettingsKey = keyof GlobalViewerSettings;
export type ViewerSettingChangeHandlers = {
  [K in ViewerSettingsKey]?: (settings: GlobalViewerSettings, value: GlobalViewerSettings[K]) => GlobalViewerSettings;
};
export type ViewerSettingUpdater = <K extends ViewerSettingsKey>(key: K, value: GlobalViewerSettings[K]) => void;

export interface AppState {
  view3d: View3d;
  image: Volume | null;

  sendingQueryRequest: boolean;
  currentlyLoadedImagePath?: string;
  cachingInProgress: boolean;
  controlPanelClosed: boolean;
  // channelGroupedByType is an object where channel indexes are grouped by type (observed, segmenations, and countours)
  // {observed: channelIndex[], segmentations: channelIndex[], contours: channelIndex[], other: channelIndex[] }
  channelGroupedByType: ChannelGrouping;
  // global (not per-channel) state set by the UI:
  viewerSettings: GlobalViewerSettings;
  // channelSettings is a flat list of objects of this type:
  // { name, enabled, volumeEnabled, isosurfaceEnabled, isovalue, opacity, color}
  // the list is in the order they were in the raw data.
  channelSettings: ChannelState[];
}
