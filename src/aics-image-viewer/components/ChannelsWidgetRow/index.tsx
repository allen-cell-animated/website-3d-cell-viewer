import React, { useState } from "react";
import { Button, List, Checkbox } from "antd";
import { CheckboxChangeEvent } from "antd/lib/checkbox";
import { Channel, ControlPoint } from "@aics/volume-viewer";

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
import type { ChannelStateKey, ChannelState, ChannelSettingUpdater } from "../ViewerStateProvider/types";
import { IsosurfaceFormat } from "../../shared/types";
import ViewerIcon from "../shared/ViewerIcon";
import SliderRow from "../shared/SliderRow";

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
    return (newValue: ChannelState[K]) => changeChannelSetting(index, settingKey, newValue);
  };

  const _onIsovalueChange = createChannelSettingHandler("isovalue");
  const onIsovalueChange = ([newValue]: number[]): void => _onIsovalueChange(newValue);
  const _onOpacityChange = createChannelSettingHandler("opacity");
  const onOpacityChange = ([newValue]: number[]): void => _onOpacityChange(newValue / ISOSURFACE_OPACITY_SLIDER_MAX);

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
        fit-to-data={false}
        width={418}
        height={125}
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
    <div>
      <SliderRow label="Isovalue" max={255} start={props.isovalue} onChange={onIsovalueChange} formatInteger={true} />
      <SliderRow
        label="Opacity"
        max={ISOSURFACE_OPACITY_SLIDER_MAX}
        start={props.isosurfaceOpacity * ISOSURFACE_OPACITY_SLIDER_MAX}
        onChange={onOpacityChange}
        formatInteger={true}
      />
      <div className="button-row">
        <Button onClick={() => saveIsosurface(index, "GLTF")}>Export GLTF</Button>
        <Button onClick={() => saveIsosurface(index, "STL")}>Export STL</Button>
      </div>
    </div>
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
      <List.Item.Meta title={props.name} avatar={createColorPicker()} />
      {visibilityControls}
      {controlsOpen && <div style={{ width: "100%" }}>{renderControls()}</div>}
    </List.Item>
  );
};

export default ChannelsWidgetRow;
