import React from 'react';
import { map } from 'lodash';

import {
  IconButton,
} from 'material-ui';

import {
  Card, 
  List,
} from 'antd';

import colorPalette from './shared/colorPalette';
import UtilsService from '../shared/utils/utilsService';
import formatChannelName from '../shared/utils/formatChannelNames';

import {
  ISOSURFACE_OPACITY_SLIDER_MAX
} from '../shared/constants';

import ChannelsWidgetRow from './ChannelsWidgetRow/index';

import { channelGroupTitles } from '../shared/enums/channelGroups';

const SEGMENTATION_CHANNELS = ['SEG_STRUCT', 'CON_Memb', 'CON_DNA'];
const OBSERVED_CHANNELS = ['CMDRP', 'EGFP', 'H3342'];

export default class ChannelsWidget extends React.Component {
  constructor(props) {
    super(props);
    this.isSegButtonDisabled = this.isSegButtonDisabled.bind(this);
    this.isObsButtonDisabled = this.isObsButtonDisabled.bind(this);
    this.makeOnCheckHandler = this.makeOnCheckHandler.bind(this);
    this.makeOnVolumeCheckHandler = this.makeOnVolumeCheckHandler.bind(this);
    this.makeOnIsosurfaceCheckHandler = this.makeOnIsosurfaceCheckHandler.bind(this);
    this.makeOnIsovalueChange = this.makeOnIsovalueChange.bind(this);
    this.makeOnSaveIsosurfaceHandler = this.makeOnSaveIsosurfaceHandler.bind(this);
    this.makeOnOpacityChange = this.makeOnOpacityChange.bind(this);
    this.renderVisiblityControls = this.renderVisiblityControls.bind(this);
    this.showVolumes = this.showVolumes.bind(this);
    this.showSurfaces = this.showSurfaces.bind(this);
    this.hideVolumes = this.hideVolumes.bind(this);
    this.hideSurfaces = this.hideSurfaces.bind(this);
  }

  isSegButtonDisabled() {
    const names = this.props.channels.map((channel) => channel.name);
    return UtilsService.intersects(SEGMENTATION_CHANNELS, names);
  }

  isObsButtonDisabled() {
    const names = this.props.channels.map((channel) => channel.name);
    return UtilsService.intersects(OBSERVED_CHANNELS, names);
  }

  showVolumes(channelArray) {
    this.props.showVolumes(channelArray, true);
  }

  showSurfaces(channelArray) {
    this.props.showSurfaces(channelArray, true);
  }

  hideVolumes(channelArray) {
    this.props.showVolumes(channelArray, false);
  }

  hideSurfaces(channelArray) {
    this.props.showSurfaces(channelArray, false);
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

  renderVisiblityControls(key, channelArray) {
    return (
      <div style={STYLES.buttonRow}>
        <div className="volume-controls" style={STYLES.controls}>
          <label>
          All volumes
          </label>
          <IconButton 
            style={STYLES.button}
            label="on"
            onClick={() => this.showVolumes(channelArray)}
            id={key}
          >
            <i className="material-icons">visibility</i>
          </IconButton>
          <IconButton
            style={STYLES.button}
            label="off"
            onClick={() => this.hideVolumes(channelArray)}
            id={key}
          >
            <i className="material-icons">visibility_off</i>
          </IconButton>
        </div>
        <div className="surface-controls" style={STYLES.controls}>
          <label>
          All surfaces
          </label>
          <IconButton
            style={STYLES.button}
            label="on"
            onClick={() => this.showSurfaces(channelArray)}
            id={key}
          >
            <i className="material-icons">visibility</i>
          </IconButton>
          <IconButton
            style={STYLES.button}
            label="off"
            onClick={() => this.hideSurfaces(channelArray)}
            id={key}
          >
            <i className="material-icons">visibility_off</i>
          </IconButton>
        </div>
      </div>

    );
  }

  getRows() {
    const { channelGroupedByType, channels} = this.props;

    return map(channelGroupedByType, (channelArray, key) => {
      return (
        <Card
          title={channelGroupTitles[key] || key}
          extra={this.renderVisiblityControls(key, channelArray)}
          type="inner"
          key={key}

        >
              <List 
                itemLayout="horizontal"
                dataSource={channelArray}
                renderItem={(actualIndex) => {
                  const channel = channels[actualIndex];           
                  return (
                  <ChannelsWidgetRow    key={`${actualIndex}_${channel.name}_${actualIndex}`}
                                        image={this.props.image}
                                        index={actualIndex}
                                        channelDataReady={channel.dataReady}
                                        name={formatChannelName(channel.name)}
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
                                        color={channel.color}
                                        />
                );}
              }
              />
              </Card>
        );
    });
  }

  render() {
    if (!this.props.image) return null;

    return (
        <div>
          {this.getRows()}
        </div>
    );
  }
}

const STYLES = {
  header: {
    textAlign: 'left', 
    fontWeight: 900,
  },
  controls: {
    width: '30%',
    marginLeft: 'auto',
  },
  buttonRow: {
    display: 'flex',
    flexFlow: 'row wrap',
    justifyContent: 'flex-end',
  },
  button: {
    display: 'inline-block',
    minWidth: 'initial',
    height: 'initial',
    color: colorPalette.primary1Color,
    padding: 0,
    width: 24,
  },
  presetRow: {
    width: '100%'
  }
};
