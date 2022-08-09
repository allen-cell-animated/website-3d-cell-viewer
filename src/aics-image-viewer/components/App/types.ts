import { View3d, Volume, ImageInfo } from "@aics/volume-viewer";
import {
  CHANNEL_SETTINGS,
  LUT_CONTROL_POINTS,
  ALPHA_MASK_SLIDER_LEVEL,
  BRIGHTNESS_SLIDER_LEVEL,
  DENSITY_SLIDER_LEVEL,
  LEVELS_SLIDER,
  MODE,
  AUTO_ROTATE,
  SHOW_AXES,
  MAX_PROJECT,
  PATH_TRACE,
} from "../../shared/constants";
import { ViewerChannelSettings } from "../../shared/utils/viewerChannelSettings";

export interface AppProps {
  // rawData has a "dtype" which is expected to be "uint8", a "shape":[c,z,y,x] and a "buffer" which is a DataView
  rawData?: { dtype: "uint8"; shape: [number, number, number, number]; buffer: DataView };
  // rawDims is the volume dims that normally come from a json file
  rawDims?: ImageInfo;

  // replaces / obviates groupToChannelNameMap, channelNameClean, channelNameMapping, filterFunc, initialChannelSettings, defaultSurfacesOn and defaultVolumesOn
  viewerChannelSettings?: ViewerChannelSettings;

  maskChannelName: string;

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
    saveSurfaceButtons: boolean;
    fovCellSwitchControls: boolean;
    viewModeRadioButtons: boolean;
  };
  viewerConfig: {
    showAxes: boolean;
    showBoundingBox: boolean;
    view: string; // "3D", "XY", "XZ", "YZ"
    mode: string; // "default", "pathtrace", "maxprojection"
    maskAlpha: number; //ALPHA_MASK_SLIDER_3D_DEFAULT[0],
    brightness: number; //BRIGHTNESS_SLIDER_LEVEL_DEFAULT[0],
    density: number; //DENSITY_SLIDER_LEVEL_DEFAULT[0],
    levels: [number, number, number]; // LEVELS_SLIDER_DEFAULT,
    region?: [number, number, number, number, number, number]; //[0,1,0,1,0,1], // or ignored if slice is specified with a non-3D mode
    slice?: number; // or integer slice to show in view mode XY, YZ, or XZ.  mut. ex with region
  };
  baseUrl: string;
  nextImgPath: string;
  prevImgPath: string;
  cellDownloadHref: string;
  fovDownloadHref: string;
  preLoad: boolean;
  pixelSize?: [number, number, number];
  canvasMargin: string;
}

export interface UserSelectionState {
  imageType: string; // SEGMENTED_CELL | FULL_FIELD_IMAGE,
  controlPanelClosed: boolean;
  [MODE]: symbol;
  [AUTO_ROTATE]: boolean;
  [MAX_PROJECT]: boolean;
  [PATH_TRACE]: boolean;
  [SHOW_AXES]: boolean;
  showBoundingBox: boolean;
  [ALPHA_MASK_SLIDER_LEVEL]: number[]; //[props.viewerConfig.maskAlpha] || ALPHA_MASK_SLIDER_3D_DEFAULT,
  [BRIGHTNESS_SLIDER_LEVEL]: number[]; //[props.viewerConfig.brightness] || BRIGHTNESS_SLIDER_LEVEL_DEFAULT,
  [DENSITY_SLIDER_LEVEL]: number[]; // [props.viewerConfig.density] || DENSITY_SLIDER_LEVEL_DEFAULT,
  [LEVELS_SLIDER]: [number, number, number]; //props.viewerConfig.levels || LEVELS_SLIDER_DEFAULT,
  // channelSettings is a flat list of objects of this type:
  // { name, enabled, volumeEnabled, isosurfaceEnabled, isovalue, opacity, color, dataReady}
  // the list is in the order they were in the raw data.
  [CHANNEL_SETTINGS]: {
    name: string;
    enabled: boolean;
    volumeEnabled: boolean;
    isosurfaceEnabled: boolean;
    isovalue: number;
    opacity: number;
    color: string;
    dataReady: boolean;
    [LUT_CONTROL_POINTS]: [];
  }[];
}

export interface AppState {
  view3d: View3d | null;
  image: Volume | null;
  nextImg: Volume | null;
  prevImg: Volume | null;
  files: null;
  cellId?: string;
  fovPath: string;
  cellPath: string;
  queryErrorMessage: null | string;
  sendingQueryRequest: boolean;
  openFilesOnly: boolean;
  channelDataReady: { [key: string]: boolean };
  // channelGroupedByType is an object where channel indexes are grouped by type (observed, segmenations, and countours)
  // {observed: channelIndex[], segmentations: channelIndex[], contours: channelIndex[], other: channelIndex[] }
  channelGroupedByType: { [key: string]: number[] };
  // did the requested image have a cell id (in queryInput)?
  hasCellId: boolean;
  // state set by the UI:
  userSelections: UserSelectionState;
  currentlyLoadedImagePath: string;
  cachingInProgress: boolean;
  path: string;
}
