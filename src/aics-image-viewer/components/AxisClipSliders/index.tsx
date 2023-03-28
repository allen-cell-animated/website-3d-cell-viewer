import { Button, Tooltip } from "antd";
import SmarterSlider from "../shared/SmarterSlider";

import React from "react";

import "./styles.css";

import { ViewMode } from "../../shared/enums";
import { ViewerSettingUpdater } from "../App/types";
import { AxisName, PerAxis, activeAxisMap } from "../../shared/types";

const AXES: AxisName[] = ["x", "y", "z"];
const PLAY_RATE_MS_PER_STEP = 125;

interface AxisClipSlidersProps {
  mode: ViewMode;
  changeViewerSetting: ViewerSettingUpdater;
  numSlices: PerAxis<number>;
  region: PerAxis<[number, number]>;
}

interface AxisClipSlidersState {
  playing: boolean;
  intervalId: number;
}

export default class AxisClipSliders extends React.Component<AxisClipSlidersProps, AxisClipSlidersState> {
  constructor(props: AxisClipSlidersProps) {
    super(props);

    this.state = {
      playing: false,
      intervalId: 0,
    };

    this.play = this.play.bind(this);
    this.pause = this.pause.bind(this);
    this.moveSlice = this.moveSlice.bind(this);
    this.createSlider = this.createSlider.bind(this);
  }

  // Pause if mode or fov has changed
  componentDidUpdate(prevProps: AxisClipSlidersProps): void {
    const numSlicesChanged = AXES.reduce(
      (hasChanged, axis) => hasChanged || prevProps.numSlices[axis] !== this.props.numSlices[axis],
      false
    );

    if (numSlicesChanged || prevProps.mode !== this.props.mode) {
      this.pause();
    }
  }

  getActiveAxis = (): AxisName | null => activeAxisMap[this.props.mode];

  /**
   * Moves the single slice viewed on the active axis one step forwards or backwards.
   * Wraps in both directions.
   * @param backward boolean indicating move direction.
   */
  moveSlice(backward: boolean = false): void {
    const activeAxis = this.getActiveAxis();
    if (activeAxis === null) {
      return;
    }
    const delta = backward ? -1 : 1;
    const max = this.props.numSlices[activeAxis];
    const currentLeftSliderValue = Math.round(this.props.region[activeAxis][0] * max);
    const leftValue = (currentLeftSliderValue + delta + max) % max;
    this.updateClipping(activeAxis, leftValue, leftValue);
  }

  step(backward: boolean): void {
    this.pause();
    this.moveSlice(backward);
  }

  play(): void {
    if (this.getActiveAxis() && !this.state.playing) {
      const intervalId = window.setInterval(this.moveSlice, PLAY_RATE_MS_PER_STEP);
      this.setState({ playing: true, intervalId });
    }
  }

  pause(): void {
    window.clearInterval(this.state.intervalId);
    if (this.state.playing) {
      this.setState({ playing: false });
    }
  }

  createSlider(axis: AxisName, twoD: boolean): React.ReactNode {
    const { playing } = this.state;
    const numSlices = this.props.numSlices[axis];
    const clipVals = this.props.region[axis];
    const sliderVals = [Math.floor(clipVals[0] * numSlices), Math.floor(clipVals[1] * numSlices)];
    const range = { min: 0, max: numSlices };
    const callback = this.makeSliderCallback(axis);

    return (
      <div key={axis + numSlices} className={`slider-row slider-${axis}`}>
        <span className="axis-slider-container">
          <span className="axis-slider">
            <SmarterSlider
              connect={true}
              range={range}
              start={twoD ? [sliderVals[0]] : sliderVals}
              step={1}
              margin={1}
              behaviour="drag"
              // round slider output to nearest slice; assume any string inputs represent ints
              format={{ to: Math.round, from: parseInt }}
              onSlide={callback}
              onEnd={callback}
            />
          </span>
          <span className="slider-name">{axis.toUpperCase()}</span>
          <span className="slider-slices">
            {twoD
              ? `${sliderVals[0]} (${numSlices})`
              : `${sliderVals[0]}, ${sliderVals[1]} (${sliderVals[1] - sliderVals[0]})`}
          </span>
        </span>
        {twoD && (
          <Button.Group className="slider-play-buttons">
            <Tooltip placement="top" title="Step back">
              <Button icon="step-backward" onClick={() => this.step(true)} />
            </Tooltip>
            <Tooltip placement="top" title="Play through sequence">
              <Button onClick={playing ? this.pause : this.play} icon={playing ? "pause" : "caret-right"} />
            </Tooltip>
            <Tooltip placement="top" title="Step forward">
              <Button icon="step-forward" onClick={() => this.step(false)} />
            </Tooltip>
          </Button.Group>
        )}
      </div>
    );
  }

  updateClipping(axis: AxisName, minval: number, maxval: number): void {
    const { changeViewerSetting, numSlices, region } = this.props;
    // get a value from -0.5..0.5
    const max = numSlices[axis];
    console.log(minval, maxval, max);
    const start = minval / max;
    const end = maxval / max;
    changeViewerSetting("region", { ...region, [axis]: [start, end] });
  }

  makeSliderCallback(axis: AxisName): (values: number[]) => void {
    // Values may be of length 1 (2d, single-slice) or 2 (3d, slice range); ensure we pass 2 values regardless
    return (values: number[]) => this.updateClipping(axis, values[0], values[values.length - 1]);
  }

  render(): React.ReactNode {
    const activeAxis = this.getActiveAxis();
    return (
      <div className={activeAxis ? "clip-sliders clip-sliders-2d" : "clip-sliders"}>
        <h4>Region of interest</h4>
        {activeAxis ? this.createSlider(activeAxis, true) : AXES.map((axis) => this.createSlider(axis, false))}
      </div>
    );
  }
}
