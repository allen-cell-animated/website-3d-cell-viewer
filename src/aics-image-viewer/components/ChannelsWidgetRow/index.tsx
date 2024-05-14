import React, { useState } from "react";
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

const ChannelsWidgetRow: React.FC<ChannelsWidgetRowProps> = (props: ChannelsWidgetRowProps) => {
  const { index, changeChannelSetting, isosurfaceChecked, volumeChecked, saveIsosurface } = props;
  const [controlsOpen, setControlsOpen] = useState(false);

  const volumeCheckHandler = ({ target }: CheckboxChangeEvent): void => {
    if (!target.checked && !isosurfaceChecked) {
      setControlsOpen(false);
    }
    changeChannelSetting(index, "volumeEnabled", target.checked);
  };

  const isosurfaceCheckHandler = ({ target }: CheckboxChangeEvent): void => {
    if (!target.checked && !volumeChecked) {
      setControlsOpen(false);
    }
    changeChannelSetting(index, "isosurfaceEnabled", target.checked);
  };

  const createChannelSettingHandler = <K extends ChannelStateKey>(settingKey: K) => {
    return (newValue: ChannelState[K]) => {
      changeChannelSetting(index, settingKey, newValue);
    };
  };

  const onIsovalueChange = createChannelSettingHandler("isovalue");
  const onOpacityChangeUnwrapped = createChannelSettingHandler("opacity");
  const onOpacityChange = (newValue: number): void =>
    onOpacityChangeUnwrapped(newValue / ISOSURFACE_OPACITY_SLIDER_MAX);

  const createSliderRow = (
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
          disabled={!isosurfaceChecked}
        />
      </Col>
    </Row>
  );

  const toggleControlsOpen = (): void => {
    if (isosurfaceChecked || volumeChecked) {
      setControlsOpen(!controlsOpen);
    }
  };

  const onColorChange = (newRGB: ColorObject, _oldRGB?: ColorObject, index?: number): void => {
    const color = colorObjectToArray(newRGB);
    props.changeChannelSetting(index!, "color", color);
  };

  const createColorPicker = (): React.ReactNode => (
    <ColorPicker
      color={colorArrayToObject(props.color)}
      onColorChange={onColorChange}
      onColorChangeComplete={props.onColorChangeComplete}
      disableAlpha={true}
      idx={index}
      width={18}
    />
  );

  const renderActions = (): React.ReactNode => (
    <div className={"channel-visibility-controls" + (controlsOpen ? " controls-open" : "")}>
      <Checkbox checked={volumeChecked} onChange={volumeCheckHandler} key="volCheckbox">
        Vol
      </Checkbox>
      <Checkbox checked={isosurfaceChecked} onChange={isosurfaceCheckHandler} key="isoCheckbox">
        Surf
      </Checkbox>
      <ViewerIcon type="preferences" onClick={toggleControlsOpen} style={{ fontSize: "16px" }} />
    </div>
  );

  const createTFEditor = (): React.ReactNode => {
    const { channelControlPoints, channelDataForChannel, colorizeEnabled, colorizeAlpha } = props;
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
        updateChannelLutControlPoints={createChannelSettingHandler("controlPoints")}
        updateColorizeMode={createChannelSettingHandler("colorizeEnabled")}
        updateColorizeAlpha={createChannelSettingHandler("colorizeAlpha")}
        colorizeEnabled={colorizeEnabled}
        colorizeAlpha={colorizeAlpha}
      />
    );
  };

  const renderSurfaceControls = (): React.ReactNode => (
    <Col span={24}>
      <h4 className="ant-list-item-meta-title" style={{ marginTop: "20px", marginBottom: "5px" }}>
        Surface settings:
      </h4>
      {createSliderRow("Isovalue", 255, ISOVALUE_DEFAULT, onIsovalueChange)}
      {createSliderRow(
        "Opacity",
        ISOSURFACE_OPACITY_SLIDER_MAX,
        ISOSURFACE_OPACITY_DEFAULT * ISOSURFACE_OPACITY_SLIDER_MAX,
        onOpacityChange
      )}
      <Button disabled={!isosurfaceChecked} onClick={() => saveIsosurface(index, "GLTF")} style={STYLES.raisedButton}>
        Save GLTF
      </Button>
      <Button disabled={!isosurfaceChecked} onClick={() => saveIsosurface(index, "STL")} style={STYLES.raisedButton}>
        Save STL
      </Button>
    </Col>
  );

  const renderControls = (): React.ReactNode => (
    <div style={STYLES.settingsContainer}>
      {volumeChecked && (
        <Row justify="space-between" className="volume-settings">
          <h4 className="ant-list-item-meta-title">Volume settings:</h4>
          {createTFEditor()}
        </Row>
      )}
      {isosurfaceChecked && <Row justify="space-between">{renderSurfaceControls()}</Row>}
    </div>
  );

  const rowClass = controlsOpen ? "row-card" : "row-card controls-closed";
  return (
    <List.Item key={index} className={rowClass} extra={renderActions()}>
      <List.Item.Meta title={<span style={STYLES.channelName}>{props.name}</span>} avatar={createColorPicker()} />
      {controlsOpen && renderControls()}
    </List.Item>
  );
};

export default ChannelsWidgetRow;

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
