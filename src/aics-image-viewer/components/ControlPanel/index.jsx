import React from "react";

import { Card, Button, Dropdown, Icon, Menu } from "antd";

import ChannelsWidget from "../ChannelsWidget";
import GlobalVolumeControls from "../GlobalVolumeControls";
import CustomizeWidget from "../CustomizeWidget";

import { PRESET_COLOR_MAP } from "../../shared/constants";

import "./styles.css";

export default function ControlPanel(props) {
  const { viewerChannelSettings, renderConfig, hasImage } = props;

  const makeTurnOnPresetFn = ({ key }) => props.onApplyColorPresets(PRESET_COLOR_MAP[key].colors);

  const renderColorPresetsDropdown = () => {
    const dropDownMenuItems = (
      <Menu onClick={makeTurnOnPresetFn}>
        {PRESET_COLOR_MAP.map((preset, _index) => (
          <Menu.Item key={preset.key}>{preset.name}</Menu.Item>
        ))}
      </Menu>
    );
    return (
      <Dropdown trigger={["click"]} overlay={dropDownMenuItems}>
        <Button>
          Apply palette
          <Icon type="down" />
        </Button>
      </Dropdown>
    );
  };

  return (
    <Card
      bordered={false}
      className="control-panel"
      title={renderConfig.colorPresetsDropdown && renderColorPresetsDropdown()}
    >
      {hasImage && (
        <div className="channel-rows-list">
          <ChannelsWidget
            imageName={props.imageName}
            channelSettings={props.channelSettings}
            channelDataChannels={props.channelDataChannels}
            channelGroupedByType={props.channelGroupedByType}
            changeChannelSettings={props.changeChannelSettings}
            channelDataReady={props.channelDataReady}
            handleChangeToImage={props.handleChangeToImage}
            updateChannelTransferFunction={props.updateChannelTransferFunction}
            changeOneChannelSetting={props.changeOneChannelSetting}
            onColorChangeComplete={props.onColorChangeComplete}
            onApplyColorPresets={props.onApplyColorPresets}
            style={STYLES.channelsWidget}
            renderConfig={renderConfig}
            filterFunc={props.filterFunc}
            viewerChannelSettings={viewerChannelSettings}
          />
          <GlobalVolumeControls
            mode={props.mode}
            imageName={props.imageName}
            pixelSize={props.pixelSize}
            handleChangeUserSelection={props.handleChangeUserSelection}
            setImageAxisClip={props.setImageAxisClip}
            makeUpdatePixelSizeFn={props.makeUpdatePixelSizeFn}
            alphaMaskSliderLevel={props.alphaMaskSliderLevel}
            brightnessSliderLevel={props.brightnessSliderLevel}
            densitySliderLevel={props.densitySliderLevel}
            gammaSliderLevel={props.gammaSliderLevel}
            maxProjectOn={props.maxProjectOn}
            canPathTrace={props.canPathTrace}
            pathTraceOn={props.pathTraceOn}
            renderConfig={renderConfig}
          />
          <CustomizeWidget
            backgroundColor={props.backgroundColor}
            boundingBoxColor={props.boundingBoxColor}
            changeBackgroundColor={props.changeBackgroundColor}
            changeBoundingBoxColor={props.changeBoundingBoxColor}
            showBoundingBox={props.showBoundingBox}
          />
        </div>
      )}
    </Card>
  );
}

const STYLES = {
  channelsWidget: {
    padding: 0,
  },
  noImage: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },
  button: {
    margin: "auto",
  },
};
