import React from 'react';

import {
  Button,
  Icon, 
  Collapse, 
  List,
  Col,
  Row,
  Checkbox,
  Slider,
}
from 'antd';

// polyfill for window.customElements (Firefox) - required for tf-editor to work.
// see https://github.com/webcomponents/webcomponentsjs/issues/870
import '@webcomponents/webcomponentsjs/webcomponents-sd-ce.js';
import '../tf-editor.html';
import 'react-polymer';

import colorPalette from '../shared/colorPalette';
import {
  ISOSURFACE_OPACITY_SLIDER_MAX
} from '../../shared/constants';

import ColorPicker from '../ColorPicker.js';

import './styles.scss';

const Panel = Collapse.Panel;
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
      this.tfeditor.setData(nextProps.index, nextProps.image.getChannel(nextProps.index));
      this.tfeditor.onChangeCallback = nextProps.updateChannelTransferFunction;
    }
  }

  // this happens after componentWillMount, after render, and before componentDidMount. it is set in a ref={} attr.
  // the Card implementation is controlling this component lifetime event
  storeTfEditor(el) {
    this.tfeditor = el;

    if (this.props.channelDataReady && this.tfeditor) {
      this.tfeditor.setData(this.props.index, this.props.image.getChannel(this.props.index));
      this.tfeditor.onChangeCallback = this.props.updateChannelTransferFunction;
    }
  }

  createIsovalueSlider() {
    const isoRange = { min: 0, max: 255 };
    return (
      <Row>
        <Col span={10}>
          <label style={STYLES.controlName}>isovalue</label>
        </Col>
        <Col span={12}>          
          <Slider
              name="isovalue"
              disabled={!this.props.isosurfaceChecked}
              min={isoRange.min || 0}
              max={isoRange.max || 225}
              defaultValue={ISOVALUE_DEFAULT}
              sliderStyle={STYLES.slider}
              onChange={this.props.onIsovalueChange}/>
        </Col>
      </Row>
    );
  }

  createOpacitySlider() {
    const range = {min:0, max:ISOSURFACE_OPACITY_SLIDER_MAX};
    return (
      <Row>
        <Col span={10}>
          <label style={STYLES.controlName}>opacity</label>
        </Col>
        <Col span={12}>   
          <Slider
            name="opacity"
            disabled={!this.props.isosurfaceChecked}
            min={range.min}
            max={range.max}
            defaultValue={ISOSURFACE_OPACITY_DEFAULT * ISOSURFACE_OPACITY_SLIDER_MAX}
            sliderStyle={STYLES.slider}
            onChange={this.props.onOpacityChange}/>
        </Col>
      </Row>
    );
  }

  createVolumeCheckbox() {
    let id = `vol_checkbox${this.props.index}`;
    return (
      <Checkbox
        checked={this.props.volumeChecked }
        onChange={this.props.onVolumeCheckboxChange}
        id={id}
      >
        volume
      </ Checkbox>
    );
  }

  createIsosurfaceCheckbox() {
    let id = `iso_checkbox${this.props.index}`;
    return (
      <Checkbox
        checked={this.props.isosurfaceChecked }
        onChange={this.props.onIsosurfaceChange}
        style={{width: 120}}
        id={id}
        >
        surface
      </Checkbox>
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
      <Button
        disabled={!this.props.isosurfaceChecked}
        onClick={this.props.onSaveIsosurfaceGLTF}
        style={STYLES.raisedButton}
      >Save GLTF
      </Button>
    );
  }

  createSaveIsosurfaceSTLButton() {
    return (
      <Button
        disabled={!this.props.isosurfaceChecked}
        onClick={this.props.onSaveIsosurfaceSTL}
        style={STYLES.raisedButton}
      >Save STL
      </Button>
    );
  }

  createTFEditor() {
    if (this.props.image.getChannel(this.props.index)) {
      return (
        <tf-editor
          ref={this.storeTfEditor}
          id={'aicstfeditor_'+this.props.index}
          fit-to-data={false}
          width={250}
          height={150}
          control-points={JSON.stringify(this.props.image.getChannel(this.props.index).lutControlPoints)}
        >
        </tf-editor>
      );
    } else { return null; }
  }

  renderSubHeader() {
    return [this.createVolumeCheckbox(), this.createIsosurfaceCheckbox()];
  }

  renderCardHeaderTitle() {
    return (
      <div key={this.props.index} >
        {<span style={STYLES.channelName}>{this.props.name}</span>}
      </div>
    );
  }

  renderCollapseHeader() {
    return (
      <List.Item
        key={this.props.index}
        className='row-card'
        actions={this.renderSubHeader()}
      >
        <List.Item.Meta
          title={this.renderCardHeaderTitle()}
          avatar={this.createColorPicker()}
        />
      </List.Item>

    );
  }

  render() {
    let id = `channel_checkbox${this.props.index}`;
    return (
      <div>
      {this.renderCollapseHeader()}
      <Collapse 
        bordered={false} 
        className="channel-options-card" 
        >
        <Panel
          header={(
          <Icon 
            type="setting" 
            theme="filled" 
            style={{ fontSize: '1.2em'}}
            />
          )}
          key={id}
          showArrow={false}
        >
        <Row type="flex" justify="space-between">
            <Col span={12}>
              {this.createTFEditor()}
            </Col>
            <Col span={12}>
              {this.createIsovalueSlider()}
              {this.createOpacitySlider()}
              {this.createSaveIsosurfaceSTLButton()}
              {this.createSaveIsosurfaceGLTFButton()}
            </Col>
          </Row>
        </Panel>
      </Collapse>
      </div>
    );
  }
}

const STYLES = {
  channelName: {
    display: 'inline-block',
    width: 160
  },
  checkedIcon: { 
    fill: colorPalette.textColor 
  },
  uncheckedIcon: { 
    fill: colorPalette.accent3Color 
  },
  raisedButton: {
    marginLeft: '2px',
    marginRight: '2px'
  },
  colorPicker: {
    margin: 'auto',
    marginRight: 16
  },
  slider: {
    marginBottom: '4px',
    marginTop: '4px'
  },
  controlName: {
    whiteSpace: 'nowrap'
  }
};
