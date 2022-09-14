import React, { useState } from "react";

import { Card, Button, Dropdown, Icon, Menu } from "antd";

import ChannelsWidget from "../ChannelsWidget";
import GlobalVolumeControls from "../GlobalVolumeControls";
import CustomizeWidget from "../CustomizeWidget";

import { PRESET_COLOR_MAP } from "../../shared/constants";

import "./styles.css";

const enum ControlTab {
  Channels,
  Advanced,
}

export default function ControlPanel(props) {
  const [tab, setTab] = useState(ControlTab.Channels);

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
    <div className="control-panel-col-container">
      <div className="control-panel-col control-panel-tab-col" style={{ flex: "0 0 50px" }}>
        <Button
          icon="vertical-right"
          size="large"
          className={"btn-borderless btn-collapse" + (props.collapsed ? " btn-collapse-collapsed" : "")}
          onClick={() => props.setCollapsed(!props.collapsed)}
        />
        <div className="tab-divider" />
        <Button
          icon="unordered-list"
          size="large"
          className={tab === ControlTab.Channels ? "btn-borderless btn-tabactive" : "btn-borderless"}
          disabled={props.collapsed}
          onClick={() => setTab(ControlTab.Channels)}
        />
        <Button
          icon="control"
          size="large"
          className={tab === ControlTab.Advanced ? "btn-borderless btn-tabactive" : "btn-borderless"}
          disabled={props.collapsed}
          onClick={() => setTab(ControlTab.Advanced)}
        />
      </div>
      <div className="control-panel-col" style={{ flex: "1 1 auto" }}>
        <Card
          bordered={false}
          className="control-panel"
          title={renderConfig.colorPresetsDropdown && tab === ControlTab.Channels && renderColorPresetsDropdown()}
        >
          {hasImage && (
            <div className="channel-rows-list">
              {tab === ControlTab.Channels && (
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
              )}
              {tab === ControlTab.Advanced && (
                <>
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
                </>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
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
