import { ColorArray } from "./utils/colorRepresentations";

// Add all exported constants here to prevent circular dependencies
export const // View modes
  YZ_MODE = "YZ",
  XZ_MODE = "XZ",
  XY_MODE = "XY",
  THREE_D_MODE = "3D",
  // App state values
  SEGMENTED_CELL = "segmented",
  FULL_FIELD_IMAGE = "full field",
  // App State Keys,
  ALPHA_MASK_SLIDER_LEVEL = "alphaMaskSliderLevel",
  BRIGHTNESS_SLIDER_LEVEL = "brightnessSliderLevel",
  DENSITY_SLIDER_LEVEL = "densitySliderLevel",
  LEVELS_SLIDER = "levelsSlider",
  MODE = "mode",
  SHOW_AXES = "showAxes",
  MAX_PROJECT = "maxProject",
  VOLUMETRIC_RENDER = "volume",
  PATH_TRACE = "pathTrace",
  COLORIZE_ALPHA = "colorizeAlpha",
  COLORIZE_ENABLED = "colorizeEnabled",
  // Volume viewer keys
  ISO_VALUE = "isovalue",
  OPACITY = "opacity",
  COLOR = "color",
  SAVE_ISO_SURFACE = "saveIsoSurface",
  // Control panel will automatically close if viewport is less than this width
  CONTROL_PANEL_CLOSE_WIDTH = 970,
  BACKGROUND_COLOR: ColorArray = [0, 0, 0],
  BOUNDING_BOX_COLOR: ColorArray = [255, 255, 255],
  // These settings were chosen to work well with most AICS microscopy pipeline images.
  // These numbers mean: remap the bottom LUT_MIN_PERCENTILE fraction of pixels to zero intensity,
  // and linearly increase intensity up to the LUT_MAX_PERCENTILE fraction of pixels.
  LUT_MIN_PERCENTILE = 0.5,
  LUT_MAX_PERCENTILE = 0.983,
  ISOSURFACE_OPACITY_SLIDER_MAX = 255.0,
  ALPHA_MASK_SLIDER_3D_DEFAULT = [50],
  ALPHA_MASK_SLIDER_2D_DEFAULT = [0],
  BRIGHTNESS_SLIDER_LEVEL_DEFAULT = [70],
  DENSITY_SLIDER_LEVEL_DEFAULT = [50],
  LEVELS_SLIDER_DEFAULT: ColorArray = [35.0, 140.0, 255.0],
  OTHER_CHANNEL_KEY = "Other",
  SINGLE_GROUP_CHANNEL_KEY = "Channels";

export const PRESET_COLORS_1: ColorArray[] = [
  [190, 68, 171],
  [189, 211, 75],
  [61, 155, 169],
  [128, 128, 128],
  [255, 255, 255],
  [239, 27, 45],
  [238, 77, 245],
  [96, 255, 255],
];
export const PRESET_COLORS_2: ColorArray[] = [
  [128, 0, 0],
  [0, 128, 0],
  [0, 0, 128],
  [32, 32, 32],
  [255, 255, 0],
  [255, 0, 255],
  [0, 255, 0],
  [0, 0, 255],
];

export const PRESET_COLORS_3: ColorArray[] = [
  [128, 0, 128],
  [128, 128, 128],
  [0, 128, 128],
  [128, 128, 0],
  [255, 255, 255],
  [255, 0, 0],
  [255, 0, 255],
  [0, 255, 255],
];

export const PRESET_COLORS_0: ColorArray[] = [
  [226, 205, 179],
  [111, 186, 17],
  [141, 163, 192],
  [245, 241, 203],
  [224, 227, 209],
  [221, 155, 245],
  [227, 244, 245],
  [255, 98, 0],
  [247, 219, 120],
];

export const PRESET_COLOR_MAP = Object.freeze([
  {
    colors: PRESET_COLORS_0,
    name: "Default",
    key: 0,
  },
  {
    colors: PRESET_COLORS_1,
    name: "Thumbnail colors",
    key: 1,
  },
  {
    colors: PRESET_COLORS_2,
    name: "RGB colors",
    key: 2,
  },
  {
    colors: PRESET_COLORS_3,
    name: "White structure",
    key: 3,
  },
]);
