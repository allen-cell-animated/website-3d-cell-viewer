import React, { useState } from "react";

import { Card, Button, Dropdown, Icon, Menu, Tooltip } from "antd";
import { ClickParam } from "antd/lib/menu";

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

export default function ControlPanel(props: ControlPanelProps): React.ReactElement {
  const [tab, setTab] = useState(ControlTab.Channels);

  const { viewerChannelSettings, renderConfig, hasImage } = props;

  // TODO key is a number, but ClickParam assumes keys will always be strings
  //   if future versions of antd make this type more permissive, remove ugly double-cast
  const makeTurnOnPresetFn = ({ key }: ClickParam): void =>
    props.onApplyColorPresets(PRESET_COLOR_MAP[key as unknown as number].colors);

  const renderColorPresetsDropdown = (): React.ReactNode => {
    const dropDownMenuItems = (
      <Menu onClick={makeTurnOnPresetFn}>
        {PRESET_COLOR_MAP.map((preset, index) => (
          <Menu.Item key={index}>{preset.name}</Menu.Item>
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

        <Tooltip
          title={ControlTabNames[ControlTab.Channels]}
          placement="right"
          {...(!props.collapsed && { visible: false })}
        >
          <Button
            className={tab === ControlTab.Channels ? "ant-btn-icon-only btn-tabactive" : "ant-btn-icon-only"}
            onClick={() => setTab(ControlTab.Channels)}
          >
            <ViewerIcon type="channels" />
          </Button>
        </Tooltip>

        <Tooltip
          title={ControlTabNames[ControlTab.Advanced]}
          placement="right"
          {...(!props.collapsed && { visible: false })}
        >
          <Button
            className={tab === ControlTab.Advanced ? "ant-btn-icon-only btn-tabactive" : "ant-btn-icon-only"}
            onClick={() => setTab(ControlTab.Advanced)}
          >
            <ViewerIcon type="preferences" />
          </Button>
        </Tooltip>
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
                  saveIsosurface={props.saveIsosurface}
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
                    imageName={props.imageName}
                    pixelSize={props.pixelSize}
                    changeUserSelection={props.changeUserSelection}
                    setImageAxisClip={props.setImageAxisClip}
                    makeUpdatePixelSizeFn={props.makeUpdatePixelSizeFn}
                    maskAlpha={props.maskAlpha}
                    brightness={props.brightness}
                    density={props.density}
                    levels={props.levels}
                    interpolationEnabled={props.interpolationEnabled}
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
