import React from "react";

import { Card, Button, Dropdown, Radio, Icon, Menu } from "antd";

import ViewModeRadioButtons from "../ViewModeRadioButtons";
import ChannelsWidget from "../ChannelsWidget";
import GlobalVolumeControls from "../GlobalVolumeControls";
import CustomizeWidget from "../CustomizeWidget";

import {
  PRESET_COLOR_MAP,
  SEGMENTED_CELL,
  FULL_FIELD_IMAGE,
  PATH_TRACE,
  MAX_PROJECT,
  VOLUMETRIC_RENDER,
} from "../../shared/constants";
import enums from "../../shared/enums";

import "./styles.css";
const ViewMode = enums.viewMode.mainMapping;

const RadioGroup = Radio.Group;

export default class ControlPanel extends React.Component {
  constructor(props) {
    super(props);
    this.handleToggle = this.handleToggle.bind(this);
    this.makeTurnOnPresetFn = this.makeTurnOnPresetFn.bind(this);
    this.handleSwitchFovCell = this.handleSwitchFovCell.bind(this);
    this.changeRenderMode = this.changeRenderMode.bind(this);
    this.state = { open: true };
  }

  handleToggle() {
    this.setState({ open: !this.state.open });
  }

  makeTurnOnPresetFn({ key }) {
    const presets = PRESET_COLOR_MAP[key].colors;
    this.props.onApplyColorPresets(presets);
  }

  createFovCellSwitchControls() {
    const { imageType, hasCellId, hasParentImage } = this.props;
    return (
      hasCellId &&
      hasParentImage && (
        <RadioGroup
          defaultValue={imageType}
          onChange={this.handleSwitchFovCell}
        >
          <Radio.Button value={SEGMENTED_CELL}>Cell</Radio.Button>
          <Radio.Button value={FULL_FIELD_IMAGE}>Full Field</Radio.Button>
        </RadioGroup>
      )
    );
  }

  handleSwitchFovCell({ target }) {
    this.props.onSwitchFovCell(target.value);
  }

  renderColorPresetsDropdown() {
    const dropDownMenuItems = (
      <Menu onClick={this.makeTurnOnPresetFn}>
        {PRESET_COLOR_MAP.map((preset, index) => (
          <Menu.Item key={preset.key}>{preset.name}</Menu.Item>
        ))}
      </Menu>
    );
    return (
      <Dropdown
        key="colorPresetsDropdown"
        trigger={["click"]}
        overlay={dropDownMenuItems}
      >
        <Button>
          Color
          <Icon type="down" />
        </Button>
      </Dropdown>
    );
  }

  toggleAxisShowing() {
    const axisShowing = !this.props.showAxes;
    this.props.changeAxisShowing(axisShowing);
  }

  toggleBoundingBoxShowing() {
    const boundingBoxShowing = !this.props.showBoundingBox;
    this.props.changeBoundingBoxShowing(boundingBoxShowing);
  }

  handleResetCamera() {
    this.props.resetCamera();
  }

  changeRenderMode({ target }) {
    this.props.changeRenderingAlgorithm(target.value);
  }

  renderRenderSettings() {
    const { canPathTrace, mode, renderSetting } = this.props;
    return (
      <div key="renderSettings">
        <Radio.Group value={renderSetting} onChange={this.changeRenderMode}>
          <Radio.Button value={VOLUMETRIC_RENDER} key={VOLUMETRIC_RENDER}>
            Volumetric
          </Radio.Button>
          {canPathTrace && (
            <Radio.Button
              value={PATH_TRACE}
              disabled={mode !== ViewMode.threeD}
              key={PATH_TRACE}
            >
              Path trace
            </Radio.Button>
          )}
          <Radio.Button value={MAX_PROJECT} key={MAX_PROJECT}>
            Max project
          </Radio.Button>
        </Radio.Group>
      </div>
    );
  }

  renderDownloadButton() {
    const { fovDownloadHref, cellDownloadHref, hasCellId, hasParentImage } =
      this.props;
    if (hasCellId && hasParentImage) {
      const menu = (
        <Menu className="download-dropdown">
          <Menu.Item key="1">
            <a href={cellDownloadHref}>
              <Icon type="download" /> Segmented cell
            </a>
          </Menu.Item>
          <Menu.Item key="2">
            <a href={fovDownloadHref}>
              <Icon type="download" /> Full field image
            </a>
          </Menu.Item>
        </Menu>
      );
      return (
        <Dropdown overlay={menu} trigger={["click"]}>
          <Button icon="download" />
        </Dropdown>
      );
    } else {
      return <Button icon="download" href={cellDownloadHref} />;
    }
  }

  renderAxesButton() {
    const { showAxes } = this.props;
    const buttonContent = showAxes ? "Hide Axes" : "Show Axes";
    return (
      <Button onClick={() => this.toggleAxisShowing()}>
        {buttonContent}
      </Button>
    );
  }

  renderBoundingBoxButton() {
    const { showBoundingBox } = this.props;
    const buttonContent = showBoundingBox ? "Hide Bounds" : "Show Bounds";
    return (
      <Button onClick={() => this.toggleBoundingBoxShowing()}>
        {buttonContent}
      </Button>
    );
  }

  renderResetCameraButton() {
    return (
      <Button onClick={() => this.handleResetCamera()}>
        Reset Camera
      </Button>
    );
  }

  render() {
    const {
      viewerChannelSettings,
      renderConfig,
      appHeight,
      imageName,
      hasImage,
      mode,
      onViewModeChange,
    } = this.props;
    return (
      <Card
        style={{ ...STYLES.wrapper, height: appHeight }}
        open={this.state.open}
        bordered={false}
        className="control-panel"
        extra={
          renderConfig.fovCellSwitchControls && (
            <div>
              {this.createFovCellSwitchControls()}
              {this.renderDownloadButton()}
            </div>
          )
        }
        title={
          renderConfig.viewModeRadioButtons && (
            <ViewModeRadioButtons
              imageName={imageName}
              mode={mode}
              onViewModeChange={onViewModeChange}
            />
          )
        }
      >
        <Card.Meta
          title={[
            this.renderRenderSettings(),
            renderConfig.colorPresetsDropdown &&
              this.renderColorPresetsDropdown(),
          ]}
        />
        <Card.Meta
          title={<>
            {this.renderAxesButton()}
            {this.renderBoundingBoxButton()}
            {this.renderResetCameraButton()}
          </>}
        />
        {hasImage ? (
          <div className="channel-rows-list">
            <ChannelsWidget
              imageName={this.props.imageName}
              channelSettings={this.props.channelSettings}
              channelDataChannels={this.props.channelDataChannels}
              channelGroupedByType={this.props.channelGroupedByType}
              changeChannelSettings={this.props.changeChannelSettings}
              channelDataReady={this.props.channelDataReady}
              handleChangeToImage={this.props.handleChangeToImage}
              updateChannelTransferFunction={
                this.props.updateChannelTransferFunction
              }
              changeOneChannelSetting={this.props.changeOneChannelSetting}
              onColorChangeComplete={this.props.onColorChangeComplete}
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
              onAutorotateChange={this.props.onAutorotateChange}
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
        ) : null}
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
