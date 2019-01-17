import React from 'react';
import Nouislider from 'react-nouislider';
import NumericInput from 'react-numeric-input';

import {
  Card,
  Checkbox,
} from 'antd';

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
      brightnessSlider: 65,
      densitySlider: 50,
      levelsSlider: [58.32, 149.00, 255.00],
      pixelSize: props.image ? props.image.pixel_size.slice() : [1,1,1]
    };
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
        this.setState({ maskAlphaSlider: unencoded[0] });
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
        min: 0,
        max: 255
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

  handleMaxProjectionCheck({target}) {
    this.setState({ maxProjectionChecked: target.checked });
    this.props.onUpdateImageMaxProjectionMode(target.checked);
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
        connected={true}
        behavior="drag"
        onUpdate={onUpdate} 
        />
    );
  }

  createProjectionModeControls() {
    return (
      <Checkbox
        checked={this.state.maxProjectionChecked}
        onChange={this.handleMaxProjectionCheck}
      >Max projection
      </Checkbox>
    );
  }

  render() {
    if (!this.props.image) return null;

    return (
      <Card 
        extra={this.createProjectionModeControls()}
        bordered={false}
        title="Global volume rendering settings"
        type="inner"
        bodyStyle={STYLES.card}
        >
        <div style={STYLES.slidersWrapper}>
        {this.createMaskAlphaSlider()}
        {this.createBrightnessSlider()}
        {this.createDensitySlider()}
        {this.createLevelsSlider()}
          
      </div>
    </Card>);
  }
}

const STYLES = {
  card: {
    padding: '16px 24px',
  },
  slidersWrapper: {
    width: 'calc(100% - 20px)',
    margin: 'auto',
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
    height: 30,
    marginTop: 15,
  }
};
