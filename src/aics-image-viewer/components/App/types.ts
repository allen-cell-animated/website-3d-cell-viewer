import { View3d, Volume, ImageInfo } from "@aics/volume-viewer";
import { ColorArray } from "../../shared/utils/colorRepresentations";
import { InternalChannelSetting, ViewerChannelSettings } from "../../shared/utils/viewerChannelSettings";

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
    resetCameraButton: boolean;
    showAxesButton: boolean;
    showBoundingBoxButton: boolean;
  };
  viewerConfig: {
    showAxes: boolean;
    showBoundingBox: boolean;
    boundingBoxColor: ColorArray;
    backgroundColor: ColorArray;
    autorotate: boolean;
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

  onControlPanelToggle?: (collapsed: boolean) => void;
}

export interface UserSelectionState {
  imageType: string; // SEGMENTED_CELL | FULL_FIELD_IMAGE,
  controlPanelClosed: boolean;
  mode: symbol;
  autorotate: boolean;
  maxProject: boolean;
  pathTrace: boolean;
  showAxes: boolean;
  showBoundingBox: boolean;
  boundingBoxColor: ColorArray;
  backgroundColor: ColorArray;
  alphaMaskSliderLevel: number[]; //[props.viewerConfig.maskAlpha] || ALPHA_MASK_SLIDER_3D_DEFAULT,
  brightnessSliderLevel: number[]; //[props.viewerConfig.brightness] || BRIGHTNESS_SLIDER_LEVEL_DEFAULT,
  densitySliderLevel: number[]; // [props.viewerConfig.density] || DENSITY_SLIDER_LEVEL_DEFAULT,
  levelsSlider: [number, number, number]; //props.viewerConfig.levels || LEVELS_SLIDER_DEFAULT,
  // channelSettings is a flat list of objects of this type:
  // { name, enabled, volumeEnabled, isosurfaceEnabled, isovalue, opacity, color, dataReady}
  // the list is in the order they were in the raw data.
  channelSettings: InternalChannelSetting[];
}

export type UserSelectionKey = keyof UserSelectionState;

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
