// Add all exported constants here to prevent circular dependencies
export const
  // Keys accepted as URL search parameters
  CELL_ID_QUERY = 'cellId',
  FOV_ID_QUERY = 'fovId',
  CELL_LINE_QUERY = 'cellLine',
  IMAGE_NAME_QUERY = 'name',
  LEGACY_IMAGE_ID_QUERY = 'legacyName_1_2',

  // View modes
  YZ_MODE = 'YZ',
  XZ_MODE = 'XZ',
  XY_MODE = 'XY',
  THREE_D_MODE = '3D',

  ISOSURFACE_OPACITY_SLIDER_MAX = 255.0,

  // TODO: fix these server names.  Only LEGACY_IMAGE_SERVER is correct and only if the dataset subdirectory name is known.
  LEGACY_DOWNLOAD_SERVER = 'http://downloads.allencell.org/1.2.0/Cell-Viewer_Data/',
  LEGACY_IMAGE_SERVER = 'https://cellviewer-1-2-0.allencell.org/aics/thumbnails/',

  DOWNLOAD_SERVER = process.env.DOWNLOAD_SERVER,
  IMAGE_SERVER = process.env.IMAGE_SERVER,

  OBSERVED_CHANNEL_KEY = 'observed',
  SEGMENATION_CHANNEL_KEY = 'segmentation',
  CONTOUR_CHANNEL_KEY = 'contour',
  OTHER_CHANNEL_KEY = 'Other';

export const PRESET_COLORS_1 = [
  [190, 68, 171, 255],
  [189, 211, 75, 255],
  [61, 155, 169, 255],
  [128, 128, 128, 255],
  [255, 255, 255, 255],
  [239, 27, 45, 255],
  [238, 77, 245, 255],
  [96, 255, 255, 255]
];
export const PRESET_COLORS_2 = [
  [128, 0, 0, 255],
  [0, 128, 0, 255],
  [0, 0, 128, 255],
  [32, 32, 32, 255],
  [255, 255, 0, 255],
  [255, 0, 255, 255],
  [0, 255, 0, 255],
  [0, 0, 255, 255]
];

export const PRESET_COLORS_3 = [
  [128, 0, 128, 255],
  [128, 128, 128, 255],
  [0, 128, 128, 255],
  [128, 128, 0, 255],
  [255, 255, 255, 255],
  [255, 0, 0, 255],
  [255, 0, 255, 255],
  [0, 255, 255, 255]
];


