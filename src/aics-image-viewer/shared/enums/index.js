import { reduce } from 'lodash';

import channelGroups from './channelGroups';
import thicknessUnit from './thicknessUnit';
import viewMode from './viewMode';

function makeSymbolStringMap(mapping) {
    return reduce((mapping), (acc, cur) => {
        acc[cur.toString()] = cur;
        return acc;
    }, {});
}

thicknessUnit.STRING_TO_SYMBOL = makeSymbolStringMap(thicknessUnit.mainMapping);
viewMode.STRING_TO_SYMBOL = makeSymbolStringMap(viewMode.mainMapping);

export default {
    channelGroups, 
    thicknessUnit,
    viewMode
};
