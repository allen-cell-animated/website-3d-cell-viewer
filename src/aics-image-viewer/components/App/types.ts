import { View3d, Volume, ImageInfo } from "@aics/volume-viewer";
import { ImageType, RenderMode, ViewMode } from "../../shared/enums";
import { PerAxis } from "../../shared/types";
import { ColorArray } from "../../shared/utils/colorRepresentations";
import { ChannelGrouping, ChannelState, ViewerChannelSettings } from "../../shared/utils/viewerChannelSettings";

export interface AppProps {
  // rawData has a "dtype" which is expected to be "uint8", a "shape":[c,z,y,x] and a "buffer" which is a DataView
  rawData?: { dtype: "uint8"; shape: [number, number, number, number]; buffer: DataView };
  // rawDims is the volume dims that normally come from a json file
  rawDims?: ImageInfo;

  // replaces / obviates groupToChannelNameMap, channelNameClean, channelNameMapping, filterFunc, initialChannelSettings, defaultSurfacesOn and defaultVolumesOn
  viewerChannelSettings?: ViewerChannelSettings;

  appHeight: string;
  cellId: string;
  cellPath: string;
  fovPath: string;
  renderConfig: {
    alphaMask: boolean;
    autoRotateButton: boolean;
    axisClipSliders: boolean;
    brightnessSlider: boolean;
    colorPicker: boolean;
    colorPresetsDropdown: boolean;
    densitySlider: boolean;
    levelsSliders: boolean;
    interpolationControl: boolean;
    saveSurfaceButtons: boolean;
    fovCellSwitchControls: boolean;
    viewModeRadioButtons: boolean;
    resetCameraButton: boolean;
    showAxesButton: boolean;
    showBoundingBoxButton: boolean;
  };
  viewerConfig: Partial<UserSelectionState>;
  baseUrl: string;
  cellDownloadHref: string;
  fovDownloadHref: string;
  pixelSize?: [number, number, number];
  canvasMargin: string;
  transform?: {
    translation: [number, number, number];
    rotation: [number, number, number];
  };

  onControlPanelToggle?: (collapsed: boolean) => void;
}

export interface UserSelectionState {
  viewMode: ViewMode;
  renderMode: RenderMode;
  imageType: ImageType;
  showAxes: boolean;
  showBoundingBox: boolean;
  boundingBoxColor: ColorArray;
  backgroundColor: ColorArray;
  autorotate: boolean;
  maskAlpha: number; // props.viewerConfig.maskAlpha || ALPHA_MASK_SLIDER_3D_DEFAULT,
  brightness: number; // props.viewerConfig.brightness || BRIGHTNESS_SLIDER_LEVEL_DEFAULT,
  density: number; // props.viewerConfig.density || DENSITY_SLIDER_LEVEL_DEFAULT,
  levels: [number, number, number]; // props.viewerConfig.levels || LEVELS_SLIDER_DEFAULT,
  interpolationEnabled: boolean;
  // `region` values are in the range [0, 1]. We derive from this the format that the sliders expect
  // (integers between 0 and num_slices - 1) and the format that view3d expects (in [-0.5, 0.5])
  region: PerAxis<[number, number]>;
}

export type UserSelectionKey = keyof UserSelectionState;
export type UserSelectionChangeHandlers = {
  [K in UserSelectionKey]?: (value: UserSelectionState[K], view3d: View3d, image: Volume) => void;
};

export interface AppState {
  view3d: View3d | null;
  image: Volume | null;

  sendingQueryRequest: boolean;
  currentlyLoadedImagePath?: string;
  cachingInProgress: boolean;
  controlPanelClosed: boolean;
  // channelGroupedByType is an object where channel indexes are grouped by type (observed, segmenations, and countours)
  // {observed: channelIndex[], segmentations: channelIndex[], contours: channelIndex[], other: channelIndex[] }
  channelGroupedByType: ChannelGrouping;
  // global (not per-channel) state set by the UI:
  userSelections: UserSelectionState;
  // channelSettings is a flat list of objects of this type:
  // { name, enabled, volumeEnabled, isosurfaceEnabled, isovalue, opacity, color, dataReady}
  // the list is in the order they were in the raw data.
  channelSettings: ChannelState[];
}
