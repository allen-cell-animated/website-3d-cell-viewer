import { mapValues } from "lodash";
import { Button, Tooltip } from "antd";
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

    this.play = this.play.bind(this);
    this.pause = this.pause.bind(this);
    this.moveSlice = this.moveSlice.bind(this);
    this.createSlider = this.createSlider.bind(this);
  }

  // Reset sliders and pause if mode has changed
  componentDidUpdate(prevProps: AxisClipSlidersProps) {
    if (prevProps.mode !== this.props.mode) {
      window.clearInterval(this.state.intervalId);
      this.setState({ sliders: this.getSliderDefaults(), playing: false });

      // Missing sliders in 2D mode won't call an update; do it for them
      const activeAxis = this.getActiveAxis();
      if (activeAxis) {
        AXES.forEach((axis) => {
          if (axis !== activeAxis) {
            this.props.setAxisClip(axis, -0.5, 0.5, false);
          }
        });
      }
    }
  }

  getSliderDefaults = () => mapValues(this.props.numSlices, (max: number) => [0, max]);

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

  setSliderState(axis: string, newState: number[]) {
    this.setState({
      sliders: {
        ...this.state.sliders,
        [axis]: newState,
      },
    });
  }

  /**
   * Moves the left and right handles together one slice forwards or backwards.
   * Wraps in both directions.
   * @param backward boolean indicating move direction.
   */
  moveSlice(backward: boolean = false) {
    const activeAxis = this.getActiveAxis();
    if (activeAxis !== null) {
      const delta = backward ? -1 : 1;
      const max = this.props.numSlices[activeAxis] + 1;
      const currentLeftSliderValue = this.state.sliders[activeAxis][0];
      const leftValue = (currentLeftSliderValue + delta + max) % max;
      this.setSliderState(activeAxis, [leftValue, leftValue]);
    }
  }

  step(backward: boolean) {
    this.pause();
    this.moveSlice(backward);
  }

  play() {
    if (this.getActiveAxis() && !this.state.playing) {
      const intervalId = window.setInterval(this.moveSlice, PLAY_RATE_MS_PER_STEP);
      this.setState({ playing: true, intervalId });
    }
  }

  pause() {
    window.clearInterval(this.state.intervalId);
    if (this.state.playing) {
      this.setState({ playing: false });
    }
  }

  createSlider(axis: string, playButton: boolean) {
    const start = this.state.sliders[axis];
    const range = { min: 0, max: this.props.numSlices[axis] };
    const playOnClick = this.state.playing ? this.pause : this.play;
    const playIcon = this.state.playing ? "pause" : "caret-right";

    return (
      <div key={axis} className={`slider-row slider-${axis}`}>
        <span className="axis-slider">
          <Nouislider
            connect={true}
            range={range}
            start={start}
            behaviour="drag"
            // round slider output to nearest slice; assume any string inputs represent ints
            format={{ to: Math.round, from: parseInt }}
            onUpdate={this.makeSliderUpdateFn(axis)}
            onEnd={this.makeSliderDragEndFn(axis)}
          />
        </span>
        <span className="slider-name">{axis.toUpperCase()}</span>
        <span className="slider-slices">{`${start[0]}, ${start[1]} (${range.max})`}</span>
        {playButton && (
          <Button.Group>
            <Tooltip placement="top" title="Step back">
              <Button icon="step-backward" onClick={() => this.step(true)} />
            </Tooltip>
            <Tooltip placement="top" title="Play through sequence">
              <Button onClick={playOnClick} icon={playIcon} />
            </Tooltip>
            <Tooltip placement="top" title="Step forward">
              <Button icon="step-forward" onClick={() => this.step(false)} />
            </Tooltip>
          </Button.Group>
        )}
      </div>
    );
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

  // When user finishes dragging the active slider, update slice label
  makeSliderDragEndFn(axis: string) {
    return (values: number[]) => this.setSliderState(axis, values);
  }

  render() {
    const activeAxis = this.getActiveAxis();
    return (
      <div className={activeAxis ? "clip-sliders clip-sliders-2d" : "clip-sliders"}>
        <h4>Region of interest</h4>
        {activeAxis ? this.createSlider(activeAxis, true) : AXES.map((axis) => this.createSlider(axis, false))}
      </div>
    );
  }
}
