import React from "react";
import { map, find } from "lodash";

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

import { ViewerChannelSettings } from "../../shared/utils/viewerChannelSettings";
import { ColorObject } from "../../shared/utils/colorRepresentations";

interface ChannelSettings {
  name: string;
  enabled: boolean;
  volumeEnabled: boolean;
  isosurfaceEnabled: boolean;
  isovalue: number;
  opacity: number;
  color: [number, number, number];
  dataReady: boolean;
  controlPoints: {
    color: string;
    opacity: number;
    x: number;
  }[];
}

export interface ChannelsWidgetProps {
  imageName: string;
  channelSettings: ChannelSettings[];
  channelDataChannels: any[]; // volume-viewer Channel type
  channelGroupedByType: { [key: string]: number[] };
  channelDataReady: { [key: string]: boolean };
  viewerChannelSettings?: ViewerChannelSettings;

  handleChangeToImage: (keyToChange: string, newValue: any, index?: number) => void;
  changeChannelSettings: (indices: number[], keyToChange: string, newValue: any) => void;
  changeOneChannelSetting: (channelName: string, channelIndex: number, keyToChange: string, newValue: any) => void;
  onApplyColorPresets: (presets: [number, number, number, number?][]) => void;
  updateChannelTransferFunction: (index: number, lut: Uint8Array) => void;

  filterFunc?: (key: string) => boolean;
  onColorChangeComplete?: (newRGB: ColorObject, oldRGB?: ColorObject, index?: number) => void;
}

export default class ChannelsWidget extends React.Component<ChannelsWidgetProps, {}> {
  constructor(props: ChannelsWidgetProps) {
    super(props);
    this.renderVisibilityControls = this.renderVisibilityControls.bind(this);
    this.showVolumes = this.showVolumes.bind(this);
    this.showSurfaces = this.showSurfaces.bind(this);
    this.hideVolumes = this.hideVolumes.bind(this);
    this.hideSurfaces = this.hideSurfaces.bind(this);
  }

  showVolumes(channelArray: number[]) {
    this.props.changeChannelSettings(channelArray, VOLUME_ENABLED, true);
  }

  showSurfaces(channelArray: number[]) {
    this.props.changeChannelSettings(channelArray, ISO_SURFACE_ENABLED, true);
  }

  hideVolumes(channelArray: number[]) {
    this.props.changeChannelSettings(channelArray, VOLUME_ENABLED, false);
  }

  hideSurfaces(channelArray: number[]) {
    this.props.changeChannelSettings(channelArray, ISO_SURFACE_ENABLED, false);
  }

  renderVisibilityControls(channelArray: number[]) {
    const { channelSettings, channelDataChannels } = this.props;

    const arrayOfNames = channelArray.map((channelIndex: number) => channelDataChannels[channelIndex].name);
    const volChecked = arrayOfNames.filter((name: string) => {
      const channelSetting = find(channelSettings, { name });
      return channelSetting && channelSetting[VOLUME_ENABLED];
    });
    const isoChecked = arrayOfNames.filter((name: string) => {
      const channelSetting = find(channelSettings, { name });
      return channelSetting && channelSetting[ISO_SURFACE_ENABLED];
    });
    return (
      <div style={STYLES.buttonRow}>
        <SharedCheckBox
          allOptions={channelArray}
          checkedList={volChecked}
          onChecked={this.showVolumes}
          onUnchecked={this.hideVolumes}
        >
          All volumes
        </SharedCheckBox>
        <SharedCheckBox
          allOptions={channelArray}
          checkedList={isoChecked}
          onChecked={this.showSurfaces}
          onUnchecked={this.hideSurfaces}
        >
          All surfaces
        </SharedCheckBox>
      </div>
    );
  }

  getRows() {
    const { channelGroupedByType, channelSettings, channelDataChannels, filterFunc, imageName, viewerChannelSettings } =
      this.props;
    const firstKey = Object.keys(channelGroupedByType)[0];
    return map(channelGroupedByType, (channelArray: number[], key: string) => {
      if (!channelArray.length || (filterFunc && !filterFunc(key))) {
        return null;
      }
      return (
        <Card bordered={false} title={key} extra={this.renderVisibilityControls(channelArray)} type="inner" key={key}>
          <Collapse bordered={false} defaultActiveKey={key === firstKey ? key : ""}>
            <Panel key={key} header={null}>
              <List
                itemLayout="horizontal"
                dataSource={channelArray}
                renderItem={(actualIndex: number) => {
                  const thisChannelSettings = find(
                    channelSettings,
                    (channel: ChannelSettings) => channel.name === channelDataChannels[actualIndex].name
                  );

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
                      color={thisChannelSettings.color}
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
