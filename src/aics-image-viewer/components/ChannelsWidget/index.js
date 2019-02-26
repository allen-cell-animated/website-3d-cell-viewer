import React from 'react';
import { map, filter } from 'lodash';

import {
  Card,
  Collapse,
  List,
} from 'antd';

import formatChannelName from '../../shared/utils/formatChannelNames';
import {
  ISOSURFACE_OPACITY_SLIDER_MAX,
  OBSERVED_CHANNEL_KEY,
  ISO_SURFACE_ENABLED,
  VOLUME_ENABLED
} from '../../shared/constants';
import { channelGroupTitles } from '../../shared/enums/channelGroups';

import colorPalette from '../../shared/colorPalette';
import SharedCheckBox from '../shared/SharedCheckBox';
import ChannelsWidgetRow from '../ChannelsWidgetRow';

import './styles.scss';

const { Panel } = Collapse;

export default class ChannelsWidget extends React.Component {
  constructor(props) {
    super(props);
    this.makeOnVolumeCheckHandler = this.makeOnVolumeCheckHandler.bind(this);
    this.makeOnIsosurfaceCheckHandler = this.makeOnIsosurfaceCheckHandler.bind(this);
    this.makeOnIsovalueChange = this.makeOnIsovalueChange.bind(this);
    this.makeOnOpacityChange = this.makeOnOpacityChange.bind(this);
    this.renderVisiblityControls = this.renderVisiblityControls.bind(this);
    this.showVolumes = this.showVolumes.bind(this);
    this.showSurfaces = this.showSurfaces.bind(this);
    this.hideVolumes = this.hideVolumes.bind(this);
    this.hideSurfaces = this.hideSurfaces.bind(this);
  }

  showVolumes(channelArray) {
    this.props.changeChannelSettings(channelArray, VOLUME_ENABLED, true);
  }

  showSurfaces(channelArray) {
    this.props.changeChannelSettings(channelArray, ISO_SURFACE_ENABLED, true);
  }

  hideVolumes(channelArray) {
    this.props.changeChannelSettings(channelArray, VOLUME_ENABLED, false);
  }

  hideSurfaces(channelArray) {
    this.props.changeChannelSettings(channelArray, ISO_SURFACE_ENABLED, false);
  }

  makeOnVolumeCheckHandler(index) {
    return ({ target }) => {
        this.props.changeOneChannelSetting(index, VOLUME_ENABLED, target.checked);
      
    };
  }

  makeOnIsosurfaceCheckHandler(index) {
    return ({ target }) => {
        this.props.changeOneChannelSetting(index, ISO_SURFACE_ENABLED, target.checked);
      
    };
  }

  makeOnIsovalueChange(index) {
    return (newValue) => {
      this.props.changeOneChannelSetting(index, 'isovalue', newValue);
    };
  }


  makeOnOpacityChange(index) {
    return (newValue) => {
      this.props.changeOneChannelSetting(index, 'opacity', newValue/ISOSURFACE_OPACITY_SLIDER_MAX);

    };
  }

  renderVisiblityControls(key, channelArray) {
    const { channels} = this.props;
    const volChecked = filter(channelArray, channelIndex => channels[channelIndex][VOLUME_ENABLED]);
    const isoChecked = filter(channelArray, channelIndex => channels[channelIndex][ISO_SURFACE_ENABLED]);
    return (
      <div style={STYLES.buttonRow}>
          <SharedCheckBox 
            allOptions={channelArray}
            checkedList={volChecked} 
            label="All volumes"
            onChecked={this.showVolumes}
            onUnchecekd={this.hideVolumes}
          />
          <SharedCheckBox
            allOptions={channelArray}
            checkedList={isoChecked}
            label="All surfaces"
            onChecked={this.showSurfaces}
            onUnchecekd={this.hideSurfaces}
          />
      </div>

    );
  }

  getRows() {
    const { channelGroupedByType, channels} = this.props;
    return map(channelGroupedByType, (channelArray, key) => {
      return (
        <Card
          bordered={false}
          title={channelGroupTitles[key] || key}
          extra={this.renderVisiblityControls(key, channelArray)}
          type="inner"
          key={key}
        >
        <Collapse 
          bordered={false}
          defaultActiveKey={key === OBSERVED_CHANNEL_KEY ? key : ""}>
            <Panel 
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
                                        channelDataForChannel={this.props.channelDataChannels[actualIndex]}
                                        lutControlPoints={this.props.channelDataChannels[actualIndex].lutControlPoints}
                                        channelDataReady={channel.dataReady}
                                        name={formatChannelName(channel.name)}
                                        onColorChangeComplete={this.props.onColorChangeComplete}
                                        volumeChecked={channel[VOLUME_ENABLED]}
                                        onVolumeCheckboxChange={this.makeOnVolumeCheckHandler(actualIndex)}
                                        changeOneChannelSetting={this.props.changeOneChannelSetting}
                                        isosurfaceChecked={channel[ISO_SURFACE_ENABLED]}
                                        onIsosurfaceChange={this.makeOnIsosurfaceCheckHandler(actualIndex)}
                                        onIsovalueChange={this.makeOnIsovalueChange(actualIndex)}
                                        onSaveIsosurfaceSTL={() => this.props.handleChangeToImage('saveIsoSurface', "STL", actualIndex)}
                                        onSaveIsosurfaceGLTF={() => this.props.handleChangeToImage('saveIsoSurface', "GLTF", actualIndex)}
                                        onOpacityChange={this.makeOnOpacityChange(actualIndex)}
                                        updateChannelTransferFunction={this.props.updateChannelTransferFunction}
                                        isovalue={channel.isovalue}
                                        opacity={channel.opacity}
                                        color={channel.color}
                                        />
                );}
              }
              />
            </Panel>
          </Collapse>
        </Card>
        );
    });
  }

  render() {
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
