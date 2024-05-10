import { ColorArray } from "./utils/colorRepresentations";

// Add all exported constants here to prevent circular dependencies
export const // Control panel will automatically close if viewport is less than this width
  CONTROL_PANEL_CLOSE_WIDTH = 970,
  BACKGROUND_COLOR_DEFAULT: ColorArray = [0, 0, 0],
  BOUNDING_BOX_COLOR_DEFAULT: ColorArray = [255, 255, 255],
  AXIS_MARGIN_DEFAULT: [number, number] = [16, 16],
  SCALE_BAR_MARGIN_DEFAULT: [number, number] = [120, 12],
  // These settings were chosen to work well with most AICS microscopy pipeline images.
  // These numbers mean: remap the bottom LUT_MIN_PERCENTILE fraction of pixels to zero intensity,
  // and linearly increase intensity up to the LUT_MAX_PERCENTILE fraction of pixels.
  LUT_MIN_PERCENTILE = 0.5,
  LUT_MAX_PERCENTILE = 0.983,
  ISOSURFACE_OPACITY_SLIDER_MAX = 255.0,
  ALPHA_MASK_SLIDER_DEFAULT = 0,
  BRIGHTNESS_SLIDER_LEVEL_DEFAULT = 70,
  DENSITY_SLIDER_LEVEL_DEFAULT = 50,
  LEVELS_SLIDER_DEFAULT: ColorArray = [35.0, 140.0, 255.0],
  INTERPOLATION_ENABLED_DEFAULT = true,
  OTHER_CHANNEL_KEY = "Other",
  SINGLE_GROUP_CHANNEL_KEY = "Channels",
  HISTOGRAM_NUM_BINS = 256;

export const CACHE_MAX_SIZE = 1_000_000_000;
export const QUEUE_MAX_SIZE = 10;
export const QUEUE_MAX_LOW_PRIORITY_SIZE = 4;

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
  },
  {
    colors: PRESET_COLORS_1,
    name: "Thumbnail colors",
  },
  {
    colors: PRESET_COLORS_2,
    name: "RGB colors",
  },
  {
    colors: PRESET_COLORS_3,
    name: "White structure",
  },
]);
