import { ImageType, RenderMode, ViewMode } from "../../shared/enums";
import { ColorArray } from "../../shared/utils/colorRepresentations";

type RenderConfigKey =
  | "alphaMask"
  | "autoRotateButton"
  | "axisClipSliders"
  | "brightnessSlider"
  | "colorPicker"
  | "colorPresetsDropdown"
  | "densitySlider"
  | "levelsSliders"
  | "interpolationControl"
  | "saveSurfaceButtons"
  | "fovCellSwitchControls"
  | "viewModeRadioButtons"
  | "resetCameraButton"
  | "showAxesButton"
  | "showBoundingBoxButton";

export default interface SavedState {
  stateVersion: number;

  baseUrl: string;
  cellId: string;
  cellDownloadHref: string;
  cellPath: string;
  fovDownloadHref: string;
  fovPath: string;

  // Which UI elements are rendered in the UI
  renderConfig: { [K in RenderConfigKey]: boolean };
  // Global (not per-channel) viewer settings which may be changed in the UI
  viewerConfig: {
    showAxes: boolean;
    showBoundingBox: boolean;
    backgroundColor: ColorArray;
    boundingBoxColor: ColorArray;
    autorotate: boolean;
    view: ViewMode;
    mode: RenderMode; // TODO make prop consistent with enum
    imageType: ImageType; // TODO add to props
    maskAlpha: [number];
    brightness: [number];
    density: [number];
    levels: [number, number, number];
    interpolationEnabled: boolean;
    // TODO deal with slice
    region: [number, number, number, number, number, number];
  }
}
