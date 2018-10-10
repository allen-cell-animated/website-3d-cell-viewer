export default  (channelName, structureName) => {
    if (channelName.split('_').length > 1) {
        const name = channelName.split('_')[1];
        
        return name === 'STRUCT' && structureName ? structureName : name;
    }
    const mapping = {
        CMDRP: 'membrane',
        EGFP: structureName || 'labeled structure',
        H3342: 'DNA'
    };
    return mapping[channelName] ? mapping[channelName] : channelName;
};
