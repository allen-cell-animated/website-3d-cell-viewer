import React from 'react';
import { map } from 'lodash';

import {
  CardHeader, 
  FlatButton, 
  IconButton, 
  IconMenu,
   MenuItem
} from 'material-ui';

import UtilsService from '../shared/utils/utilsService';
import {
  ISOSURFACE_OPACITY_SLIDER_MAX
} from '../shared/constants';

import ChannelsWidgetRow from './ChannelsWidgetRow';

const SEGMENTATION_CHANNELS = ['SEG_STRUCT', 'CON_Memb', 'CON_DNA'];
const OBSERVED_CHANNELS = ['CMDRP', 'EGFP', 'H3342'];
const PRESET_COLORS_1 = [
  [190, 68, 171, 255],
  [189, 211, 75, 255],
  [61, 155, 169, 255],
  [128, 128, 128, 255],
  [255, 255, 255, 255],
  [239, 27, 45, 255],
  [238, 77, 245, 255],
  [96, 255, 255, 255]
];
const PRESET_COLORS_2 = [
  [128,0,0, 255],
  [0,128,0, 255],
  [0,0,128, 255],
  [32,32,32, 255],
  [255,255,0, 255],
  [255,0,255, 255],
  [0,255,0, 255],
  [0,0,255, 255]
];

const PRESET_COLORS_3 = [
  [128,0,128, 255],
  [128,128,128, 255],
  [0,128,128, 255],
  [128,128,0, 255],
  [255,255,255, 255],
  [255,0,0, 255],
  [255,0,255, 255],
  [0,255,255, 255]
];

export default class ChannelsWidget extends React.Component {
  constructor(props) {
    super(props);
    this.isSegButtonDisabled = this.isSegButtonDisabled.bind(this);
    this.isObsButtonDisabled = this.isObsButtonDisabled.bind(this);
    this.makeTurnOnPresetFn = this.makeTurnOnPresetFn.bind(this);
    this.makeOnCheckHandler = this.makeOnCheckHandler.bind(this);
    this.makeOnVolumeCheckHandler = this.makeOnVolumeCheckHandler.bind(this);
    this.makeOnIsosurfaceCheckHandler = this.makeOnIsosurfaceCheckHandler.bind(this);
    this.makeOnIsovalueChange = this.makeOnIsovalueChange.bind(this);
    this.makeOnSaveIsosurfaceHandler = this.makeOnSaveIsosurfaceHandler.bind(this);
    this.makeOnOpacityChange = this.makeOnOpacityChange.bind(this);
    this.showSegmentationChannels = this.showSegmentationChannels.bind(this);
    this.showObservedChannels = this.showObservedChannels.bind(this);

    this.presetMap = new Map();
    this.presetMap.set(1, PRESET_COLORS_1);
    this.presetMap.set(2, PRESET_COLORS_2);
    this.presetMap.set(3, PRESET_COLORS_3);
  }

  isSegButtonDisabled() {
    const names = this.props.channels.map((channel) => channel.name);
    return UtilsService.intersects(SEGMENTATION_CHANNELS, names);
  }

  isObsButtonDisabled() {
    const names = this.props.channels.map((channel) => channel.name);
    return UtilsService.intersects(OBSERVED_CHANNELS, names);
  }

  makeTurnOnPresetFn(preset) {
    return () => {
      if (this.presetMap.has(preset)) {
        const presets = this.presetMap.get(preset);

        this.props.onApplyColorPresets(presets);
      }
    };
  }

  showSegmentationChannels() {
    this.props.showChannels(SEGMENTATION_CHANNELS, true);
  }

  showObservedChannels() {
    this.props.showChannels(OBSERVED_CHANNELS, true);
  }

  makeOnCheckHandler(index) {
    return (event, value) => {
      this.props.setChannelEnabled(index, value);
    };
  }

  makeOnVolumeCheckHandler(index) {
    return (event, value) => {
      if (this.props.setVolumeEnabled) {
        this.props.setVolumeEnabled(index, value);
      }
    };
  }

  makeOnIsosurfaceCheckHandler(index) {
    return (event, value) => {
      if (this.props.setIsosurfaceEnabled) {
        this.props.setIsosurfaceEnabled(index, value);
      }
    };
  }

  makeOnIsovalueChange(index) {
    return (values, newValue) => {
      this.props.updateIsovalue(index, newValue);
    };
  }

  makeOnSaveIsosurfaceHandler(index, type) {
    return () => {
      this.props.image.saveChannelIsosurface(index, type);
    };
  }

  makeOnOpacityChange(index) {
    return (values, newValue) => {
      this.props.updateIsosurfaceOpacity(index, newValue/ISOSURFACE_OPACITY_SLIDER_MAX);
    };
  }

  getRows() {
    const { channelGroupedByType, channels} = this.props;
    return map(channelGroupedByType, (channelArray, key) => {
      return (<div key={`${key}`} style={STYLES.wrapper}>
        <CardHeader key={`${key}`} style={{ textAlign: 'left', paddingLeft: 0 }} title={key}/>
          {channelArray.map((actualIndex, index) => {
            let channel = channels[actualIndex];
            return (
              <ChannelsWidgetRow key={`${index}_${channel.name}_${actualIndex}`}
                                    image={this.props.image}
                                    index={actualIndex}
                                    channelDataReady={channel.dataReady}
                                    name={channel.name}
                                    checked={channel.channelEnabled}
                                    onChange={this.makeOnCheckHandler(actualIndex)}
                                    onColorChange={this.props.onColorChange}
                                    onColorChangeComplete={this.props.onColorChangeComplete}
                                    volumeChecked={channel.volumeEnabled}
                                    onVolumeCheckboxChange={this.makeOnVolumeCheckHandler(actualIndex)}
                                    isosurfaceChecked={channel.isosurfaceEnabled}
                                    onIsosurfaceChange={this.makeOnIsosurfaceCheckHandler(actualIndex)}
                                    onIsovalueChange={this.makeOnIsovalueChange(actualIndex)}
                                    onSaveIsosurfaceSTL={this.makeOnSaveIsosurfaceHandler(actualIndex, "STL")}
                                    onSaveIsosurfaceGLTF={this.makeOnSaveIsosurfaceHandler(actualIndex, "GLTF")}
                                    onOpacityChange={this.makeOnOpacityChange(actualIndex)}
                                    updateChannelTransferFunction={this.props.updateChannelTransferFunction}
                                    isovalue={channel.isovalue}
                                    opacity={channel.opacity}
                                    color={channel.color}/>
            );
          })}
      </div>);
    });
  }

  componentWillReceiveProps(nextProps) {
  }

  componentWillMount() {
  }

  render() {
    if (!this.props.image) return null;

    const segButtonDisabled = this.isSegButtonDisabled();
    const obsButtonDisabled = this.isObsButtonDisabled();
    return (
      <div style={STYLES.wrapper}>
        <div style={STYLES.buttonRow}>
          <div className="clearfix" style={STYLES.presetRow}>
            <FlatButton style={STYLES.button} label="Seg" onClick={this.showSegmentationChannels} disabled={segButtonDisabled}/>
            <FlatButton style={STYLES.button} label="Obs" onClick={this.showObservedChannels} disabled={obsButtonDisabled}/>
            <IconMenu className="float-right"
              iconButtonElement={<IconButton><i className="material-icons">color_lens</i></IconButton>}
              anchorOrigin={{horizontal: 'right', vertical: 'top'}}
              targetOrigin={{horizontal: 'right', vertical: 'top'}}>
              <MenuItem primaryText="Preset 1" onClick={this.makeTurnOnPresetFn(1)}/>
              <MenuItem primaryText="Preset 2" onClick={this.makeTurnOnPresetFn(2)}/>
              <MenuItem primaryText="Preset 3" onClick={this.makeTurnOnPresetFn(3)}/>
            </IconMenu>
          </div>
        </div>
        <div style={STYLES.wrapper}>
          {this.getRows()}
        </div>
      </div>
    );
  }
}

const STYLES = {
  wrapper: {
    width: '100%'
  },
  buttonRow: {
    display: 'flex'
  },
  button: {
    marginTop: '0.3em',
    display: 'inline-block'
  },
  presetRow: {
    width: '100%'
  }
};
