import React from "react";

import { Card, Button, Dropdown, Icon, Menu } from "antd";

import ChannelsWidget from "../ChannelsWidget";
import GlobalVolumeControls from "../GlobalVolumeControls";
import CustomizeWidget from "../CustomizeWidget";

import { PRESET_COLOR_MAP } from "../../shared/constants";

import "./styles.css";

export default class ControlPanel extends React.Component {
  constructor(props) {
    super(props);
    this.makeTurnOnPresetFn = this.makeTurnOnPresetFn.bind(this);
    this.onColorChangeComplete = this.onColorChangeComplete.bind(this);
    this.state = { palette: 0, customColor: false };
  }

  makeTurnOnPresetFn({ key }) {
    const presets = PRESET_COLOR_MAP[key].colors;
    this.setState({ palette: key, customColor: false });
    this.props.onApplyColorPresets(presets);
  }

  renderColorPresetsDropdown() {
    const dropDownMenuItems = (
      <Menu onClick={this.makeTurnOnPresetFn}>
        {PRESET_COLOR_MAP.map((preset, _index) => (
          <Menu.Item key={preset.key}>{preset.name}</Menu.Item>
        ))}
      </Menu>
    );
    return (
      <>
        Palette preset:
        <Dropdown trigger={["click"]} overlay={dropDownMenuItems}>
          <Button style={{ marginLeft: "12px" }}>
            {this.state.customColor ? "Custom" : PRESET_COLOR_MAP[this.state.palette].name }
            <Icon type="down" />
          </Button>
        </Dropdown>
      </>
    );
  }

  onColorChangeComplete() {
    if (this.props.onColorChangeComplete) {
      this.props.onColorChangeComplete();
    }
    if (!this.state.customColor) {
      this.setState({ customColor: true });
    }
  }

  render() {
    const { viewerChannelSettings, renderConfig, appHeight, hasImage } = this.props;
    return (
      <Card
        style={{ ...STYLES.wrapper, height: appHeight }}
        bordered={false}
        className="control-panel"
        title={renderConfig.colorPresetsDropdown && this.renderColorPresetsDropdown()}
      >
        {hasImage && (
          <div className="channel-rows-list">
            <ChannelsWidget
              imageName={this.props.imageName}
              channelSettings={this.props.channelSettings}
              channelDataChannels={this.props.channelDataChannels}
              channelGroupedByType={this.props.channelGroupedByType}
              changeChannelSettings={this.props.changeChannelSettings}
              channelDataReady={this.props.channelDataReady}
              handleChangeToImage={this.props.handleChangeToImage}
              updateChannelTransferFunction={this.props.updateChannelTransferFunction}
              changeOneChannelSetting={this.props.changeOneChannelSetting}
              onColorChangeComplete={this.onColorChangeComplete}
              onApplyColorPresets={this.props.onApplyColorPresets}
              style={STYLES.channelsWidget}
              renderConfig={renderConfig}
              filterFunc={this.props.filterFunc}
              viewerChannelSettings={viewerChannelSettings}
            />
            <GlobalVolumeControls
              mode={this.props.mode}
              imageName={this.props.imageName}
              pixelSize={this.props.pixelSize}
              handleChangeUserSelection={this.props.handleChangeUserSelection}
              setImageAxisClip={this.props.setImageAxisClip}
              makeUpdatePixelSizeFn={this.props.makeUpdatePixelSizeFn}
              alphaMaskSliderLevel={this.props.alphaMaskSliderLevel}
              brightnessSliderLevel={this.props.brightnessSliderLevel}
              densitySliderLevel={this.props.densitySliderLevel}
              gammaSliderLevel={this.props.gammaSliderLevel}
              maxProjectOn={this.props.maxProjectOn}
              canPathTrace={this.props.canPathTrace}
              pathTraceOn={this.props.pathTraceOn}
              renderConfig={renderConfig}
            />
            <CustomizeWidget
              backgroundColor={this.props.backgroundColor}
              boundingBoxColor={this.props.boundingBoxColor}
              changeBackgroundColor={this.props.changeBackgroundColor}
              changeBoundingBoxColor={this.props.changeBoundingBoxColor}
              showBoundingBox={this.props.showBoundingBox}
            />
          </div>
        )}
      </Card>
    );
  }
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
