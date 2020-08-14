import { find } from 'lodash';

export default function formatChannelNames(channelName, structureName) {
    const membraneRegEx = /(CMDRP)|(Memb)/g;
    const structureRegEx = /(EGFP)|(RFPT)|(STRUCT)/g;
    const dnaRegEx = /(H3342)|(DNA)/g;
    const brightFieldRegEx = /(100)|(Bright)/g;

    const mapping = [
        {test: membraneRegEx, label: 'Membrane'},
        { test: structureRegEx, label: structureName || 'Labeled structure'},
        { test: dnaRegEx, label: 'DNA' },
        { test: brightFieldRegEx, label: 'Bright field' },
    ];
    const toReturn = find(mapping, (value) => {
        return value.test.test(channelName);
    });
    return toReturn ? toReturn.label : channelName;
}
