import React from "react";
import { Checkbox } from "antd";

import SliderRow from "./shared/SliderRow";
import { ViewerSettingUpdater } from "./App/types";

type GlobalVolumeControlKey = "maskAlpha" | "brightness" | "density" | "levels";

export interface GlobalVolumeControlsProps {
  imageName: string | undefined;
  pixelSize: [number, number, number];
  showControls: {
    alphaMaskSlider: boolean;
    brightnessSlider: boolean;
    densitySlider: boolean;
    levelsSliders: boolean;
    interpolationControl: boolean;
  };

  maskAlpha: number;
  brightness: number;
  density: number;
  levels: [number, number, number];
  interpolationEnabled: boolean;

  changeViewerSetting: ViewerSettingUpdater;
}

const GlobalVolumeControls: React.FC<GlobalVolumeControlsProps> = (props) => {
  const createSliderRow = (
    label: string,
    start: number | number[],
    max: number,
    propKey: GlobalVolumeControlKey
  ): React.ReactNode => {
    const onUpdate = (_strValues: string[], _handle: number, values: number[]): void => {
      const selectValue = values.length === 1 ? values[0] : (values as [number, number, number]);
      props.changeViewerSetting(propKey, selectValue);
    };

    return <SliderRow label={label} start={start} max={max} onUpdate={onUpdate} />;
  };

  const { showControls, maskAlpha, brightness, density, levels } = props;

  return (
    <div style={{ marginRight: 10, paddingTop: 18 }}>
      {showControls.alphaMaskSlider && createSliderRow("mask cell", maskAlpha, 100, "maskAlpha")}
      {showControls.brightnessSlider && createSliderRow("brightness", brightness, 100, "brightness")}
      {showControls.densitySlider && createSliderRow("density", density, 100, "density")}
      {showControls.levelsSliders && createSliderRow("levels", levels, 255, "levels")}
      {showControls.interpolationControl && (
        <SliderRow label="interpolate">
          <Checkbox
            checked={props.interpolationEnabled}
            onChange={({ target }) => props.changeViewerSetting("interpolationEnabled", target.checked)}
          />
        </SliderRow>
      )}
    </div>
  );
};

export default GlobalVolumeControls;
