import React from "react";
import { Button, List, Col, Row, Checkbox } from "antd";
import { CheckboxChangeEvent } from "antd/lib/checkbox";
import { Channel, ControlPoint } from "@aics/volume-viewer";
import Nouislider from "nouislider-react";

import TfEditor from "../TfEditor";
import colorPalette from "../../shared/colorPalette";
import { ISOSURFACE_OPACITY_SLIDER_MAX } from "../../shared/constants";
import ColorPicker from "../ColorPicker";

import "./styles.css";

import {
  ColorObject,
  colorObjectToArray,
  ColorArray,
  colorArrayToObject,
} from "../../shared/utils/colorRepresentations";
import { ChannelStateKey, ChannelState, ChannelSettingUpdater } from "../../shared/utils/viewerChannelSettings";
import { IsosurfaceFormat, Styles } from "../../shared/types";
import ViewerIcon from "../shared/ViewerIcon";

const ISOSURFACE_OPACITY_DEFAULT = 1.0;
const ISOVALUE_DEFAULT = 128.0;

interface ChannelsWidgetRowProps {
  index: number;
  name: string;
  volumeChecked: boolean;
  isosurfaceChecked: boolean;
  colorizeEnabled: boolean;
  colorizeAlpha: number;
  color: ColorArray;
  channelControlPoints: ControlPoint[];
  channelDataForChannel: Channel;

  changeChannelSetting: ChannelSettingUpdater;

  saveIsosurface: (channelIndex: number, type: IsosurfaceFormat) => void;
  onColorChangeComplete?: (newRGB: ColorObject, oldRGB?: ColorObject, index?: number) => void;
}

export default class ChannelsWidgetRow extends React.Component<ChannelsWidgetRowProps, { controlsOpen: boolean }> {
  constructor(props: ChannelsWidgetRowProps) {
    super(props);
    this.toggleControlsOpen = this.toggleControlsOpen.bind(this);
    this.onColorChange = this.onColorChange.bind(this);
    this.volumeCheckHandler = this.volumeCheckHandler.bind(this);
    this.isosurfaceCheckHandler = this.isosurfaceCheckHandler.bind(this);
    this.state = {
      controlsOpen: false,
    };
  }

  volumeCheckHandler({ target }: CheckboxChangeEvent): void {
    const { index, changeChannelSetting, isosurfaceChecked } = this.props;
    if (!target.checked && !isosurfaceChecked) {
      this.setState({ controlsOpen: false });
    }
    changeChannelSetting(index, "volumeEnabled", target.checked);
  }

  isosurfaceCheckHandler({ target }: CheckboxChangeEvent): void {
    const { index, changeChannelSetting, volumeChecked } = this.props;
    if (!target.checked && !volumeChecked) {
      this.setState({ controlsOpen: false });
    }
    changeChannelSetting(index, "isosurfaceEnabled", target.checked);
  }

  createChannelSettingHandler =
    <K extends ChannelStateKey>(settingKey: K) =>
    (newValue: ChannelState[K]) => {
      const { index, changeChannelSetting } = this.props;
      changeChannelSetting(index, settingKey, newValue);
    };

  onIsovalueChange = this.createChannelSettingHandler("isovalue");
  onOpacityChangeUnwrapped = this.createChannelSettingHandler("opacity");
  onOpacityChange = (newValue: number): void => this.onOpacityChangeUnwrapped(newValue / ISOSURFACE_OPACITY_SLIDER_MAX);

  createSliderRow = (
    name: string,
    maxValue: number,
    defaultValue: number,
    onChange: (newValue: any) => void
  ): React.ReactNode => (
    <Row style={{ marginBottom: "10px" }}>
      <Col span={10}>
        <label style={STYLES.controlName}>{name}</label>
      </Col>
      <Col span={12} style={{ marginTop: "10px" }}>
        <Nouislider
          range={{ min: [0], max: [maxValue] }}
          start={defaultValue}
          connect={true}
          tooltips={true}
          format={{ to: (value: number) => Math.round(value).toString(), from: (value: string) => parseInt(value, 10) }}
          behaviour="drag"
          onChange={onChange}
          step={1}
          disabled={!this.props.isosurfaceChecked}
        />
      </Col>
    </Row>
  );

  toggleControlsOpen(): void {
    const { isosurfaceChecked, volumeChecked } = this.props;
    if (isosurfaceChecked || volumeChecked) {
      this.setState({
        controlsOpen: !this.state.controlsOpen,
      });
    }
  }

  onColorChange(newRGB: ColorObject, _oldRGB?: ColorObject, index?: number): void {
    const color = colorObjectToArray(newRGB);
    this.props.changeChannelSetting(index!, "color", color);
  }

  createColorPicker = (): React.ReactNode => (
    <ColorPicker
      color={colorArrayToObject(this.props.color)}
      onColorChange={this.onColorChange}
      onColorChangeComplete={this.props.onColorChangeComplete}
      disableAlpha={true}
      idx={this.props.index}
      width={18}
    />
  );

  renderActions = (): React.ReactNode => (
    <div className={"channel-visibility-controls" + (this.state.controlsOpen ? " controls-open" : "")}>
      <Checkbox checked={this.props.volumeChecked} onChange={this.volumeCheckHandler} key="volCheckbox">
        Vol
      </Checkbox>
      <Checkbox checked={this.props.isosurfaceChecked} onChange={this.isosurfaceCheckHandler} key="isoCheckbox">
        Surf
      </Checkbox>{" "}
      <ViewerIcon type="preferences" onClick={this.toggleControlsOpen} style={{ fontSize: "16px" }} />
    </div>
  );

  createTFEditor(): React.ReactNode {
    const { channelControlPoints, channelDataForChannel, colorizeEnabled, colorizeAlpha, index } = this.props;
    return (
      <TfEditor
        id={"TFEditor" + index}
        index={index}
        fit-to-data={false}
        width={250}
        height={150}
        volumeData={channelDataForChannel.volumeData}
        channelData={channelDataForChannel}
        controlPoints={channelControlPoints}
        updateChannelLutControlPoints={this.createChannelSettingHandler("controlPoints")}
        updateColorizeMode={this.createChannelSettingHandler("colorizeEnabled")}
        updateColorizeAlpha={this.createChannelSettingHandler("colorizeAlpha")}
        colorizeEnabled={colorizeEnabled}
        colorizeAlpha={colorizeAlpha}
      />
    );
  }

  createSaveIsosurfaceHandler = (format: IsosurfaceFormat) => () => {
    const { index, saveIsosurface } = this.props;
    saveIsosurface(index, format);
  };

  renderSurfaceControls = (): React.ReactNode => (
    <Col span={24}>
      <h4 className="ant-list-item-meta-title" style={{ marginTop: "20px", marginBottom: "5px" }}>
        Surface settings:
      </h4>
      {this.createSliderRow("Isovalue", 255, ISOVALUE_DEFAULT, this.onIsovalueChange)}
      {this.createSliderRow(
        "Opacity",
        ISOSURFACE_OPACITY_SLIDER_MAX,
        ISOSURFACE_OPACITY_DEFAULT * ISOSURFACE_OPACITY_SLIDER_MAX,
        this.onOpacityChange
      )}
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

  renderControls = (): React.ReactNode => (
    <div style={STYLES.settingsContainer}>
      {this.props.volumeChecked && (
        <Row justify="space-between" className="volume-settings">
          <h4 className="ant-list-item-meta-title">Volume settings:</h4>
          {this.createTFEditor()}
        </Row>
      )}
      {this.props.isosurfaceChecked && <Row justify="space-between">{this.renderSurfaceControls()}</Row>}
    </div>
  );

  render(): React.ReactNode {
    const rowClass = this.state.controlsOpen ? "row-card" : "row-card controls-closed";
    return (
      <List.Item key={this.props.index} className={rowClass} extra={this.renderActions()}>
        <List.Item.Meta
          title={<span style={STYLES.channelName}>{this.props.name}</span>}
          avatar={this.createColorPicker()}
        />
        {this.state.controlsOpen && this.renderControls()}
      </List.Item>
    );
  }
}

const STYLES: Styles = {
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
  slider: {
    marginBottom: "4px",
    marginTop: "4px",
  },
  controlName: {
    whiteSpace: "nowrap",
  },
};
