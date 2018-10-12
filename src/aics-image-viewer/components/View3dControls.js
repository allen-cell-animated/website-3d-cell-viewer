import React from 'react';
import Nouislider from 'react-nouislider';
import NumericInput from 'react-numeric-input';
import { Checkbox } from 'material-ui';

import DropdownMenu from './shared/DropdownMenu';

export default class View3dControls extends React.Component {
  constructor(props) {
    super(props);
    this.makeUpdatePixelSizeFn = this.makeUpdatePixelSizeFn.bind(this);
    this.handleAutorotateCheck = this.handleAutorotateCheck.bind(this);
    this.handleMaxProjectionCheck = this.handleMaxProjectionCheck.bind(this);
    this.handleMaskMenuItemClick = this.handleMaskMenuItemClick.bind(this);
    this.state = {
      autoRotateChecked: false,
      maxProjectionChecked: false,
      maskAlphaSlider: 100,
      brightnessSlider: 75,
      densitySlider: 80,
      levelsSlider: [58.32, 149.00, 255.00],
      pixelSize: props.image ? props.image.pixel_size.slice() : [1,1,1]
    };
  }

  createSliderRow(config) {
    return (
      <div style={STYLES.controlRow}>
        <div style={STYLES.controlName}>{config.label}</div>
        <div style={STYLES.control}>
          {this.createSlider(config.start, config.range, config.onUpdate)}
        </div>
      </div>
    );
  }

  createSlider(start, range, onUpdate) {
    return (
      <Nouislider
        range={range}
        start={start}
        behaviour="drag"
        connect={true}
        onUpdate={onUpdate}/>
    );
  }

  handleMaskMenuItemClick(i) {
    this.props.image.setChannelAsMask(i);
  }

  createMaskAlphaSlider() {
    let config = {
      label: 'maskAlpha',
      start: [this.state.maskAlphaSlider],
      range: {
        min: 0,
        max: 100
      },
      onUpdate: (values, handle, unencoded, tap, positions) => {
        let val = values[0] / 100.0;
        this.props.onUpdateImageMaskAlpha(val);
        this.setState({maskAlphaSlider:unencoded[0]});
      }
    };
    return this.createSliderRow(config);
  }

  createBrightnessSlider() {
    let config = {
      label: 'brightness',
      start: [this.state.brightnessSlider],
      range: {
        min: 0,
        max: 100
      },
      onUpdate: (values, handle, unencoded, tap, positions) => {
        let val = 0.05 * (values[0] - 50);
        let setVal = Math.exp(val);
        this.props.onUpdateImageBrightness(setVal);
        this.setState({brightnessSlider:unencoded[0]});
      }
    };
    return this.createSliderRow(config);
  }

  createDensitySlider () {
    let config = {
      label: 'density',
      start: [this.state.densitySlider],
      range: {
        min: 0,
        max: 100
      },
      onUpdate: (values, handle, unencoded, tap, positions) => {
        let val = 0.05 * (values[0] - 100);
        let setVal = Math.exp(val);
        this.props.onUpdateImageDensity(setVal);
        this.setState({densitySlider:unencoded[0]});
      }
    };
    return this.createSliderRow(config);
  }

  createLevelsSlider () {
    let config = {
      label: 'levels',
      start: [this.state.levelsSlider[0], this.state.levelsSlider[1], this.state.levelsSlider[2]],
      range: {
        'min': 0,
        'max': 255
      },
      onUpdate: (values, handle, unencoded, tap, positions) => {
        let minThumb = unencoded[0];
        let conThumb = unencoded[1];
        let maxThumb = unencoded[2];
        if (conThumb > maxThumb || conThumb < minThumb) {
          conThumb = 0.5 * (minThumb + maxThumb);
        }
        let min = minThumb;
        let max = maxThumb;
        let mid = conThumb;
        let div = 255; //this.getWidth();
        min /= div;
        max /= div;
        mid /= div;
        let diff = max - min;
        let x = (mid - min) / diff;
        let scale = 4 * x * x;
        if ((mid - 0.5) * (mid - 0.5) < 0.0005) {
          scale = 1.0;
        }
        let vals = {
          min: min,
          scale: scale,
          max: max
        };

        this.props.onUpdateImageGammaLevels(vals.min, vals.max, vals.scale);

        this.setState({levelsSlider:[unencoded[0], unencoded[1], unencoded[2]]});
      }
    };
    return this.createSliderRow(config);
  }

  createVolumeAxisScaling(config) {
    const SCALE_UI_MIN_VAL = 0.001;
    const SCALE_UI_STEP_SIZE = 0.01;
    return (
      <div key={config.key} style={STYLES.controlRow}>
        <div style={STYLES.controlName}>{config.label}</div>
        <div style={STYLES.control}>
          <NumericInput min={SCALE_UI_MIN_VAL} step={SCALE_UI_STEP_SIZE} value={this.state.pixelSize[config.key]} onChange={config.onUpdate}/>
        </div>
      </div>
    );
  }

  makeUpdatePixelSizeFn(i) {
    return (value) => {
      const pixelSize = this.state.pixelSize.slice();
      pixelSize[i] = value;
      this.props.image.setVoxelSize(pixelSize);
      this.setState({pixelSize:pixelSize});
    };
  }

  createVolumeScalingControls () {
    return ['x', 'y', 'z'].map((axis, i) => this.createVolumeAxisScaling({
      key: i,
      label: `${axis} scale`,
      onUpdate: this.makeUpdatePixelSizeFn(i)
    }));
  }

  handleAutorotateCheck(event, checked) {
    this.setState({autoRotateChecked:checked});
    this.props.onAutorotateChange();
  }

  handleMaxProjectionCheck(event, checked) {
    this.setState({maxProjectionChecked:checked});
    this.props.onUpdateImageMaxProjectionMode(checked);
  }

  createProjectionModeControls() {
    return (
      <Checkbox
        label={"Max projection"}
        checked={this.state.maxProjectionChecked}
        onCheck={this.handleMaxProjectionCheck}
        style={STYLES.controlRow}
      />
    );
  }

  componentWillReceiveProps(newProps) {
    this.setState({
      pixelSize: newProps.image ? newProps.image.pixel_size.slice() : [1,1,1]
    });
  }

  shouldComponentUpdate(newProps, newState) {
    // TODO add better identifiers of images than name (like an id)
    const receivingImageForFirstTime = !this.props.image && !!newProps.image;
    const imageExists = !!newProps.image && !!this.props.image;
    const imageNameIsDifferent = imageExists && newProps.image.name !== this.props.image.name;
    const imageChannelsAreDifferent = (newProps.channels !== this.props.channels) || 
      (newProps.channels.length !== this.props.channels.length);
    return receivingImageForFirstTime || imageNameIsDifferent || imageChannelsAreDifferent ||
      (newProps.mode !== this.props.mode) ||
      (newState.autoRotateChecked !== this.state.autoRotateChecked) || 
      (newState.maxProjectionChecked !== this.state.maxProjectionChecked);
  }

  render() {
    if (!this.props.image) return null;

    return (<div style={STYLES.wrapper}>

      <div style={STYLES.controlsWrapper}>
      <h4>Global volume rendering settings</h4>
        {this.createMaskAlphaSlider()}
        {this.createBrightnessSlider()}
        {this.createDensitySlider()}
        {this.createLevelsSlider()}
        {this.createProjectionModeControls()}
      </div>
    </div>);
  }
}

const STYLES = {
  wrapper: {
    margin: '2em 0'
  },
  slidersWrapper: {
    width: 'calc(100% - 17px)'
  },
  controlRow: {
    height: '3em',
    display: 'flex'
  },
  controlName: {
    flex: 2,
    whiteSpace: 'nowrap'
  },
  control: {
    flex: 5,
    height: 30
  }
};
