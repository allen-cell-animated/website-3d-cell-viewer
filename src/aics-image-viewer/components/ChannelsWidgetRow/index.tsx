import React, { useState } from "react";
import { Button, List, Col, Row, Checkbox } from "antd";
import { CheckboxChangeEvent } from "antd/lib/checkbox";
import { Channel, ControlPoint } from "@aics/volume-viewer";
import Nouislider from "nouislider-react";

import TfEditor from "../TfEditor";
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

interface ChannelsWidgetRowProps {
  index: number;
  name: string;
  volumeChecked: boolean;
  isosurfaceChecked: boolean;
  isovalue: number;
  isosurfaceOpacity: number;
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
    changeChannelSetting(index, "volumeEnabled", target.checked);
  };

  const isosurfaceCheckHandler = ({ target }: CheckboxChangeEvent): void => {
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

  const visibilityControls = (
    <div className="channel-visibility-controls">
      <Checkbox checked={volumeChecked} onChange={volumeCheckHandler}>
        Vol
      </Checkbox>
      <Checkbox checked={isosurfaceChecked} onChange={isosurfaceCheckHandler}>
        Surf
      </Checkbox>
      <Button
        icon={<ViewerIcon type="preferences" style={{ fontSize: "16px" }} />}
        onClick={() => setControlsOpen(!controlsOpen)}
        title="Open channel settings"
        type="text"
      />
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
      {createSliderRow("Isovalue", 255, props.isovalue, onIsovalueChange)}
      {createSliderRow(
        "Opacity",
        ISOSURFACE_OPACITY_SLIDER_MAX,
        props.isosurfaceOpacity * ISOSURFACE_OPACITY_SLIDER_MAX,
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

  const renderControls = (): React.ReactNode => {
    if (!volumeChecked && !isosurfaceChecked) {
      return <h4 style={{ fontStyle: "italic" }}>Not currently visible</h4>;
    }
    return (
      <>
        {volumeChecked && (
          <>
            <h4>Volume settings:</h4>
            {createTFEditor()}
          </>
        )}
        {isosurfaceChecked && (
          <>
            <h4>Surface settings:</h4>
            {renderSurfaceControls()}
          </>
        )}
      </>
    );
  };

  const rowClass = controlsOpen ? "channel-row" : "channel-row controls-closed";
  return (
    <List.Item key={index} className={rowClass}>
      <List.Item.Meta title={<span style={STYLES.channelName}>{props.name}</span>} avatar={createColorPicker()} />
      {visibilityControls}
      {controlsOpen && <div style={{ width: "100%" }}>{renderControls()}</div>}
    </List.Item>
  );
};

export default ChannelsWidgetRow;

const STYLES: Styles = {
  raisedButton: {
    marginLeft: "2px",
    marginRight: "2px",
  },
  controlName: {
    whiteSpace: "nowrap",
  },
};
