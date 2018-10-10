import {
    OBSERVED_CHANNEL_KEY,
    SEGMENATION_CHANNEL_KEY,
    CONTOUR_CHANNEL_KEY,
} from '../constants';

export const channelGroupingMap = {
    [OBSERVED_CHANNEL_KEY]: ['CMDRP', 'EGFP', 'H3342', 'Bright_100x'],
    [SEGMENATION_CHANNEL_KEY]: ['SEG_STRUCT', 'SEG_Memb', 'SEG_DNA'],
    [CONTOUR_CHANNEL_KEY]: ['CON_Memb', 'CON_DNA']
};

export const channelGroupTitles = {
    [OBSERVED_CHANNEL_KEY]: 'Observed channels',
    [SEGMENATION_CHANNEL_KEY]:'Segmenation channels',
    [CONTOUR_CHANNEL_KEY]: 'Contour channels'
};
