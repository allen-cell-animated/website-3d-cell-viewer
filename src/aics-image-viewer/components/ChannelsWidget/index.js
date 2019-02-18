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
  OBSERVED_CHANNEL_KEY
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
    this.makeOnCheckHandler = this.makeOnCheckHandler.bind(this);
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
    return ({ target }) => {
      if (this.props.setVolumeEnabled) {
        this.props.setVolumeEnabled(index, target.checked);
      }
    };
  }

  makeOnIsosurfaceCheckHandler(index) {
    return ({ target }) => {
      if (this.props.setIsosurfaceEnabled) {
        this.props.setIsosurfaceEnabled(index, target.checked);
      }
    };
  }

  makeOnIsovalueChange(index) {
    return (newValue) => {
      this.props.updateIsovalue(index, newValue);
    };
  }


  makeOnOpacityChange(index) {
    return (newValue) => {
      this.props.updateIsosurfaceOpacity(index, newValue/ISOSURFACE_OPACITY_SLIDER_MAX);
    };
  }

  renderVisiblityControls(key, channelArray) {
    const { channels} = this.props;
    const volChecked = filter(channelArray, channelIndex => channels[channelIndex].volumeEnabled);
    const isoChecked = filter(channelArray, channelIndex => channels[channelIndex].isosurfaceEnabled);
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
                                        checked={channel.channelEnabled}
                                        onChange={this.makeOnCheckHandler(actualIndex)}
                                        onColorChange={this.props.onColorChange}
                                        onColorChangeComplete={this.props.onColorChangeComplete}
                                        volumeChecked={channel.volumeEnabled}
                                        onVolumeCheckboxChange={this.makeOnVolumeCheckHandler(actualIndex)}
                                        isosurfaceChecked={channel.isosurfaceEnabled}
                                        onIsosurfaceChange={this.makeOnIsosurfaceCheckHandler(actualIndex)}
                                        onIsovalueChange={this.makeOnIsovalueChange(actualIndex)}
                                        onSaveIsosurfaceSTL={this.props.makeOnSaveIsosurfaceHandler(actualIndex, "STL")}
                                        onSaveIsosurfaceGLTF={this.props.makeOnSaveIsosurfaceHandler(actualIndex, "GLTF")}
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
