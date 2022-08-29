import { mapValues } from "lodash";
import { Button } from "antd";
import Nouislider from "nouislider-react";
import "nouislider/distribute/nouislider.css";

import React from "react";

import enums from "../../shared/enums";

import "./styles.css";
import viewMode from "../../shared/enums/viewMode";

const ViewMode = enums.viewMode.mainMapping;

const AXES = Object.freeze(["x", "y", "z"]);
const PLAY_RATE_MS_PER_STEP = 125;

interface AxisClipSlidersProps {
  mode: symbol;
  setAxisClip(axis: string, minval: number, maxval: number, isOrthoAxis: boolean): void;
  numSlices: {
    x: number;
    y: number;
    z: number;
  };
}

interface SliderState {
  sliceLabels: string[];
  leftValue: number;
}

interface AxisClipSlidersState {
  playing: boolean;
  intervalId: number;
  sliders: {
    x: SliderState;
    y: SliderState;
    z: SliderState;
  };
}

export default class AxisClipSliders extends React.Component<AxisClipSlidersProps, AxisClipSlidersState> {
  constructor(props: AxisClipSlidersProps) {
    super(props);

    this.state = {
      playing: false,
      intervalId: 0,
      sliders: this.getSliderDefaults(),
    };

    this.goBack = this.goBack.bind(this);
    this.play = this.play.bind(this);
    this.pause = this.pause.bind(this);
    this.goForward = this.goForward.bind(this);
    this.makeSliderDragEndFn = this.makeSliderDragEndFn.bind(this);
    this.moveSection = this.moveSection.bind(this);
    this.createSlider = this.createSlider.bind(this);
  }

  getActiveAxis() {
    switch (this.props.mode) {
      case ViewMode.yz:
        return "x";
      case ViewMode.xz:
        return "y";
      case ViewMode.xy:
        return "z";
      default:
        return "";
    }
  }

  threeDMode = () => this.props.mode === viewMode.mainMapping.threeD;

  getSliderDefaults = () =>
    mapValues(this.props.numSlices, (numSlices: number): SliderState => {
      return { sliceLabels: ["0", numSlices.toString()], leftValue: 0 };
    });

  setSliderState(axis: string, newState: Partial<SliderState>) {
    const currentState = this.state.sliders[axis];
    this.setState({
      sliders: {
        ...this.state.sliders,
        [axis]: {
          ...currentState,
          ...newState,
        },
      },
    });
  }

  /**
   * Moves the left handle forwards or backwards based on `backward` and moves the right one on top
   * of the left. Wraps in both directions.
   * @param backward boolean indicating move direction.
   */
  moveSection(backward: boolean = false) {
    if (!this.threeDMode()) {
      const delta = backward ? -1 : 1;
      const max = this.props.numSlices[this.getActiveAxis()];
      const currentLeftSliderValue = this.state.sliders[this.getActiveAxis()].leftValue;
      const leftValue = (currentLeftSliderValue + delta + max) % max;
      const leftValueStr = leftValue.toString();
      this.setSliderState(this.getActiveAxis(), { leftValue, sliceLabels: [leftValueStr, leftValueStr] });
    }
  }

  goBack() {
    this.pause();
    this.moveSection(true);
  }

  play() {
    if (!this.threeDMode() && !this.state.playing) {
      const intervalId = window.setInterval(() => this.moveSection(), PLAY_RATE_MS_PER_STEP);
      this.setState({
        playing: true,
        intervalId,
      });
    }
  }

  pause() {
    window.clearInterval(this.state.intervalId);
    if (this.state.playing) {
      this.setState({ playing: false });
    }
  }

  goForward() {
    this.pause();
    this.moveSection();
  }

  createSliders() {
    return AXES.map((axis) => this.createSlider(axis));
  }

  createSlider(axis: string) {
    const start = this.state.sliders[axis.toLowerCase()].sliceLabels;
    const range = {
      min: 0,
      max: this.props.numSlices[axis],
    };

    return (
      <div key={axis} className="slider-row">
        <span className="axis-slider">
          <Nouislider
            connect={true}
            range={range}
            start={start}
            behaviour="drag"
            format={{ to: Math.round, from: parseInt }}
            onUpdate={this.makeSliderUpdateFn(axis)}
            onEnd={this.makeSliderDragEndFn(axis)}
          />
        </span>
        <span className="slider-name">{axis.toUpperCase()}</span>
        <span className="slider-slices">{`${start[0]}, ${start[1]} (${range.max})`}</span>
      </div>
    );
  }

  // When user finishes dragging the active slider, update slice label
  makeSliderDragEndFn(axis: string) {
    return (sliceLabels: string[], _handle: number, values: number[]) =>
      this.setSliderState(axis, { sliceLabels, leftValue: values[0] });
  }

  makeSliderUpdateFn(axis: string) {
    return (_fmtValues: string[], _handle: number, values: number[]) => {
      if (this.props.setAxisClip) {
        const step = 1;
        const stepEpsilon = 0.04;
        const max = this.props.numSlices[axis];
        const isActiveAxis = this.getActiveAxis() === axis;
        const thicknessReduce = !this.threeDMode() && isActiveAxis ? step - stepEpsilon : 0.0;

        const start = values[0] / max - 0.5;
        const end = values[1] / max - 0.5 - thicknessReduce / max;

        // get a value from -0.5..0.5
        this.props.setAxisClip(axis, start, end, isActiveAxis);
      }
    };
  }

  // Reset sliders if mode has changed
  // This may be relaxed if we want some slider changes to persist across modes
  componentDidUpdate(prevProps: AxisClipSlidersProps) {
    if (prevProps.mode !== this.props.mode) {
      this.setState({ sliders: this.getSliderDefaults() });
    }
  }

  render() {
    const playOnClick = this.state.playing ? this.pause : this.play;
    const playIcon = this.state.playing ? "pause" : "caret-right";
    return (
      <div className="clip-sliders">
        <h4>Region of interest clipping</h4>
        {this.props.numSlices && this.createSliders()}
        {!this.threeDMode() && (
          <Button.Group style={{ flex: "1 0 150px" }}>
            <Button type="primary" shape="circle" icon="step-backward" onClick={this.goBack} />
            <Button type="primary" onClick={playOnClick} icon={playIcon} />
            <Button type="primary" shape="circle" icon="step-forward" onClick={this.goForward} />
          </Button.Group>
        )}
      </div>
    );
  }
}
