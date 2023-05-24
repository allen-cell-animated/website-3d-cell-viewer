import React from "react";
import { Button, Tooltip } from "antd";
import { Callback } from "nouislider-react";

import SmarterSlider from "../shared/SmarterSlider";

import "./styles.css";

import { ViewMode } from "../../shared/enums";
import { ViewerSettingUpdater } from "../App/types";
import { AxisName, PerAxis, activeAxisMap } from "../../shared/types";

const AXES: AxisName[] = ["x", "y", "z"];
const PLAY_RATE_MS_PER_STEP = 125;

interface LabeledSliderProps {
  label: string;
  vals: number[];
  valsReadout?: number[];
  max: number;
  onSlide?: Callback;
  onEnd?: Callback;
}

const LabeledSlider: React.FC<LabeledSliderProps> = ({ label, vals, valsReadout = vals, max, onSlide, onEnd }) => (
  <span className="axis-slider-container">
    <span className="slider-name">{label}</span>
    <span className="axis-slider">
      <SmarterSlider
        connect={true}
        range={{ min: 0, max }}
        start={vals}
        step={1}
        margin={1}
        behaviour="drag"
        // round slider output to nearest slice; assume any string inputs represent ints
        format={{ to: Math.round, from: parseInt }}
        onSlide={onSlide}
        onEnd={onEnd}
      />
    </span>
    <span className="slider-slices">
      {valsReadout[0]}
      {valsReadout.length > 1 && `, ${valsReadout[1]}`} / {max}
    </span>
  </span>
);

interface AxisClipSlidersProps {
  mode: ViewMode;
  changeViewerSetting: ViewerSettingUpdater;
  numSlices: PerAxis<number>;
  region: PerAxis<[number, number]>;
  numTimesteps: number;
  time: number;
}

interface AxisClipSlidersState {
  playing: boolean;
  intervalId: number;
  // shadows `time` prop, but updates while time slider is moving (`time` does not to avoid reloads)
  timeReadout: number;
}

export default class AxisClipSliders extends React.Component<AxisClipSlidersProps, AxisClipSlidersState> {
  constructor(props: AxisClipSlidersProps) {
    super(props);

    this.state = {
      playing: false,
      intervalId: 0,
      timeReadout: props.time,
    };

    this.play = this.play.bind(this);
    this.pause = this.pause.bind(this);
    this.moveSlice = this.moveSlice.bind(this);
    this.createAxisSlider = this.createAxisSlider.bind(this);
  }

  componentDidUpdate(prevProps: AxisClipSlidersProps): void {
    // Make extra sure the number next to the time slider is accurate
    if (prevProps.time !== this.props.time) {
      this.setState({ timeReadout: this.props.time });
    }

    // Pause if mode or fov has changed
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

  updateClipping(axis: AxisName, minval: number, maxval: number): void {
    const { changeViewerSetting, numSlices, region } = this.props;
    // get a value from -0.5..0.5
    const max = numSlices[axis];
    const start = minval / max;
    const end = maxval / max;
    changeViewerSetting("region", { ...region, [axis]: [start, end] });
  }

  makeSliderCallback(axis: AxisName): (values: number[]) => void {
    return (values: number[]) => {
      const max = values.length < 2 ? values[0] + 1 : values[1];
      this.updateClipping(axis, values[0], max);
    };
  }

  createAxisSlider(axis: AxisName, twoD: boolean): React.ReactNode {
    const { playing } = this.state;
    const numSlices = this.props.numSlices[axis];
    const clipVals = this.props.region[axis];
    const sliderVals = [Math.round(clipVals[0] * numSlices), Math.round(clipVals[1] * numSlices)];
    const onChange = this.makeSliderCallback(axis);

    return (
      <div key={axis + numSlices} className={`slider-row slider-${axis}`}>
        <LabeledSlider
          // prevents slider from potentially not updating number of handles
          key={`${twoD}`}
          label={axis.toUpperCase()}
          vals={twoD ? [sliderVals[0]] : sliderVals}
          max={numSlices - (twoD ? 1 : 0)}
          onSlide={onChange}
          onEnd={onChange}
        />
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

  createTimeSlider(): React.ReactNode {
    const { time, numTimesteps, changeViewerSetting } = this.props;
    const { timeReadout } = this.state;

    return (
      <div className="slider-row">
        <LabeledSlider
          label={""}
          vals={[time]}
          valsReadout={[timeReadout]}
          max={numTimesteps}
          onSlide={([time]) => this.setState({ timeReadout: time })}
          onEnd={([time]) => changeViewerSetting("time", time)}
        />
      </div>
    );
  }

  render(): React.ReactNode {
    const activeAxis = this.getActiveAxis();
    return (
      <div className={activeAxis ? "clip-sliders clip-sliders-2d" : "clip-sliders"}>
        <span className="slider-group">
          <h4 className="slider-group-title">ROI</h4>
          <span className="slider-group-rows">
            {activeAxis
              ? this.createAxisSlider(activeAxis, true)
              : AXES.map((axis) => this.createAxisSlider(axis, false))}
          </span>
        </span>

        {this.props.numTimesteps > 1 && (
          <span className="slider-group">
            <h4 className="slider-group-title">Time</h4>
            <span className="slider-group-rows">{this.createTimeSlider()}</span>
          </span>
        )}
      </div>
    );
  }
}
