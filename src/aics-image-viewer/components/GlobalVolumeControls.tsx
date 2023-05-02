import React from "react";
import SmarterSlider from "./shared/SmarterSlider";
import "nouislider/distribute/nouislider.css";

import { Card, Collapse, Checkbox } from "antd";
import { ViewerSettingUpdater } from "./App/types";
import { Styles } from "../shared/types";
const Panel = Collapse.Panel;

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

export default class GlobalVolumeControls extends React.Component<GlobalVolumeControlsProps, {}> {
  constructor(props: GlobalVolumeControlsProps) {
    super(props);
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
        <SmarterSlider
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
    const { showControls, maskAlpha, brightness, density, levels } = this.props;
    return (
      <Card bordered={false} title="Rendering adjustments" type="inner" className="global-volume-controls">
        <Collapse bordered={false} defaultActiveKey="global-volume">
          <Panel key="global-volume" header={null}>
            <div style={STYLES.slidersWrapper}>
              {showControls.alphaMaskSlider && this.createSliderRow("mask cell", maskAlpha, 100, "maskAlpha")}
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
