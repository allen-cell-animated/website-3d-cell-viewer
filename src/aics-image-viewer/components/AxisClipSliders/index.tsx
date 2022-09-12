import { mapValues } from "lodash";
import { Button, Tooltip } from "antd";
import Nouislider from "nouislider-react";
import "nouislider/distribute/nouislider.css";

import React from "react";

import "./styles.css";

import viewMode from "../../shared/enums/viewMode";
const ViewMode = viewMode.mainMapping;

const AXES = ["x", "y", "z"];
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

  // Reset sliders and pause if mode or fov has changed
  // TODO: this reset-state-on-props-update pattern is somewhat bad practice,
  //   and indicates some state should potentially be lifted out of this component.
  componentDidUpdate(prevProps: AxisClipSlidersProps) {
    const numSlicesChanged = AXES.reduce(
      (hasChanged, axis) => hasChanged || prevProps.numSlices[axis] !== this.props.numSlices[axis],
      false
    );

    if (numSlicesChanged || prevProps.mode !== this.props.mode) {
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

  getSliderDefaults = () => mapValues(this.props.numSlices, (max: number) => [0, max - 1]);

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

  setSliderState(axis: string, newState: [number, number]) {
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
      const max = this.props.numSlices[activeAxis];
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

  createSlider(axis: string, twoD: boolean) {
    const { playing, sliders } = this.state;
    const numSlices = this.props.numSlices[axis];
    const sliderVals = sliders[axis];
    const range = { min: 0, max: numSlices - 1 };

    return (
      <div key={axis + numSlices} className={`slider-row slider-${axis}`}>
        <span className="axis-slider-container">
          <span className="axis-slider">
            <Nouislider
              connect={true}
              range={range}
              start={twoD ? [sliderVals[0]] : sliderVals}
              step={1}
              behaviour="drag"
              // round slider output to nearest slice; assume any string inputs represent ints
              format={{ to: Math.round, from: parseInt }}
              onUpdate={this.makeSliderUpdateFn(axis)}
              onSet={this.makeSliderSetFn(axis)}
            />
          </span>
          <span className="slider-name">{axis.toUpperCase()}</span>
          <span className="slider-slices">
            {twoD
              ? `${sliderVals[0]} (${numSlices})`
              : `${sliderVals[0]}, ${sliderVals[1]} (${sliderVals[1] - sliderVals[0] + 1})`}
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

  makeSliderUpdateFn(axis: string) {
    return (values: number[]) => {
      if (this.props.setAxisClip) {
        // get a value from -0.5..0.5
        const max = this.props.numSlices[axis];
        const start = values[0] / max - 0.5;
        // values.length is the number of handles on this slider:
        // either one handle (2d mode), or a range with 2 handles (3d mode)
        const end = (values[values.length - 1] + 1) / max - 0.5;

        const isActiveAxis = this.getActiveAxis() === axis;
        this.props.setAxisClip(axis, start, end, isActiveAxis);
      }
    };
  }

  // When user finishes moving the active slider, update slice label
  makeSliderSetFn(axis: string) {
    // Values may be of length 1 or 2 (see above, in makeSliderUpdateFn); ensure we pass 2 values regardless
    return (values: number[]) => this.setSliderState(axis, [values[0], values[values.length - 1]]);
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
