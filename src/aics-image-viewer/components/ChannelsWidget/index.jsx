import React from "react";
import { map, filter, find } from "lodash";

import { Card, Collapse, List } from "antd";

import { getDisplayName } from "../../shared/utils/viewerChannelSettings";
import {
  COLORIZE_ALPHA,
  COLORIZE_ENABLED,
  ISO_SURFACE_ENABLED,
  LUT_CONTROL_POINTS,
  VOLUME_ENABLED,
} from "../../shared/constants";

import colorPalette from "../../shared/colorPalette";
import SharedCheckBox from "../shared/SharedCheckBox";
import ChannelsWidgetRow from "../ChannelsWidgetRow";

import "./styles.css";

const { Panel } = Collapse;

export default class ChannelsWidget extends React.Component {
  constructor(props) {
    super(props);
    this.renderVisibilityControls = this.renderVisibilityControls.bind(this);
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

  renderVisibilityControls(key, channelArray) {
    const { channelSettings, channelDataChannels } = this.props;

    const arrayOfNames = map(channelArray, (channelIndex) => {
      return channelDataChannels[channelIndex].name;
    });
    const volChecked = filter(arrayOfNames, (name) =>
      find(channelSettings, { name: name }) ? find(channelSettings, { name: name })[VOLUME_ENABLED] : false
    );
    const isoChecked = filter(arrayOfNames, (name) =>
      find(channelSettings, { name: name }) ? find(channelSettings, { name: name })[ISO_SURFACE_ENABLED] : false
    );
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
      channelSettings,
      channelDataReady,
      channelDataChannels,
      filterFunc,
      imageName,
      viewerChannelSettings,
    } = this.props;
    const firstKey = Object.keys(channelGroupedByType)[0];
    return map(channelGroupedByType, (channelArray, key) => {
      if (!channelArray.length || (filterFunc && !filterFunc(key))) {
        return null;
      }
      return (
        <Card
          bordered={false}
          title={key}
          extra={this.renderVisibilityControls(key, channelArray)}
          type="inner"
          key={key}
        >
          <Collapse bordered={false} defaultActiveKey={key === firstKey ? key : ""}>
            <Panel key={key}>
              <List
                itemLayout="horizontal"
                dataSource={channelArray}
                renderItem={(actualIndex) => {
                  const thisChannelSettings = find(channelSettings, (channel) => {
                    return channel.name === channelDataChannels[actualIndex].name;
                  });

                  return thisChannelSettings ? (
                    <ChannelsWidgetRow
                      key={`${actualIndex}_${thisChannelSettings.name}_${actualIndex}`}
                      index={actualIndex}
                      imageName={imageName}
                      channelName={thisChannelSettings.name}
                      channelDataForChannel={channelDataChannels[actualIndex]}
                      name={getDisplayName(thisChannelSettings.name, actualIndex, viewerChannelSettings)}
                      volumeChecked={thisChannelSettings[VOLUME_ENABLED]}
                      isosurfaceChecked={thisChannelSettings[ISO_SURFACE_ENABLED]}
                      channelControlPoints={thisChannelSettings[LUT_CONTROL_POINTS]}
                      colorizeEnabled={thisChannelSettings[COLORIZE_ENABLED]}
                      colorizeAlpha={thisChannelSettings[COLORIZE_ALPHA]}
                      isovalue={thisChannelSettings.isovalue}
                      opacity={thisChannelSettings.opacity}
                      color={thisChannelSettings.color}
                      channelDataReady={channelDataReady[actualIndex]}
                      updateChannelTransferFunction={this.props.updateChannelTransferFunction}
                      changeOneChannelSetting={this.props.changeOneChannelSetting}
                      onColorChangeComplete={this.props.onColorChangeComplete}
                      handleChangeToImage={this.props.handleChangeToImage}
                    />
                  ) : (
                    <div></div>
                  );
                }}
              />
            </Panel>
          </Collapse>
        </Card>
      );
    });
  }

  render() {
    return <div>{this.getRows()}</div>;
  }
}

const STYLES = {
  header: {
    textAlign: "left",
    fontWeight: 900,
  },
  buttonRow: {
    display: "flex",
    flexFlow: "row wrap",
    justifyContent: "flex-end",
  },
  button: {
    display: "inline-block",
    minWidth: "initial",
    height: "initial",
    color: colorPalette.primary1Color,
    padding: 0,
    width: 24,
  },
  presetRow: {
    width: "100%",
  },
};
