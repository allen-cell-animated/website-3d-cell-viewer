import * as _ from 'lodash';
import Nouislider from 'react-nouislider';
import React from 'react';

import { ThicknessUnit } from '../shared/enums/thicknessUnit';
import { ViewMode } from '../shared/enums/viewModeEnum';

import TwoDPlayButtons from './TwoDPlayButtons';

const AXES = Object.freeze(['x', 'y', 'z']);
const VIEWMODES = Object.freeze([ViewMode.yz, ViewMode.xz, ViewMode.xy]);
const DEFAULT_SLIDER_RANGE = Object.freeze({
  min: 0,
  max: 100
});
const DEFAULT_SLIDER = Object.freeze({
  start: Object.freeze([0, 100]),
  range: DEFAULT_SLIDER_RANGE,
  disabled: false
});
const DISABLED_SLIDER = {
  start: Object.freeze([0, 100]),
  range: DEFAULT_SLIDER_RANGE,
  disabled: true
};
const MODE_2D_DEFAULT_PLAY_BUTTONS_SETTINGS = Object.freeze({
  width: 1,
  unit: ThicknessUnit.slice,
  play: false,
  pause: false,
  stop: true
});
const MODE_3D_DEFAULT_SETTINGS = Object.freeze({
  sliders: Object.freeze({
    x: DEFAULT_SLIDER,
    y: DEFAULT_SLIDER,
    z: DEFAULT_SLIDER
  }),
  playButtons: null
});
const PLAY_RATE_MS_PER_STEP = 125;

export default class AxisClipSliders extends React.Component {

  constructor (props) {
    super(props);

    this.state = MODE_3D_DEFAULT_SETTINGS;

    this.setWidth = this.setWidth.bind(this);
    this.setUnit = this.setUnit.bind(this);
    this.goBack = this.goBack.bind(this);
    this.play = this.play.bind(this);
    this.pause = this.pause.bind(this);
    this.stop = this.stop.bind(this);
    this.goForward = this.goForward.bind(this);
    this.onSliderDragEnd = this.onSliderDragEnd.bind(this);
    this.moveSection = this.moveSection.bind(this);
    this.clearInterval = this.clearInterval.bind(this);
  }

  // Called when user updates width value in PlayButtonRow input
  setWidth(nextWidth) {
    if (this.state.playButtons && nextWidth && nextWidth !== this.state.playButtons.width) {
      const nextUnit = this.state.playButtons.unit;
      const nextMax = this.getMax(this.props, this.state, this.props.activeAxis, nextUnit);
      const nextLeftSliderValue = this.state.sliders[this.props.activeAxis].start[0];
      this.updateState(nextLeftSliderValue, nextWidth, nextMax, this.props, nextUnit);
    }
  }

  // Called when user toggles Percent/Slice radio button group
  setUnit(nextUnit) {
    if (this.state.playButtons && nextUnit && nextUnit !== this.state.playButtons.unit) {
      const nextMax = this.getMax(this.props, this.state, this.props.activeAxis, nextUnit);
      const currentMax = this.getMax(this.props, this.state, this.props.activeAxis, this.state.playButtons.unit);
      const nextWidth = this.state.playButtons.width;
      const currentLeftSliderValue = this.state.sliders[this.props.activeAxis].start[0];
      // left slider should not appear to move when changing units
      const nextLeftSliderValue = currentLeftSliderValue * nextMax / currentMax;
      this.updateState(nextLeftSliderValue, nextWidth, nextMax, this.props, nextUnit);
    }
  }

  updateState(leftSliderValue, delta, max, props, unit = ThicknessUnit.slice) {
    if (!props.activeAxis) {
      this.setState(MODE_3D_DEFAULT_SETTINGS);

    } else {
      // sanitize inputs and calculate right slider value
      const halfMax = Math.round(max / 2);
      max = Math.round(max);
      delta =  this.props.mode !== props.mode ? 1 : Math.round(Math.abs(delta));
      leftSliderValue = leftSliderValue >= 0 && leftSliderValue < max ? Math.round(leftSliderValue) : halfMax;
      const rightSliderValue = leftSliderValue + delta <= max ? leftSliderValue + delta : max;

      this.setState(prevState => {
        let state = _.cloneDeep(prevState);
        state.sliders = {};
        const enabledSliderState = {
          start: this.props.mode !== props.mode ? [halfMax, halfMax + delta] : [leftSliderValue, rightSliderValue],
          disabled: false,
          range: {min: 0, max: max}
        };
        AXES.forEach(axis => {
          state.sliders[axis] = axis === props.activeAxis ? enabledSliderState : DISABLED_SLIDER;
        });
        if (this.props.mode !== props.mode) {
          state.playButtons = _.cloneDeep(MODE_2D_DEFAULT_PLAY_BUTTONS_SETTINGS);
        } else {
          if (delta >= 1) {
            state.playButtons.width = delta;
          }
          state.playButtons.unit = unit;
        }
        return state;
      });
    }
  }

  /**
   * Updates left and right slider handles of active axis to move forward or backwards
   * while keeping same distance between the handles
   * @param deltaSteps integer whose sign indicates direction to move handles.
   */
  moveSection(deltaSteps) {
    if (this.state.playButtons) {
      deltaSteps = deltaSteps < 0 ? -1 : 1;
      const max = this.getMax(this.props, this.state, this.props.activeAxis, this.state.playButtons.unit);
      const delta = this.state.playButtons ? (this.state.playButtons.width) * deltaSteps : deltaSteps;
      const currentLeftSliderValue = this.state.sliders[this.props.activeAxis].start[0];
      let leftValue = currentLeftSliderValue + delta;
      leftValue = leftValue < 0 ? max + leftValue : leftValue;
      leftValue = leftValue >= max ? 0 : leftValue;
      this.updateState(leftValue, delta, max, this.props, this.state.playButtons.unit);
    }
  }

  goBack() {
    this.pause();
    this.moveSection(-1);
  }

  play() {
    if (this.state.playButtons && !this.state.playButtons.play) {
      this.setState((prevState) => {
        let state = _.cloneDeep(prevState);
        if (state.playButtons.stop) {
          state.sliders[this.props.activeAxis].start = [0, this.state.playButtons.width];
        }
        state.playButtons.play = true;
        state.playButtons.stop = false;
        state.playButtons.pause = false;
        return state;
      });
      this.interval = setInterval(() => this.moveSection(1), PLAY_RATE_MS_PER_STEP);
    }
  }

  pause() {
    this.clearInterval();
    if (this.state.playButtons && this.state.playButtons.play) {
      this.setState(prevState => {
        let state = _.cloneDeep(prevState);
        state.playButtons.play = false;
        state.playButtons.stop = false;
        state.playButtons.pause = true;
        return state;
      });
    }
  }

  stop() {
    this.clearInterval();
    if (this.state.playButtons && this.state.playButtons.play) {
      this.setState(prevState => {
        let state = _.cloneDeep(prevState);
        state.playButtons.play = false;
        state.playButtons.stop = true;
        state.playButtons.pause = false;
        return state;
      });
    }
  }

  goForward() {
    this.pause();
    this.moveSection(1);
  }

  createSliders () {
    return AXES.map((axis, i) => this.createSlider(axis, i));
  }

  createSlider (axis, i) {
    if (!this.state.sliders) {
      return;
    }

    const onUpdate = this.makeUpdateFn(i);
    const disabled = this.state.sliders[axis.toLowerCase()].disabled;
    const start = this.state.sliders[axis.toLowerCase()].start;
    const range = this.state.sliders[axis.toLowerCase()].range;

    const slider =  <Nouislider
      connect={true}
      range={range}
      start={start}
      behaviour="drag"
      onEnd={this.onSliderDragEnd}
      onUpdate={onUpdate}
      disabled={disabled}/>;

    onUpdate(start);

    return (
      <div key={i} style={STYLES.row}>
        <div style={STYLES.sliderName}>{axis.toUpperCase()}</div>
        <div style={STYLES.slider} className="axis-slider">
          {slider}
        </div>
      </div>
    );
  }



  getMax(props, state, axis, unit) {
    if (state.playButtons && unit === ThicknessUnit.percent) {
      return 100;
    }
    return props.activeAxis && props.activeAxis === axis ?
      props.numSlices[props.activeAxis] / 1 : 100;
  }

  // When user finishes dragging the active slider, update values of left and right handle positions,
  // width input value, and range display
  onSliderDragEnd(values) {
    if (this.state.playButtons) {
      this.updateState(
        values[0],
        values[1] - values[0],
        this.getMax(this.props, this.state, this.props.activeAxis, this.state.playButtons.unit),
        this.props,
        this.state.playButtons.unit
      );
    }
  }

  makeUpdateFn (i) {
    let axis = AXES[i];
    let axisViewMode = VIEWMODES[i];
    return (values, handle, unencoded, tap, positions) => {
      if (this.props.setAxisClip) {
        const step = 1;
        const stepEpsilon = 0.04;
        const unit = this.state.playButtons ? this.state.playButtons.unit : ThicknessUnit.percent;
        const max = this.getMax(this.props, this.state, axis, unit);
        const isActiveAxis = (this.props.mode === axisViewMode);
        const thicknessReduce = this.state.playButtons && isActiveAxis && (this.state.playButtons.unit === ThicknessUnit.slice) ? step - stepEpsilon : 0.0;

        const start = values[0] / max - 0.5;
        const end = (values[1] / max - 0.5) - (thicknessReduce / max);

        // get a value from -0.5..0.5
        this.props.setAxisClip(axis, start, end, isActiveAxis);
      }
    };
  }

  clearInterval() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  componentWillReceiveProps(nextProps) {
    if (!_.isEqual(this.props, nextProps)) {
      this.clearInterval();
      const unit = this.state.playButtons ? this.state.playButtons.unit : ThicknessUnit.slice;
      const width = this.state.playButtons ? this.state.playButtons.width : 1;
      const max = this.getMax(nextProps, this.state, nextProps.activeAxis, unit);
      const left = nextProps.activeAxis && this.props.activeAxis === nextProps.activeAxis ? this.state.sliders[nextProps.activeAxis].start[0] : max / 2;
      this.updateState(left, width, max, nextProps, unit);
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    return !_.isEqual(this.props, nextProps) || !_.isEqual(this.state, nextState);
  }

  render() {
    const activeSlider = this.props.activeAxis;
    const playButtons = this.state.playButtons ?
      <TwoDPlayButtons
                           width={this.state.playButtons.width}
                           unit={this.state.playButtons.unit.toString()}
                           min={this.state.sliders[activeSlider].start[0]}
                           max={this.state.sliders[activeSlider].start[1]}
                           setWidth={this.setWidth}
                           setUnit={this.setUnit}
                           goBack={this.goBack}
                           play={this.play}
                           pause={this.pause}
                           stop={this.stop}
                           goForward={this.goForward}
                           showPlay={this.state.playButtons.stop || this.state.playButtons.pause} /> : <div style={STYLES.placeholder}></div>;
    return (
      <div className="clip-sliders" >
        <h4 className="sectionSubHeader" style={STYLES.header}>
          Region of interest clipping
        </h4>
        <div className="sectionBody">
          {this.props.numSlices && this.createSliders()}
          {playButtons}
        </div>
      </div>
    );
  }

  componentWillMount() {
    this.clearInterval();
  }
}

const STYLES = {
  placeholder: {
    height: 48
  },
  row: {
    display: 'flex'
  },
  slider: {
    flex: 7,
    marginTop: '0.5em'
  },
  header: {
    color: 'white',
  },
  sliderName: {
    flex: 1
  },
  wrapper: {
    minHeight: 325
  }
};
