import { mapValues } from "lodash";
import { Button } from "antd";
import Nouislider from "nouislider-react";
import "nouislider/distribute/nouislider.css";

import React from "react";

import "./styles.css";

import viewMode from "../../shared/enums/viewMode";
const ViewMode = viewMode.mainMapping;

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

interface AxisClipSlidersState {
  playing: boolean;
  intervalId: number;
  sliders: {
    x: [number, number];
    y: [number, number];
    z: [number, number];
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
        return null;
    }
  }

  getSliderDefaults = () => mapValues(this.props.numSlices, (max: number) => [0, max]);

  setSliderState(axis: string, newState: number[]) {
    this.setState({
      sliders: {
        ...this.state.sliders,
        [axis]: newState,
      },
    });
  }

  /**
   * Moves the left handle forwards or backwards based on `backward` and moves the right one on top
   * of the left. Wraps in both directions.
   * @param backward boolean indicating move direction.
   */
  moveSection(backward: boolean = false) {
    const activeAxis = this.getActiveAxis();
    if (activeAxis !== null) {
      const delta = backward ? -1 : 1;
      const max = this.props.numSlices[activeAxis];
      const currentLeftSliderValue = this.state.sliders[activeAxis][0];
      const leftValue = (currentLeftSliderValue + delta + max) % max;
      this.setSliderState(activeAxis, [leftValue, leftValue]);
    }
  }

  goBack() {
    this.pause();
    this.moveSection(true);
  }

  play() {
    if (this.getActiveAxis() && !this.state.playing) {
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
    const start = this.state.sliders[axis.toLowerCase()];
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
    return (values: number[]) => this.setSliderState(axis, values);
  }

  makeSliderUpdateFn(axis: string) {
    return (values: number[]) => {
      if (this.props.setAxisClip) {
        const step = 1;
        const stepEpsilon = 0.04;
        const max = this.props.numSlices[axis];
        const isActiveAxis = this.getActiveAxis() === axis;
        const thicknessReduce = isActiveAxis ? step - stepEpsilon : 0.0;

        const start = values[0] / max - 0.5;
        const end = values[1] / max - 0.5 - thicknessReduce / max;

        // get a value from -0.5..0.5
        this.props.setAxisClip(axis, start, end, isActiveAxis);
      }
    };
  }

  // Reset sliders if mode has changed
  componentDidUpdate(prevProps: AxisClipSlidersProps) {
    if (prevProps.mode !== this.props.mode) {
      this.setState({ sliders: this.getSliderDefaults() });
    }
  }

  render() {
    const playOnClick = this.state.playing ? this.pause : this.play;
    const playIcon = this.state.playing ? "pause" : "caret-right";
    const activeAxis = this.getActiveAxis();
    return (
      <div className="clip-sliders">
        <h4>Region of interest clipping</h4>
        {activeAxis ? this.createSlider(activeAxis) : AXES.map(this.createSlider)}
        {this.getActiveAxis() && (
          <Button.Group style={{ flex: "0 0 150px" }}>
            <Button type="primary" shape="circle" icon="step-backward" onClick={this.goBack} />
            <Button type="primary" onClick={playOnClick} icon={playIcon} />
            <Button type="primary" shape="circle" icon="step-forward" onClick={this.goForward} />
          </Button.Group>
        )}
      </div>
    );
  }
}
