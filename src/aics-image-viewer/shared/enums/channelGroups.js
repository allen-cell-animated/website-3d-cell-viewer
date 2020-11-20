import {
    OBSERVED_CHANNEL_KEY,
    SEGMENTATION_CHANNEL_KEY,
    CONTOUR_CHANNEL_KEY,
} from '../constants';

export const channelGroupingMap = {
    [OBSERVED_CHANNEL_KEY]: ['CMDRP', 'EGFP', 'mtagRFPT', 'H3342', 'H3342_3', 'Bright_100', 'Bright_100X', 'TL 100x', 'TL_100x', 'Bright_2'],
    [SEGMENTATION_CHANNEL_KEY]: ['SEG_STRUCT', 'SEG_Memb', 'SEG_DNA'],
    [CONTOUR_CHANNEL_KEY]: ['CON_Memb', 'CON_DNA']
};

export const channelGroupTitles = {
    [OBSERVED_CHANNEL_KEY]: 'Observed channels',
    [SEGMENTATION_CHANNEL_KEY]:'Segmentation channels',
    [CONTOUR_CHANNEL_KEY]: 'Contour channels'
};

export default {
    channelGroupingMap, 
    channelGroupTitles,
};
