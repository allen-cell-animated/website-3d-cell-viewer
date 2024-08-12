import React from "react";
import { find } from "lodash";
import { Button, Collapse, CollapseProps, List } from "antd";
import { Channel } from "@aics/volume-viewer";

import type { ChannelGrouping, ViewerChannelSettings } from "../shared/utils/viewerChannelSettings";
import { getDisplayName } from "../shared/utils/viewerChannelSettings";
import type { ColorArray, ColorObject } from "../shared/utils/colorRepresentations";
import type { IsosurfaceFormat } from "../shared/types";

import ChannelsWidgetRow from "./ChannelsWidgetRow";
import SharedCheckBox from "./shared/SharedCheckBox";
import { connectToViewerState } from "./ViewerStateProvider";
import type { ChannelSettingUpdater, ChannelState, ChannelStateKey } from "./ViewerStateProvider/types";
import { DEFAULT_CHANNEL_STATE, PRESET_COLOR_MAP } from "../shared/constants";
import { controlPointsToRamp, getDefaultLut } from "../shared/utils/controlPointsToLut";

export type ChannelsWidgetProps = {
  // From parent
  channelDataChannels: Channel[] | undefined;
  channelGroupedByType: ChannelGrouping;
  viewerChannelSettings?: ViewerChannelSettings;

  saveIsosurface: (channelIndex: number, type: IsosurfaceFormat) => void;
  onApplyColorPresets: (presets: ColorArray[]) => void;

  filterFunc?: (key: string) => boolean;
  onColorChangeComplete?: (newRGB: ColorObject, oldRGB?: ColorObject, index?: number) => void;

  // From viewer state
  channelSettings: ChannelState[];
  changeChannelSetting: ChannelSettingUpdater;
};

const ChannelsWidget: React.FC<ChannelsWidgetProps> = (props: ChannelsWidgetProps) => {
  const { channelGroupedByType, channelSettings, channelDataChannels, filterFunc, viewerChannelSettings } = props;

  const createCheckboxHandler = (key: ChannelStateKey, value: boolean) => (channelArray: number[]) => {
    props.changeChannelSetting(channelArray, key, value);
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
      <>
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
          // keep checkboxes lined up when channel rows have settings icon and headers don't
          style={{ flex: 5 }}
        >
          All Surf
        </SharedCheckBox>
      </>
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
        channelState={thisChannelSettings}
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

  const resetAllChannelsToDefaults = (): void => {
    if (!channelDataChannels) {
      return;
    }
    const allChannelStateKeys = Object.keys(DEFAULT_CHANNEL_STATE) as ChannelStateKey[];
    const excludedKeys: ChannelStateKey[] = ["name", "controlPoints", "ramp", "useControlPoints"];
    const channelStateKeysToReset = allChannelStateKeys.filter((key) => !excludedKeys.includes(key));

    // Reset control points and ramp for each channel
    for (let i = 0; i < channelDataChannels.length; i++) {
      const channelData = channelDataChannels[i];
      const defaultLut = getDefaultLut(channelData.getHistogram());
      props.changeChannelSetting(i, "controlPoints", defaultLut.controlPoints);
      props.changeChannelSetting(i, "ramp", controlPointsToRamp(defaultLut.controlPoints));
      props.changeChannelSetting(i, "useControlPoints", false);
    }
    // Reset all other settings. Also, enable volumes on only the first three channels.
    channelSettings.forEach((_channelSetting, index) => {
      for (const key of channelStateKeysToReset) {
        if (key === "volumeEnabled" && index < 3) {
          props.changeChannelSetting(index, key, true);
          continue;
        }
        props.changeChannelSetting(index, key, DEFAULT_CHANNEL_STATE[key]);
      }
    });

    // Apply default color map
    props.onApplyColorPresets(PRESET_COLOR_MAP[0].colors);
  };

  return (
    <div>
      <Collapse bordered={false} defaultActiveKey={firstKey} items={rows} collapsible="icon" />
      <div style={{ padding: "20px 15px" }}>
        <Button onClick={resetAllChannelsToDefaults}>Reset all channels</Button>
      </div>
    </div>
  );
};

export default connectToViewerState(ChannelsWidget, ["channelSettings", "changeChannelSetting"]);
