export default function formatChannelNames(channelName, structureName) {
    if (channelName.split('_').length > 1) {
        const splitName = channelName.split('_')[1];
        const mapping = {
            Memb: 'Membrane',
            STRUCT: structureName || 'Labeled structure',
            DNA: 'DNA',
            '100X': 'Bright field'
        };
        return mapping[splitName] ? mapping[splitName] : splitName;
    }
    const mapping = {
        CMDRP: 'Membrane',
        EGFP: structureName || 'Labeled structure',
        H3342: 'DNA'
    };
    return mapping[channelName] ? mapping[channelName] : channelName;
};
