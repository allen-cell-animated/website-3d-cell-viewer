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

  DOWNLOAD_SERVER = 'http://dev-aics-dtp-001/cellviewer-1-3-0/Cell-Viewer_Data/',
  IMAGE_SERVER = 'http://dev-aics-dtp-001/cellviewer-1-3-0/Cell-Viewer_Thumbnails/',

  OBSERVED_CHANNEL_KEY = 'observed',
  SEGMENATION_CHANNEL_KEY = 'segmentation',
  CONTOUR_CHANNEL_KEY = 'contour';

