import React from "react";
import { Button, Icon, List, Col, Row, Checkbox, Slider } from "antd";

import TfEditor from "../TfEditor";

import colorPalette from "../../shared/colorPalette";
import {
  COLORIZE_ALPHA,
  COLORIZE_ENABLED,
  ISOSURFACE_OPACITY_SLIDER_MAX,
  ISO_VALUE,
  ISO_SURFACE_ENABLED,
  LUT_CONTROL_POINTS,
  OPACITY,
  SAVE_ISO_SURFACE,
  VOLUME_ENABLED,
} from "../../shared/constants";

import ColorPicker from "../ColorPicker";

import "./styles.css";
import { ColorObject, colorObjectToArray, colorArrayToObject } from "../../shared/utils/colorRepresentations";

const ISOSURFACE_OPACITY_DEFAULT = 1.0;
const ISOVALUE_DEFAULT = 128.0;

interface ChannelsWidgetRowProps {
  index: number;
  imageName: string;
  channelName: string;
  name: string;
  volumeChecked: boolean;
  isosurfaceChecked: boolean;
  colorizeEnabled: boolean;
  colorizeAlpha: number;
  color: [number, number, number];
  channelControlPoints: {
    color: string;
    opacity: number;
    x: number;
  }[];
  channelDataForChannel: any; // TODO

  changeOneChannelSetting: (channelName: string, channelIndex: number, keyToChange: string, newValue: any) => void;
  handleChangeToImage: (keyToChange: string, newValue: any, index?: number) => void;
  updateChannelTransferFunction: (index: number, lut: Uint8Array) => void;
  onColorChangeComplete?: (newRGB: ColorObject, oldRGB?: ColorObject, index?: number) => void;
}

export default class ChannelsWidgetRow extends React.Component<ChannelsWidgetRowProps, { controlsOpen: boolean }> {
  constructor(props: ChannelsWidgetRowProps) {
    super(props);
    this.toggleControlsOpen = this.toggleControlsOpen.bind(this);
    this.onColorChange = this.onColorChange.bind(this);
    this.volumeCheckHandler = this.volumeCheckHandler.bind(this);
    this.isosurfaceCheckHandler = this.isosurfaceCheckHandler.bind(this);
    this.onIsovalueChange = this.onIsovalueChange.bind(this);
    this.state = {
      controlsOpen: false,
    };
  }

  volumeCheckHandler({ target }) {
    const { channelName, index, changeOneChannelSetting, isosurfaceChecked } = this.props;
    if (!target.checked && !isosurfaceChecked) {
      this.setState({ controlsOpen: false });
    }
    changeOneChannelSetting(channelName, index, VOLUME_ENABLED, target.checked);
  }

  isosurfaceCheckHandler({ target }) {
    const { channelName, index, changeOneChannelSetting, volumeChecked } = this.props;
    if (!target.checked && !volumeChecked) {
      this.setState({ controlsOpen: false });
    }
    changeOneChannelSetting(channelName, index, ISO_SURFACE_ENABLED, target.checked);
  }

  createChannelSettingHandler =
    (settingKey: string, map = (x: any) => x) =>
    (newValue: any) => {
      const { channelName, index, changeOneChannelSetting } = this.props;
      changeOneChannelSetting(channelName, index, settingKey, map(newValue));
    };

  onIsovalueChange = this.createChannelSettingHandler(ISO_VALUE);
  onOpacityChange = this.createChannelSettingHandler(OPACITY, (val) => val / ISOSURFACE_OPACITY_SLIDER_MAX);

  createIsovalueSlider() {
    const isoRange = { min: 0, max: 255 };
    return (
      <Row>
        <Col span={10}>
          <label style={STYLES.controlName}>isovalue</label>
        </Col>
        <Col span={12}>
          <Slider
            disabled={!this.props.isosurfaceChecked}
            min={isoRange.min || 0}
            max={isoRange.max || 225}
            defaultValue={ISOVALUE_DEFAULT}
            style={STYLES.slider}
            onChange={this.onIsovalueChange}
          />
        </Col>
      </Row>
    );
  }

  createOpacitySlider() {
    const range = { min: 0, max: ISOSURFACE_OPACITY_SLIDER_MAX };
    return (
      <Row>
        <Col span={10}>
          <label style={STYLES.controlName}>opacity</label>
        </Col>
        <Col span={12}>
          <Slider
            disabled={!this.props.isosurfaceChecked}
            min={range.min}
            max={range.max}
            defaultValue={ISOSURFACE_OPACITY_DEFAULT * ISOSURFACE_OPACITY_SLIDER_MAX}
            style={STYLES.slider}
            onChange={this.onOpacityChange}
          />
        </Col>
      </Row>
    );
  }

  toggleControlsOpen() {
    const { isosurfaceChecked, volumeChecked } = this.props;
    if (isosurfaceChecked || volumeChecked) {
      this.setState({
        controlsOpen: !this.state.controlsOpen,
      });
    }
  }

  onColorChange(newRGB: ColorObject, _oldRGB?: ColorObject, index?: number) {
    const { channelName } = this.props;
    const color = colorObjectToArray(newRGB);
    this.props.changeOneChannelSetting(channelName, index!, "color", color);
  }

  createColorPicker() {
    const color = colorArrayToObject(this.props.color);
    return (
      <div style={STYLES.colorPicker}>
        <ColorPicker
          color={color}
          onColorChange={this.onColorChange}
          onColorChangeComplete={this.props.onColorChangeComplete}
          idx={this.props.index}
          width={18}
        />
      </div>
    );
  }

  renderActions = () => [
    <Checkbox checked={this.props.volumeChecked} onChange={this.volumeCheckHandler} key="volCheckbox">
      volume
    </Checkbox>,
    <Checkbox checked={this.props.isosurfaceChecked} onChange={this.isosurfaceCheckHandler} key="isoCheckbox">
      surface
    </Checkbox>,
    <Icon
      key="openSettingsButton"
      type="setting"
      theme={this.state.controlsOpen ? "filled" : "outlined"}
      onClick={this.toggleControlsOpen}
    />,
  ];

  createTFEditor() {
    const {
      channelControlPoints,
      channelDataForChannel,
      colorizeEnabled,
      colorizeAlpha,
      updateChannelTransferFunction,
      index,
      imageName,
    } = this.props;
    return (
      <TfEditor
        id={"TFEditor" + index}
        index={index}
        imageName={imageName}
        fit-to-data={false}
        width={250}
        height={150}
        volumeData={channelDataForChannel.volumeData}
        channelData={channelDataForChannel}
        controlPoints={channelControlPoints}
        updateChannelTransferFunction={updateChannelTransferFunction}
        updateChannelLutControlPoints={this.createChannelSettingHandler(LUT_CONTROL_POINTS)}
        updateColorizeMode={this.createChannelSettingHandler(COLORIZE_ENABLED)}
        updateColorizeAlpha={this.createChannelSettingHandler(COLORIZE_ALPHA)}
        colorizeEnabled={colorizeEnabled}
        colorizeAlpha={colorizeAlpha}
      />
    );
  }

  createSaveIsosurfaceHandler = (format: string) => () => {
    const { index, handleChangeToImage } = this.props;
    handleChangeToImage(SAVE_ISO_SURFACE, format, index);
  };

  renderSurfaceControls = () => (
    <Col span={24}>
      <h4 className="ant-list-item-meta-title">Surface settings:</h4>
      {this.createIsovalueSlider()}
      {this.createOpacitySlider()}
      <Button
        disabled={!this.props.isosurfaceChecked}
        onClick={this.createSaveIsosurfaceHandler("GLTF")}
        style={STYLES.raisedButton}
      >
        Save GLTF
      </Button>
      <Button
        disabled={!this.props.isosurfaceChecked}
        onClick={this.createSaveIsosurfaceHandler("STL")}
        style={STYLES.raisedButton}
      >
        Save STL
      </Button>
    </Col>
  );

  renderControls() {
    return (
      <div style={STYLES.settingsContainer}>
        {this.props.volumeChecked && (
          <Row type="flex" justify="space-between" className="volume-settings">
            <h4 className="ant-list-item-meta-title">Volume settings:</h4>
            {this.createTFEditor()}
          </Row>
        )}
        {this.props.isosurfaceChecked && (
          <Row type="flex" justify="space-between">
            {this.renderSurfaceControls()}
          </Row>
        )}
      </div>
    );
  }

  render() {
    const rowClass = this.state.controlsOpen ? "row-card" : "row-card controls-closed";
    return (
      <List.Item key={this.props.index} className={rowClass} actions={this.renderActions()}>
        <List.Item.Meta
          title={<span style={STYLES.channelName}>{this.props.name}</span>}
          avatar={this.createColorPicker()}
        />
        {this.state.controlsOpen && this.renderControls()}
      </List.Item>
    );
  }
}

const STYLES = {
  channelName: {
    display: "inline-block",
    minWidth: 90,
  },
  checkedIcon: {
    fill: colorPalette.textColor,
  },
  settingsContainer: {
    width: "100%",
    order: 3,
  },
  uncheckedIcon: {
    fill: colorPalette.accent3Color,
  },
  raisedButton: {
    marginLeft: "2px",
    marginRight: "2px",
  },
  colorPicker: {
    margin: "auto",
    marginRight: 16,
  },
  slider: {
    marginBottom: "4px",
    marginTop: "4px",
  },
  controlName: {
    whiteSpace: "nowrap" as "nowrap",
  },
};
