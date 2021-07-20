export interface ChannelNameMapping {
    test: RegExp;
    label: string;
};

export default function formatChannelNames(name: string, remappings: ChannelNameMapping[]): string {
    for (const i of remappings) {
        // for first match that is satisfied, return the label
        if (i.test.test(name)) {
            return i.label;
        }
    }
    // no match; return original name
    return name;
}
