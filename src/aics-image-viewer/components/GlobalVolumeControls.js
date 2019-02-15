import React from 'react';
import Nouislider from 'react-nouislider';
import NumericInput from 'react-numeric-input';

import {
  Card,
  Checkbox,
  Collapse,
} from 'antd';
const Panel = Collapse.Panel;

const INITIAL_SETTINGS = {
  autoRotateChecked: false,
  maxProjectionChecked: false,
  maskAlphaSlider: [50],
  brightnessSlider: [65],
  densitySlider: [50],
  levelsSlider: [58.32, 149.00, 255.00],
};

export default class GlobalVolumeControls extends React.Component {

  constructor(props) {
    super(props);
    // this.makeUpdatePixelSizeFn = this.makeUpdatePixelSizeFn.bind(this);
    this.handleAutorotateCheck = this.handleAutorotateCheck.bind(this);
    this.handleMaxProjectionCheck = this.handleMaxProjectionCheck.bind(this);
    this.onAlphaSliderUpdate = this.onAlphaSliderUpdate.bind(this);
    this.onBrightnessUpdate = this.onBrightnessUpdate.bind(this);
    this.onDensityUpdate = this.onDensityUpdate.bind(this);
    this.onLevelsUpdate = this.onLevelsUpdate.bind(this);
  }

  componentDidMount() {
    this.onAlphaSliderUpdate(INITIAL_SETTINGS.maskAlphaSlider);
    this.onBrightnessUpdate(INITIAL_SETTINGS.brightnessSlider);
    this.onDensityUpdate(INITIAL_SETTINGS.densitySlider);
    this.onLevelsUpdate(INITIAL_SETTINGS.levelsSlider);
  }

  componentDidUpdate() {
      this.onAlphaSliderUpdate(INITIAL_SETTINGS.maskAlphaSlider);
      this.onBrightnessUpdate(INITIAL_SETTINGS.brightnessSlider);
      this.onDensityUpdate(INITIAL_SETTINGS.densitySlider);
      this.onLevelsUpdate(INITIAL_SETTINGS.levelsSlider);
  } 

  shouldComponentUpdate(newProps) {
    const { imageName } = this.props;
    return newProps.imageName !== imageName;
  }

  onAlphaSliderUpdate(values) {
    let val = 1 - (values[0] / 100.0);
    this.props.onUpdateImageMaskAlpha(val);
}

  createMaskAlphaSlider() {
    let config = {
      label: 'crop to cell',
      start: INITIAL_SETTINGS.maskAlphaSlider,
      range: {
        min: 0,
        max: 100
      },
      onUpdate: this.onAlphaSliderUpdate,
    };
    return this.createSliderRow(config);
  }

  onBrightnessUpdate(values) {
    let val = 0.05 * (values[0] - 50);
    let setVal = Math.exp(val);
    this.props.onUpdateImageBrightness(setVal);
  }

  createBrightnessSlider() {
    let config = {
      label: 'brightness',
      start: INITIAL_SETTINGS.brightnessSlider,
      range: {
        min: 0,
        max: 100
      },
      onUpdate: this.onBrightnessUpdate,
    };
    return this.createSliderRow(config);
  }

  onDensityUpdate(values) {
    let val = 0.05 * (values[0] - 100);
    let setVal = Math.exp(val);
    this.props.onUpdateImageDensity(setVal);
  }

  createDensitySlider () {
    let config = {
      label: 'density',
      start: INITIAL_SETTINGS.densitySlider,
      range: {
        min: 0,
        max: 100
      },
      onUpdate: this.onDensityUpdate,
    };
    return this.createSliderRow(config);
  }

  onLevelsUpdate(values) {
    let minThumb = Number(values[0]);
    let conThumb = Number(values[1]);
    let maxThumb = Number(values[2]);

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
  }

  createLevelsSlider () {
    let config = {
      label: 'levels',
      start: INITIAL_SETTINGS.levelsSlider,
      range: {
        min: 0,
        max: 255
      },
      onUpdate: this.onLevelsUpdate,
    };
    return this.createSliderRow(config);
  }

  createVolumeAxisScaling(config) {
    const { pixelSize } = this.props;
    const SCALE_UI_MIN_VAL = 0.001;
    const SCALE_UI_STEP_SIZE = 0.01;
    const imagePixelSize = pixelSize ? pixelSize.slice() : [1, 1, 1];

    return (
      <div key={config.key} style={STYLES.controlRow}>
        <div style={STYLES.controlName}>{config.label}</div>
        <div style={STYLES.control}>
          <NumericInput min={SCALE_UI_MIN_VAL} step={SCALE_UI_STEP_SIZE} value={imagePixelSize[config.key]} onChange={config.onUpdate}/>
        </div>
      </div>
    );
  }

  createVolumeScalingControls () {
    return ['x', 'y', 'z'].map((axis, i) => this.createVolumeAxisScaling({
      key: i,
      label: `${axis} scale`,
      onUpdate: this.props.makeUpdatePixelSizeFn(i)
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
        tooltips={true}
        behavior="drag"
        onUpdate={onUpdate} 
        />
    );
  }

  createProjectionModeControls() {
    return (
      <Checkbox
        defaultChecked={INITIAL_SETTINGS.maxProjectionChecked}
        onChange={this.handleMaxProjectionCheck}
      >Max projection
      </Checkbox>
    );
  }

  render() {
    if (!this.props.imageName) return null;
    return (
      <Card
        extra={this.createProjectionModeControls()}
        bordered={false}
        title="Global volume rendering settings"
        type="inner"
        className="global-volume-controls"
        bodyStyle={STYLES.card}
      >
        <Collapse
          bordered={false}
          >
          <Panel
            key="gobal-volume"
          >
            <div style={STYLES.slidersWrapper}>
              {this.createMaskAlphaSlider()}
              {this.createBrightnessSlider()}
              {this.createDensitySlider()}
              {this.createLevelsSlider()}
            </div>
          </Panel>
        </Collapse>
      </Card>
    );
  }
}

const STYLES = {
  card: {
    padding: '16px 0px',
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
