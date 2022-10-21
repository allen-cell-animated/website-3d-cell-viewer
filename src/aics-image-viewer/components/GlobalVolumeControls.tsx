import React from "react";
import Nouislider from "nouislider-react";
import "nouislider/distribute/nouislider.css";

import { Card, Collapse } from "antd";
import { UserSelectionKey, UserSelectionState } from "./App/types";
const Panel = Collapse.Panel;

type GlobalVolumeControlKey = "alphaMaskSliderLevel" | "brightnessSliderLevel" | "densitySliderLevel" | "levelsSlider";

export interface GlobalVolumeControlsProps {
  mode: symbol;
  imageName: string | undefined;
  pixelSize: [number, number, number];
  maxProjectOn: boolean;
  pathTraceOn: boolean;
  renderConfig: {
    alphaMask: boolean;
    brightnessSlider: boolean;
    densitySlider: boolean;
    levelsSliders: boolean;
  };

  alphaMaskSliderLevel: number[];
  brightnessSliderLevel: number[];
  densitySliderLevel: number[];
  gammaSliderLevel: [number, number, number];

  handleChangeUserSelection: <K extends UserSelectionKey>(key: K, newValue: UserSelectionState[K]) => void;
  setImageAxisClip: (axis: "x" | "y" | "z", minval: number, maxval: number, isOrthoAxis: boolean) => void;
  makeUpdatePixelSizeFn: (i: number) => void;
}

export default class GlobalVolumeControls extends React.Component<GlobalVolumeControlsProps, {}> {
  constructor(props: GlobalVolumeControlsProps) {
    super(props);
  }

  shouldComponentUpdate(newProps: GlobalVolumeControlsProps) {
    const { imageName, alphaMaskSliderLevel, pathTraceOn } = this.props;
    const newImage = newProps.imageName !== imageName;
    const newPathTraceValue = newProps.pathTraceOn !== pathTraceOn;
    const newSliderValue = newProps.alphaMaskSliderLevel[0] !== alphaMaskSliderLevel[0];
    return newImage || newSliderValue || newPathTraceValue;
  }

  createSliderRow = (label: string, start: number[], max: number, propKey: GlobalVolumeControlKey) => (
    <div style={STYLES.controlRow}>
      <div style={STYLES.controlName}>{label}</div>
      <div style={STYLES.control}>
        <Nouislider
          range={{ min: 0, max }}
          start={start}
          connect={true}
          tooltips={true}
          behaviour="drag"
          onUpdate={(values) => this.props.handleChangeUserSelection(propKey, values)}
        />
      </div>
    </div>
  );

  render() {
    if (!this.props.imageName) return null;
    const { renderConfig, alphaMaskSliderLevel, brightnessSliderLevel, densitySliderLevel, gammaSliderLevel } =
      this.props;
    return (
      <Card bordered={false} title="Rendering adjustments" type="inner" className="global-volume-controls">
        <Collapse bordered={false} defaultActiveKey="global-volume">
          <Panel key="global-volume" header={null}>
            <div style={STYLES.slidersWrapper}>
              {renderConfig.alphaMask &&
                this.createSliderRow("mask cell", alphaMaskSliderLevel, 100, "alphaMaskSliderLevel")}
              {renderConfig.brightnessSlider &&
                this.createSliderRow("brightness", brightnessSliderLevel, 100, "brightnessSliderLevel")}
              {renderConfig.densitySlider &&
                this.createSliderRow("density", densitySliderLevel, 100, "densitySliderLevel")}
              {renderConfig.levelsSliders && this.createSliderRow("levels", gammaSliderLevel, 255, "levelsSlider")}
            </div>
          </Panel>
        </Collapse>
      </Card>
    );
  }
}

const STYLES: { [key: string]: React.CSSProperties } = {
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
    marginTop: 15,
  },
};
