import {THREE_D_MODE, XY_MODE, XZ_MODE, YZ_MODE} from '../constants';

export const mainMapping = {
  yz: Symbol('yz'),
  xz: Symbol('xz'),
  xy: Symbol('xy'),
  threeD: Symbol('threeD')
};

const VIEW_MODE_ENUM_AND_LABELS = [
  [mainMapping.threeD, THREE_D_MODE],
  [mainMapping.xy, XY_MODE],
  [mainMapping.xz, XZ_MODE],
  [mainMapping.yz, YZ_MODE]
];

const VIEW_MODE_ENUM_TO_LABEL_MAP = new Map(VIEW_MODE_ENUM_AND_LABELS);

export default {
  mainMapping,
  VIEW_MODE_ENUM_TO_LABEL_MAP,
};
