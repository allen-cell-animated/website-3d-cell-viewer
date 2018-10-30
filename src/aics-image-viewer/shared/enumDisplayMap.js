import { keys, reduce } from 'lodash';

import {ViewMode} from './enums/viewModeEnum';
import {THREE_D_MODE, XY_MODE, XZ_MODE, YZ_MODE} from './constants';

const VIEW_MODE_ENUM_AND_LABELS = [
  [ViewMode.threeD, THREE_D_MODE],
  [ViewMode.xy, XY_MODE],
  [ViewMode.xz, XZ_MODE],
  [ViewMode.yz, YZ_MODE]
];

const STRING_TO_SYMBOL = reduce((ViewMode), (acc, cur) => {
  acc[cur.toString()] = cur;
  return acc;
}, {});

const VIEW_MODE_ENUM_TO_LABEL_MAP = new Map(VIEW_MODE_ENUM_AND_LABELS);

export {
  VIEW_MODE_ENUM_TO_LABEL_MAP,
  STRING_TO_SYMBOL
};
