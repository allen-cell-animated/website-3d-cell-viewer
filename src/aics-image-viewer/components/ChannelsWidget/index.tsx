import React from "react";
import { find } from "lodash";
import { Collapse, CollapseProps, List } from "antd";
import { Channel } from "@aics/volume-viewer";

import {
  ChannelGrouping,
  ChannelSettingUpdater,
  getDisplayName,
  MultipleChannelSettingsUpdater,
} from "../../shared/utils/viewerChannelSettings";

import SharedCheckBox from "../shared/SharedCheckBox";
import ChannelsWidgetRow from "../ChannelsWidgetRow";

import { ChannelState, ViewerChannelSettings, ChannelStateKey } from "../../shared/utils/viewerChannelSettings";
import { ColorArray, ColorObject } from "../../shared/utils/colorRepresentations";
import { IsosurfaceFormat } from "../../shared/types";

export type ChannelsWidgetProps = {
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
};

// export default class ChannelsWidget extends React.Component<ChannelsWidgetProps, {}> {
const ChannelsWidget: React.FC<ChannelsWidgetProps> = (props: ChannelsWidgetProps) => {
  const { channelGroupedByType, channelSettings, channelDataChannels, filterFunc, viewerChannelSettings } = props;

  const createCheckboxHandler = (key: ChannelStateKey, value: boolean) => (channelArray: number[]) => {
    props.changeMultipleChannelSettings(channelArray, key, value);
  };

  const showVolumes = createCheckboxHandler("volumeEnabled", true);
  const showSurfaces = createCheckboxHandler("isosurfaceEnabled", true);
  const hideVolumes = createCheckboxHandler("volumeEnabled", false);
  const hideSurfaces = createCheckboxHandler("isosurfaceEnabled", false);

  const renderVisibilityControls = (channelArray: number[]): React.ReactNode => {
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
      <div>
        <SharedCheckBox
          allOptions={channelArray}
          checkedList={volChecked}
          onChecked={showVolumes}
          onUnchecked={hideVolumes}
        >
          All Vol
        </SharedCheckBox>
        <SharedCheckBox
          allOptions={channelArray}
          checkedList={isoChecked}
          onChecked={showSurfaces}
          onUnchecked={hideSurfaces}
        >
          All Surf
        </SharedCheckBox>
      </div>
    );
  };

  const renderChannelRow = (channelIndex: number): React.ReactNode => {
    const thisChannelSettings = find(
      channelSettings,
      (channel: ChannelState) => channel.name === channelDataChannels?.[channelIndex].name
    );

    return thisChannelSettings ? (
      <ChannelsWidgetRow
        key={`${channelIndex}_${thisChannelSettings.name}_${channelIndex}`}
        index={channelIndex}
        channelDataForChannel={channelDataChannels![channelIndex]}
        name={getDisplayName(thisChannelSettings.name, channelIndex, viewerChannelSettings)}
        volumeChecked={thisChannelSettings.volumeEnabled}
        isosurfaceChecked={thisChannelSettings.isosurfaceEnabled}
        channelControlPoints={thisChannelSettings.controlPoints}
        colorizeEnabled={thisChannelSettings.colorizeEnabled}
        colorizeAlpha={thisChannelSettings.colorizeAlpha}
        color={thisChannelSettings.color}
        changeChannelSetting={props.changeChannelSetting}
        onColorChangeComplete={props.onColorChangeComplete}
        saveIsosurface={props.saveIsosurface}
      />
    ) : null;
  };

  const firstKey = Object.keys(channelGroupedByType)[0];
  const rows: CollapseProps["items"] =
    channelDataChannels &&
    Object.entries(channelGroupedByType)
      .filter(([key, channelArray]) => channelArray.length > 0 && (!filterFunc || filterFunc(key)))
      .map(([key, channelArray]) => {
        const children = <List itemLayout="horizontal" dataSource={channelArray} renderItem={renderChannelRow} />;

        return {
          key,
          label: key,
          children,
          extra: renderVisibilityControls(channelArray),
        };
      });

  return <Collapse bordered={false} defaultActiveKey={firstKey} items={rows} collapsible="icon" />;
};

export default ChannelsWidget;
