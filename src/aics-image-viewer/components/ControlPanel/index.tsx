import React, { useState } from "react";

import { Card, Button, Dropdown, Icon, Menu } from "antd";

import ChannelsWidget, { ChannelsWidgetProps } from "../ChannelsWidget";
import GlobalVolumeControls, { GlobalVolumeControlsProps } from "../GlobalVolumeControls";
import CustomizeWidget, { CustomizeWidgetProps } from "../CustomizeWidget";

import { PRESET_COLOR_MAP } from "../../shared/constants";

import "./styles.css";
import ViewerIcon from "../shared/ViewerIcon";

interface ControlPanelProps extends ChannelsWidgetProps, GlobalVolumeControlsProps, CustomizeWidgetProps {
  hasImage: boolean;
  renderConfig: GlobalVolumeControlsProps["renderConfig"] & {
    colorPresetsDropdown: boolean;
  };
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
}

const enum ControlTab {
  Channels,
  Advanced,
}

const ControlTabNames = {
  [ControlTab.Channels]: "Channel Settings",
  [ControlTab.Advanced]: "Advanced Settings",
};

export default function ControlPanel(props: ControlPanelProps) {
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
      <div className="control-panel-tab-col" style={{ flex: "0 0 50px" }}>
        <Button
          className={"ant-btn-icon-only btn-collapse" + (props.collapsed ? " btn-collapse-collapsed" : "")}
          onClick={() => props.setCollapsed(!props.collapsed)}
        >
          <ViewerIcon type="closePanel" />
        </Button>
        <div className="tab-divider" />
        <Button
          className={tab === ControlTab.Channels ? "ant-btn-icon-only btn-tabactive" : "ant-btn-icon-only"}
          disabled={props.collapsed}
          onClick={() => setTab(ControlTab.Channels)}
        >
          <ViewerIcon type="channels" />
        </Button>
        <Button
          className={tab === ControlTab.Advanced ? "ant-btn-icon-only btn-tabactive" : "ant-btn-icon-only"}
          disabled={props.collapsed}
          onClick={() => setTab(ControlTab.Advanced)}
        >
          <ViewerIcon type="preferences" />
        </Button>
      </div>
      <div className="control-panel-col" style={{ flex: "0 0 450px" }}>
        <h2 className="control-panel-title">{ControlTabNames[tab]}</h2>
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
