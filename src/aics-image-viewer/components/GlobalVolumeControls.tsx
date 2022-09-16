import React from "react";
import Nouislider from "nouislider-react";
import "nouislider/distribute/nouislider.css";

import NumericInput from "react-numeric-input";

import { Card, Collapse } from "antd";
import {
  ALPHA_MASK_SLIDER_LEVEL,
  BRIGHTNESS_SLIDER_LEVEL,
  DENSITY_SLIDER_LEVEL,
  LEVELS_SLIDER,
} from "../shared/constants";
const Panel = Collapse.Panel;

export interface GlobalVolumeControlsProps {
  mode: symbol;
  imageName: string;
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

  handleChangeUserSelection: (key: string, newValue: any) => void;
  setImageAxisClip: (axis: number, minval: number, maxval: number, isOrthoAxis: boolean) => void;
  makeUpdatePixelSizeFn: (i: number) => void;
}

export default class GlobalVolumeControls extends React.Component<GlobalVolumeControlsProps, {}> {
  constructor(props: GlobalVolumeControlsProps) {
    super(props);
    this.onAlphaSliderUpdate = this.onAlphaSliderUpdate.bind(this);
    this.onBrightnessUpdate = this.onBrightnessUpdate.bind(this);
    this.onDensityUpdate = this.onDensityUpdate.bind(this);
    this.onLevelsUpdate = this.onLevelsUpdate.bind(this);
    this.createMaskAlphaSlider = this.createMaskAlphaSlider.bind(this);
  }

  shouldComponentUpdate(newProps: GlobalVolumeControlsProps) {
    const { imageName, alphaMaskSliderLevel, pathTraceOn } = this.props;
    const newImage = newProps.imageName !== imageName;
    const newPathTraceValue = newProps.pathTraceOn !== pathTraceOn;
    const newSliderValue = newProps.alphaMaskSliderLevel[0] !== alphaMaskSliderLevel[0];
    return newImage || newSliderValue || newPathTraceValue;
  }

  onAlphaSliderUpdate(values: [number]) {
    this.props.handleChangeUserSelection(ALPHA_MASK_SLIDER_LEVEL, [Number(values[0])]);
  }

  createMaskAlphaSlider() {
    let config = {
      label: "mask cell",
      start: this.props.alphaMaskSliderLevel,
      range: {
        min: 0,
        max: 100,
      },
      onUpdate: this.onAlphaSliderUpdate,
    };
    return this.createSliderRow(config);
  }

  onBrightnessUpdate(values: [number]) {
    this.props.handleChangeUserSelection(BRIGHTNESS_SLIDER_LEVEL, [Number(values[0])]);
  }

  createBrightnessSlider() {
    let config = {
      label: "brightness",
      start: this.props.brightnessSliderLevel,
      range: {
        min: 0,
        max: 100,
      },
      onUpdate: this.onBrightnessUpdate,
    };
    return this.createSliderRow(config);
  }

  onDensityUpdate(values: [number]) {
    this.props.handleChangeUserSelection(DENSITY_SLIDER_LEVEL, [Number(values[0])]);
  }

  createDensitySlider() {
    let config = {
      label: "density",
      start: this.props.densitySliderLevel,
      range: {
        min: 0,
        max: 100,
      },
      onUpdate: this.onDensityUpdate,
    };
    return this.createSliderRow(config);
  }

  onLevelsUpdate(values: [number, number, number]) {
    this.props.handleChangeUserSelection(LEVELS_SLIDER, [Number(values[0]), Number(values[1]), Number(values[2])]);
  }

  createLevelsSlider() {
    let config = {
      label: "levels",
      start: this.props.gammaSliderLevel,
      range: {
        min: 0,
        max: 255,
      },
      onUpdate: this.onLevelsUpdate,
    };
    return this.createSliderRow(config);
  }

  // TODO: `config` object has no type annotation; this component deserves some DRY edits that may reduce it out
  createVolumeAxisScaling(config) {
    const { pixelSize } = this.props;
    const SCALE_UI_MIN_VAL = 0.001;
    const SCALE_UI_STEP_SIZE = 0.01;
    const imagePixelSize = pixelSize ? pixelSize.slice() : [1, 1, 1];

    return (
      <div key={config.key} style={STYLES.controlRow}>
        <div style={STYLES.controlName}>{config.label}</div>
        <div style={STYLES.control}>
          <NumericInput
            min={SCALE_UI_MIN_VAL}
            step={SCALE_UI_STEP_SIZE}
            value={imagePixelSize[config.key]}
            onChange={config.onUpdate}
          />
        </div>
      </div>
    );
  }

  createVolumeScalingControls() {
    return ["x", "y", "z"].map((axis, i) =>
      this.createVolumeAxisScaling({
        key: i,
        label: `${axis} scale`,
        onUpdate: this.props.makeUpdatePixelSizeFn(i),
      })
    );
  }

  createSliderRow(config) {
    return (
      <div style={STYLES.controlRow}>
        <div style={STYLES.controlName}>{config.label}</div>
        <div style={STYLES.control}>{this.createSlider(config.start, config.range, config.onUpdate)}</div>
      </div>
    );
  }

  createSlider(start: number[], range: { min: number; max: number }, onUpdate: (values: number[]) => void) {
    return (
      <Nouislider range={range} start={start} connect={true} tooltips={true} behaviour="drag" onUpdate={onUpdate} />
    );
  }

  render() {
    if (!this.props.imageName) return null;
    const { renderConfig } = this.props;
    return (
      <Card bordered={false} title="Rendering adjustments" type="inner" className="global-volume-controls">
        <Collapse bordered={false} defaultActiveKey="global-volume">
          <Panel key="global-volume" header={null}>
            <div style={STYLES.slidersWrapper}>
              {renderConfig.alphaMask && this.createMaskAlphaSlider()}
              {renderConfig.brightnessSlider && this.createBrightnessSlider()}
              {renderConfig.densitySlider && this.createDensitySlider()}
              {renderConfig.levelsSliders && this.createLevelsSlider()}
            </div>
          </Panel>
        </Collapse>
      </Card>
    );
  }
}

const STYLES = {
  slidersWrapper: {
    width: "calc(100% - 20px)",
    margin: "auto",
    paddingTop: "18px",
  },
  controlRow: {
    height: "3em",
    display: "flex",
  },
  controlName: {
    flex: 2,
    "white-space": "nowrap",
  },
  control: {
    flex: 5,
    height: 30,
    marginTop: 15,
  },
};
