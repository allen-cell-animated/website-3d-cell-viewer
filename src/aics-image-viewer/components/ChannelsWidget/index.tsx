import React from "react";
import { map, find } from "lodash";
import { Card, Collapse, List } from "antd";
import { Channel } from "@aics/volume-viewer";

import {
  ChannelGrouping,
  ChannelSettingUpdater,
  getDisplayName,
  MultipleChannelSettingsUpdater,
} from "../../shared/utils/viewerChannelSettings";

import colorPalette from "../../shared/colorPalette";
import SharedCheckBox from "../shared/SharedCheckBox";
import ChannelsWidgetRow from "../ChannelsWidgetRow";

import "./styles.css";

const { Panel } = Collapse;

import { ChannelState, ViewerChannelSettings, ChannelStateKey } from "../../shared/utils/viewerChannelSettings";
import { ColorArray, ColorObject } from "../../shared/utils/colorRepresentations";
import { IsosurfaceFormat, Styles } from "../../shared/types";

export interface ChannelsWidgetProps {
  imageLoaded: boolean;
  channelDataChannels: Channel[] | undefined;
  channelSettings: ChannelState[];
  channelGroupedByType: ChannelGrouping;
  viewerChannelSettings?: ViewerChannelSettings;

  changeChannelSetting: ChannelSettingUpdater;
  changeMultipleChannelSettings: MultipleChannelSettingsUpdater;

  saveIsosurface: (channelIndex: number, type: IsosurfaceFormat) => void;
  onApplyColorPresets: (presets: ColorArray[]) => void;

  filterFunc?: (key: string) => boolean;
  onColorChangeComplete?: (newRGB: ColorObject, oldRGB?: ColorObject, index?: number) => void;
}

export default class ChannelsWidget extends React.Component<ChannelsWidgetProps, {}> {
  constructor(props: ChannelsWidgetProps) {
    super(props);
  }

  createCheckboxHandler = (key: ChannelStateKey, value: boolean) => (channelArray: number[]) => {
    this.props.changeMultipleChannelSettings(channelArray, key, value);
  };

  showVolumes = this.createCheckboxHandler("volumeEnabled", true);
  showSurfaces = this.createCheckboxHandler("isosurfaceEnabled", true);
  hideVolumes = this.createCheckboxHandler("volumeEnabled", false);
  hideSurfaces = this.createCheckboxHandler("isosurfaceEnabled", false);

  renderVisibilityControls(channelArray: number[]): React.ReactNode {
    const { channelSettings, channelDataChannels } = this.props;

    let volChecked: number[] = [];
    let isoChecked: number[] = [];
    channelArray.forEach((channelIndex: number) => {
      const name = channelDataChannels![channelIndex].name;
      const channelSetting = find(channelSettings, { name });
      if (!channelSetting) return;
      if (channelSetting.volumeEnabled) {
        volChecked.push(channelIndex);
      }
      if (channelSetting.isosurfaceEnabled) {
        isoChecked.push(channelIndex);
      }
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

  getRows(): React.ReactNode {
    const { channelGroupedByType, channelSettings, channelDataChannels, filterFunc, viewerChannelSettings } =
      this.props;

    if (channelDataChannels === undefined) {
      return;
    }

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
                    (channel: ChannelState) => channel.name === channelDataChannels[actualIndex].name
                  );

                  return thisChannelSettings ? (
                    <ChannelsWidgetRow
                      key={`${actualIndex}_${thisChannelSettings.name}_${actualIndex}`}
                      index={actualIndex}
                      channelDataForChannel={channelDataChannels[actualIndex]}
                      name={getDisplayName(thisChannelSettings.name, actualIndex, viewerChannelSettings)}
                      volumeChecked={thisChannelSettings.volumeEnabled}
                      isosurfaceChecked={thisChannelSettings.isosurfaceEnabled}
                      channelControlPoints={thisChannelSettings.controlPoints}
                      colorizeEnabled={thisChannelSettings.colorizeEnabled}
                      colorizeAlpha={thisChannelSettings.colorizeAlpha}
                      color={thisChannelSettings.color}
                      changeChannelSetting={this.props.changeChannelSetting}
                      onColorChangeComplete={this.props.onColorChangeComplete}
                      saveIsosurface={this.props.saveIsosurface}
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

  render(): React.ReactNode {
    return <div>{this.getRows()}</div>;
  }
}

const STYLES: Styles = {
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
