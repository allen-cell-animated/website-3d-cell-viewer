import { reduce } from 'lodash';

export const ThicknessUnit = {
  slice: Symbol('slice'),
  percent: Symbol('percent')
};

export const STRING_TO_SYMBOL = reduce((ThicknessUnit), (acc, cur) => {
  acc[cur.toString()] = cur;
  return acc;
}, {});