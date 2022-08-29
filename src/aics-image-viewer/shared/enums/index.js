import { reduce } from "lodash";

import viewMode from "./viewMode";

function makeSymbolStringMap(mapping) {
  return reduce(
    mapping,
    (acc, cur) => {
      acc[cur.toString()] = cur;
      return acc;
    },
    {}
  );
}

viewMode.STRING_TO_SYMBOL = makeSymbolStringMap(viewMode.mainMapping);

export default {
  viewMode,
};
