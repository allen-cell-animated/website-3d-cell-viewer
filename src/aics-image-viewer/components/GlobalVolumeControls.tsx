import React from "react";
import Nouislider from "nouislider-react";
import "nouislider/distribute/nouislider.css";

import { Card, Collapse, Checkbox } from "antd";
import { ViewerSettingsKey, GlobalViewerSettings } from "./App/types";
import { AxisName, Styles } from "../shared/types";
const Panel = Collapse.Panel;

type GlobalVolumeControlKey = "maskAlpha" | "brightness" | "density" | "levels";

export interface GlobalVolumeControlsProps {
  imageName: string | undefined;
  pixelSize: [number, number, number];
  pathTraceOn: boolean;
  showControls: {
    alphaMask: boolean;
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

  changeViewerSetting: <K extends ViewerSettingsKey>(key: K, newValue: GlobalViewerSettings[K]) => void;
  setImageAxisClip: (axis: AxisName, minval: number, maxval: number, isOrthoAxis: boolean) => void;
  makeUpdatePixelSizeFn: (i: number) => void;
}

export default class GlobalVolumeControls extends React.Component<GlobalVolumeControlsProps, {}> {
  constructor(props: GlobalVolumeControlsProps) {
    super(props);
  }

  shouldComponentUpdate(newProps: GlobalVolumeControlsProps): boolean {
    const { imageName, maskAlpha, pathTraceOn, interpolationEnabled } = this.props;
    const newImage = newProps.imageName !== imageName;
    const newPathTraceValue = newProps.pathTraceOn !== pathTraceOn;
    const newSliderValue = newProps.maskAlpha !== maskAlpha;
    const newInterpolationValue = newProps.interpolationEnabled !== interpolationEnabled;
    return newImage || newSliderValue || newPathTraceValue || newInterpolationValue;
  }

  createSliderRow = (
    label: string,
    start: number | number[],
    max: number,
    propKey: GlobalVolumeControlKey
  ): React.ReactNode => (
    <div style={STYLES.controlRow}>
      <div style={STYLES.controlName}>{label}</div>
      <div style={STYLES.control}>
        <Nouislider
          range={{ min: 0, max }}
          start={start}
          connect={true}
          tooltips={true}
          behaviour="drag"
          onUpdate={(_strValues: string[], _handle: number, values: number[]): void => {
            const selectValue = values.length === 1 ? values[0] : (values as [number, number, number]);
            this.props.changeViewerSetting(propKey, selectValue);
          }}
        />
      </div>
    </div>
  );

  render(): React.ReactNode {
    if (!this.props.imageName) return null;
    const { showControls, maskAlpha, brightness, density, levels } = this.props;
    return (
      <Card bordered={false} title="Rendering adjustments" type="inner" className="global-volume-controls">
        <Collapse bordered={false} defaultActiveKey="global-volume">
          <Panel key="global-volume" header={null}>
            <div style={STYLES.slidersWrapper}>
              {showControls.alphaMask && this.createSliderRow("mask cell", maskAlpha, 100, "maskAlpha")}
              {showControls.brightnessSlider && this.createSliderRow("brightness", brightness, 100, "brightness")}
              {showControls.densitySlider && this.createSliderRow("density", density, 100, "density")}
              {showControls.levelsSliders && this.createSliderRow("levels", levels, 255, "levels")}
              {showControls.interpolationControl && (
                <div style={STYLES.controlRow}>
                  <div style={STYLES.controlName}>interpolate</div>
                  <div style={{ flex: 5 }}>
                    <Checkbox
                      checked={this.props.interpolationEnabled}
                      onChange={({ target }) => this.props.changeViewerSetting("interpolationEnabled", target.checked)}
                    />
                  </div>
                </div>
              )}
            </div>
          </Panel>
        </Collapse>
      </Card>
    );
  }
}

const STYLES: Styles = {
  slidersWrapper: {
    marginRight: "10px",
    paddingTop: "18px",
  },
  controlRow: {
    height: "3em",
    display: "flex",
  },
  controlName: {
    flex: 2,
    whiteSpace: "nowrap",
  },
  control: {
    flex: 5,
    height: 30,
    marginTop: 10,
  },
};
