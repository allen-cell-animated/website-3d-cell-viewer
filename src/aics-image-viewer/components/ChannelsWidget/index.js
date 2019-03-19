import React from 'react';
import { map, filter } from 'lodash';

import {
  Card,
  Collapse,
  List,
} from 'antd';

import formatChannelName from '../../shared/utils/formatChannelNames';
import {
  ISO_SURFACE_ENABLED,
  LUT_CONTROL_POINTS,
  OBSERVED_CHANNEL_KEY,
  VOLUME_ENABLED,
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
    const { 
      channelGroupedByType, 
      channels, 
      channelDataReady,
      channelDataChannels,
    } = this.props;
    return map(channelGroupedByType, (channelArray, key) => {
      console.log(channelArray);
      if (!channelArray.length) {
        return null;
      }
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
                  if (channel.hideChannel) {
                    return [];
                  }
                  return (
                  <ChannelsWidgetRow    key={`${actualIndex}_${channel.name}_${actualIndex}`}
                                        index={actualIndex}
                                        channelDataForChannel={channelDataChannels[actualIndex]}
                                        name={formatChannelName(channel.name)}
                                        volumeChecked={channel[VOLUME_ENABLED]}
                                        isosurfaceChecked={channel[ISO_SURFACE_ENABLED]}
                                        channelDataReady={channelDataReady[actualIndex]}
                                        channelControlPoints={channel[LUT_CONTROL_POINTS]}
                                        isovalue={channel.isovalue}
                                        opacity={channel.opacity}
                                        color={channel.color}
                                        updateChannelTransferFunction={this.props.updateChannelTransferFunction}
                                        changeOneChannelSetting={this.props.changeOneChannelSetting}
                                        onColorChangeComplete={this.props.onColorChangeComplete}
                                        handleChangeToImage={this.props.handleChangeToImage}

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
