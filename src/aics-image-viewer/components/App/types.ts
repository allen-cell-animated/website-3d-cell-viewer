import { Volume, RawArrayInfo, RawArrayData } from "@aics/volume-viewer";
import { ImageType, RenderMode, ViewMode } from "../../shared/enums";
import { PerAxis, MetadataRecord } from "../../shared/types";
import { ColorArray } from "../../shared/utils/colorRepresentations";
import { ViewerChannelSettings } from "../../shared/utils/viewerChannelSettings";

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
  // FIRST WAY TO GET DATA INTO THE VIEWER: pass in volume data directly
  // rawData has a "dtype" which is expected to be "uint8", a "shape":[c,z,y,x] and a "buffer" which is a DataView
  rawData?: RawArrayData;
  // rawDims is a small amount of metadata (e.g. dimensions and channel names) to be converted internally to an ImageInfo
  rawDims?: RawArrayInfo;

  // SECOND WAY TO GET DATA INTO THE VIEWER: (if `rawData`/`rawDims` isn't present) pass in URL(s) to fetch volume data
  imageUrl: string | string[];
  parentImageUrl?: string | string[];

  // replaces / obviates groupToChannelNameMap, channelNameClean, channelNameMapping, filterFunc, initialChannelSettings, defaultSurfacesOn and defaultVolumesOn
  viewerChannelSettings?: ViewerChannelSettings;

  appHeight: string;
  cellId: string;
  showControls?: Partial<ShowControls>;
  viewerSettings?: Partial<GlobalViewerSettings>;
  imageDownloadHref: string;
  parentImageDownloadHref: string;
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

/**
 * If a value in `GlobalViewerSettings` is an object, we want to allow updates with a partial object. Otherwise,
 * components that update some but not all of the object's properties have to know the object's current value in order
 * to clone it with only the key they care about updated, which exposes us to stale closure issues.
 */
type PartialIfObject<T> = T extends Record<string, unknown> ? Partial<T> : T;

/**
 * A type which lets us provide a map of optional check functions for certain settings updates, to avoid entering
 * illegal states. E.g., whenever `renderMode` is changed to pathtrace, make sure `autorotate` is set to false.
 */
export type ViewerSettingChangeHandlers = {
  [K in ViewerSettingsKey]?: (
    settings: GlobalViewerSettings,
    value: PartialIfObject<GlobalViewerSettings[K]>
  ) => GlobalViewerSettings;
};

/**
 * The type of the global settings updater provided by `App` and passed down to most UI components. Looks kind of like
 * redux's `dispatch` if you squint. `key` names the setting to update; `value` is the new (potentially partial) value.
 */
export type ViewerSettingUpdater = <K extends ViewerSettingsKey>(
  key: K,
  value: PartialIfObject<GlobalViewerSettings[K]>
) => void;
