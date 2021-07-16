interface ChannelNameMapping {
    test: RegExp;
    label: string;
};

const mapping:ChannelNameMapping[] = [
    { test: /(CMDRP)|(Memb)/g, label: 'Membrane'},
    { test: /(EGFP)|(RFPT)|(STRUCT)/g, label: 'Labeled structure'},
    { test: /(H3342)|(DNA)/g, label: 'DNA' },
    { test: /(100)|(Bright)/g, label: 'Bright field' },
];

export default function formatChannelNames(name: string, remappings: ChannelNameMapping[] = mapping): string {
    for (const i of remappings) {
        // for first match that is satisfied, return the label
        if (i.test.test(name)) {
            return i.label;
        }
    }
    return name;
}
