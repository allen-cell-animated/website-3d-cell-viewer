import React from 'react';
import {
  Card,
  CardHeader,
  CardText,
  Checkbox,
  RaisedButton,
  Slider
} from 'material-ui';
import Visibility from 'material-ui/svg-icons/action/visibility';
import VisibilityOff from 'material-ui/svg-icons/action/visibility-off';
import Edit from 'material-ui/svg-icons/image/edit';
// polyfill for window.customElements (Firefox) - required for tf-editor to work.
// see https://github.com/webcomponents/webcomponentsjs/issues/870
import '../../../node_modules/@webcomponents/webcomponentsjs/webcomponents-sd-ce.js';
import './tf-editor.html';
import 'react-polymer';

import colorPalette from './shared/colorPalette';
import {
  ISOSURFACE_OPACITY_SLIDER_MAX
} from '../shared/constants';

import ColorPicker from './ColorPicker.js';

const ISOSURFACE_OPACITY_DEFAULT = 1.0;
const ISOVALUE_DEFAULT = 128.0;

export default class ChannelsWidgetRow extends React.Component {
  constructor(props) {
    super(props);

    this.storeTfEditor = this.storeTfEditor.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    // channelDataReady really only ever goes from false to true.  We don't have a pattern where it can become false.
    if (this.props.channelDataReady !== nextProps.channelDataReady && this.tfeditor) {
      this.tfeditor.setData(nextProps.index, nextProps.image.channelData.channels[nextProps.index]);
      this.tfeditor.onChangeCallback = nextProps.updateChannelTransferFunction;
    }
  }

  // this happens after componentWillMount, after render, and before componentDidMount. it is set in a ref={} attr.
  // the Card implementation is controlling this component lifetime event
  storeTfEditor(el) {
    this.tfeditor = el;

    if (this.props.channelDataReady && this.tfeditor) {
      this.tfeditor.setData(this.props.index, this.props.image.channelData.channels[this.props.index]);
      this.tfeditor.onChangeCallback = this.props.updateChannelTransferFunction;
    }
  }

  componentWillUnmount() {
    // if (this.tfeditor) {
    //   this.tfeditor.destroy();
    // }
  }

  createIsovalueSlider() {
    const isoRange = { min: 0, max: 255 };
    return (
      <div style={STYLES.controlRow} className="slider-row">
          <Slider
            name="isovalue"
            disabled={!this.props.isosurfaceChecked}
            min={isoRange.min || 0}
            max={isoRange.max || 225}
            defaultValue={ISOVALUE_DEFAULT}
            sliderStyle={STYLES.slider}
            onChange={this.props.onIsovalueChange}/>
          <div style={STYLES.controlName}>isovalue</div>
      </div>
    );
  }

  createOpacitySlider() {
    const range = {min:0, max:ISOSURFACE_OPACITY_SLIDER_MAX};
    return (
      <div style={STYLES.controlRow} className="slider-row">
        <Slider
          name="opacity"
          disabled={!this.props.isosurfaceChecked}
          min={range.min}
          max={range.max}
          defaultValue={ISOSURFACE_OPACITY_DEFAULT * ISOSURFACE_OPACITY_SLIDER_MAX}
          sliderStyle={STYLES.slider}
          onChange={this.props.onOpacityChange}/>
        <div style={STYLES.controlName}>opacity</div>
      </div>
    );
  }

  createVolumeCheckbox() {
    let id = `vol_checkbox${this.props.index}`;
    return (
      <Checkbox
        label={"volume"}
        checked={this.props.volumeChecked || false}
        onCheck={this.props.onVolumeCheckboxChange}
        checkedIcon={<Visibility style={STYLES.checkedIcon}/>}
        uncheckedIcon={<VisibilityOff style={STYLES.uncheckedIcon}/>}
        id={id}
        style={STYLES.channelCheckbox}
      />
    );
  }

  createIsosurfaceCheckbox() {
    let id = `iso_checkbox${this.props.index}`;
    return (
      <Checkbox
        label={"surface"}
        checked={this.props.isosurfaceChecked || false}
        onCheck={this.props.onIsosurfaceChange}
        checkedIcon={<Visibility style={STYLES.checkedIcon}/>}
        uncheckedIcon={<VisibilityOff style={STYLES.uncheckedIcon}/>}
        id={id}
        style={STYLES.channelCheckbox}
      />
    );
  }

  createColorPicker() {
    return (
      <div style={STYLES.colorPicker}>
        <ColorPicker color={this.props.color}
          onColorChange={this.props.onColorChange}
          onColorChangeComplete={this.props.onColorChangeComplete}
          idx={this.props.index}
          width={18}
          name={this.props.name} />
      </div>
    );
  }

  createSaveIsosurfaceGLTFButton() {
    return (
      <RaisedButton
        label="Save GLTF"
        disabled={!this.props.isosurfaceChecked}
        onClick={this.props.onSaveIsosurfaceGLTF}
        style={STYLES.raisedButton}
      />
    );
  }

  createSaveIsosurfaceSTLButton() {
    return (
      <RaisedButton
        label="Save STL"
        disabled={!this.props.isosurfaceChecked}
        onClick={this.props.onSaveIsosurfaceSTL}
        style={STYLES.raisedButton}
      />
    );
  }

  createTFEditor() {
    if (this.props.image.channelData.channels[this.props.index]) {
      return (
        <tf-editor
          ref={this.storeTfEditor}
          id={'aicstfeditor_'+this.props.index}
          fit-to-data={false}
          width={250}
          height={150}
          control-points={JSON.stringify(this.props.image.channelData.channels[this.props.index].lutControlPoints)}
        >
        </tf-editor>
      );
    } else { return null; }
  }

  renderCardHeaderTitle() {
    return (
      <div key={this.props.index} style={STYLES.row}>
        {this.createColorPicker()}
        {<span style={STYLES.channelName}>{this.props.name}</span>}
        {this.createVolumeCheckbox()}
        {this.createIsosurfaceCheckbox()}
      </div>
    );
  }

  render() {
    let id = `channel_checkbox${this.props.index}`;
    return (
      <Card key={this.props.index} className='row-card' style={STYLES.rowCard}>
        <CardHeader 
          title={this.renderCardHeaderTitle()}
          style={STYLES.header} 
          titleStyle={STYLES.headerTextStyle}
          showExpandableButton={true} 
          iconStyle={STYLES.cardIcon} 
          closeIcon={<Edit />}>
        </CardHeader>

        <CardText expandable={true} className="channel-options-card" style={STYLES.channelOptionsCard}>
          <div className="volume-options column" style={STYLES.column}>
          {this.createTFEditor()}
          </div>
          <div className="surface-options column" style={STYLES.column}>
          {this.createIsovalueSlider()}
          {this.createOpacitySlider()}
          {this.createSaveIsosurfaceSTLButton()}
          {this.createSaveIsosurfaceGLTFButton()}
          </div>
        </CardText>
      </Card>

    );
  }
}

const STYLES = {
  header: {
    padding: '0.25em'
  },
  headerTextStyle: {
    display: 'flex'
  },
  headerSubTitleTextStyle: {
    display: 'flex'
  },
  cardIcon: { 
    fill: colorPalette.primary1Color, 
    color: colorPalette.primary1Color 
  },
  channelName: {
    display: 'inline-block',
    width: 160
  },
  checkedIcon: { fill: colorPalette.textColor },
  uncheckedIcon: { fill: colorPalette.accent3Color },
  channelOptionsCard:{
    display: 'flex'
  },
  column: {
    flex: '1 1 100%'
  },
  rowCard: {
    backgroundColor: 'none',
    borderRadius: 'none',
    boxShadow: 'none',
    zIndex: 'inital'
  },
  row: {
    display: 'flex',
    flexFlow: 'row wrap',
    justifyContent: 'flex-start'
  },
  raisedButton: {
    marginLeft: '2px',
    marginRight: '2px'
  },
  channelCheckbox: {
    fontSize: 14,
    width: 'initial',
    margin: 'auto',
    marginRight: 16
  },
  colorPicker: {
    flex: 1,
    margin: 'auto',
    marginRight: 16
  },
  control: {
    flex: 5,
    height: 30
  },
  slider: {
    marginBottom: '4px',
    marginTop: '4px'
  },
  controlRow: {
    flex: '1 100%',
    margin:'4px'
  },
  controlName: {
    whiteSpace: 'nowrap'
  }
};
