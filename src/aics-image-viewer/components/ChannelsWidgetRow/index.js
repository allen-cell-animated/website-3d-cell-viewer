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
import classNames from 'classnames';

import TfEditor from '../TfEditor';

import colorPalette from '../../shared/colorPalette';
import {
  ISOSURFACE_OPACITY_SLIDER_MAX, 
  ISO_VALUE, 
  ISO_SURFACE_ENABLED, 
  LUT_CONTROL_POINTS,
  OPACITY, 
  SAVE_ISO_SURFACE,
  VOLUME_ENABLED,
} from '../../shared/constants';

import ColorPicker from '../ColorPicker.js';

import './styles.scss';
import { colorArrayToRgbObject, rgbObjectToArray } from '../../shared/utils/colorObjectArrayConverting';

const Panel = Collapse.Panel;
const ISOSURFACE_OPACITY_DEFAULT = 1.0;
const ISOVALUE_DEFAULT = 128.0;

export default class ChannelsWidgetRow extends React.Component {
  constructor(props) {
    super(props);
    this.toggleControlsOpen = this.toggleControlsOpen.bind(this);
    this.onColorChange = this.onColorChange.bind(this);
    this.volumeCheckHandler = this.volumeCheckHandler.bind(this);
    this.isosurfaceCheckHandler = this.isosurfaceCheckHandler.bind(this);
    this.onIsovalueChange = this.onIsovalueChange.bind(this);
    this.onOpacityChange = this.onOpacityChange.bind(this);
    this.onSaveIsosurfaceSTL = this.onSaveIsosurfaceSTL.bind(this);
    this.onSaveIsosurfaceGLTF = this.onSaveIsosurfaceGLTF.bind(this);
    this.onUpdateLutControlPoints = this.onUpdateLutControlPoints.bind(this);
    this.state = {
      controlsOpen: false,
    };
  }

  volumeCheckHandler({ target }) {
    const { channelName, index, changeOneChannelSetting, isosurfaceChecked} = this.props;
    if (!target.checked && !isosurfaceChecked) {
      this.setState({controlsOpen: false});
    }
    changeOneChannelSetting(channelName, index, VOLUME_ENABLED, target.checked);
  }

  isosurfaceCheckHandler({ target }) {
    const { channelName, index, changeOneChannelSetting, volumeChecked } = this.props;
    if (!target.checked && !volumeChecked) {
      this.setState({ controlsOpen: false });
    }
    changeOneChannelSetting(channelName, index, ISO_SURFACE_ENABLED, target.checked);
  }

  onIsovalueChange(newValue) {
    const { channelName, index, changeOneChannelSetting } = this.props;
    changeOneChannelSetting(channelName, index, ISO_VALUE, newValue);
  }

  onOpacityChange(newValue) {
    const { channelName, index, changeOneChannelSetting } = this.props;
    changeOneChannelSetting(channelName, index, OPACITY, newValue / ISOSURFACE_OPACITY_SLIDER_MAX);
  }

  onUpdateLutControlPoints(newValue) {
    const { channelName, index, changeOneChannelSetting } = this.props;
    changeOneChannelSetting(channelName, index, LUT_CONTROL_POINTS, newValue);
  }

  onSaveIsosurfaceSTL() {
    const { index, handleChangeToImage } = this.props;
    handleChangeToImage(SAVE_ISO_SURFACE, 'STL', index);
  }

  onSaveIsosurfaceGLTF() {
    const { index, handleChangeToImage } = this.props;
    handleChangeToImage(SAVE_ISO_SURFACE, 'GLTF', index);
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
              onChange={this.onIsovalueChange}/>
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
            onChange={this.onOpacityChange}/>
        </Col>
      </Row>
    );
  }

  toggleControlsOpen() {
    const { 
      isosurfaceChecked,
      volumeChecked,
    } = this.props;
    if (!isosurfaceChecked && !volumeChecked) {
      return;
    }
    this.setState({
      controlsOpen: !this.state.controlsOpen
    });
  }


  createVolumeCheckbox() {
    let id = `vol_checkbox${this.props.index}`;
    return (
        <Checkbox
          checked={this.props.volumeChecked}
          onChange={this.volumeCheckHandler}
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
          onChange={this.isosurfaceCheckHandler}
          id={id}
          >
          surface
        </Checkbox>
    );
  }

  onColorChange(newRGB, oldRGB, index) {
    const { channelName } = this.props;
    const color = rgbObjectToArray(newRGB);
    this.props.changeOneChannelSetting(channelName, index, 'color', color);
  }

  createColorPicker() {
    const color = colorArrayToRgbObject(this.props.color);
    return (
      <div style={STYLES.colorPicker}>
        <ColorPicker 
          color={color}
          onColorChange={this.onColorChange}
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
        onClick={this.onSaveIsosurfaceGLTF}
        style={STYLES.raisedButton}
      >Save GLTF
      </Button>
    );
  }

  createSaveIsosurfaceSTLButton() {
    return (
      <Button
        disabled={!this.props.isosurfaceChecked}
        onClick={this.onSaveIsosurfaceSTL}
        style={STYLES.raisedButton}
      >Save STL
      </Button>
    );
  }

  renderActions() {
    return [this.createVolumeCheckbox(), this.createIsosurfaceCheckbox(), (<Icon
      type="setting"
      theme={this.state.controlsOpen ? 'filled' : 'outlined'}
      onClick={this.toggleControlsOpen}
    />)];
  }

  createTFEditor() {
    const {
      channelControlPoints,
      channelDataForChannel,
      updateChannelTransferFunction,
      index,
      imageName,
    } = this.props;
    return (<TfEditor 
          id={'TFEditor'+index}
          index={index}
          imageName={imageName}
          fit-to-data={false}
          width={250}
          height={150}
          volumeData={channelDataForChannel.volumeData}
          channelData={channelDataForChannel}
          controlPoints={channelControlPoints}
          updateChannelTransferFunction={updateChannelTransferFunction}
          updateChannelLutControlPoints={this.onUpdateLutControlPoints}
    />);
  }

  renderSurfaceControls() {
     return (
            <Col span={24}>
              <h4 className="ant-list-item-meta-title">Surface settings:</h4>
              {this.createIsovalueSlider()}
              {this.createOpacitySlider()}
              {this.createSaveIsosurfaceSTLButton()}
              {this.createSaveIsosurfaceGLTFButton()}
            </Col>
          );
  }

  renderControls() {
    return (
      <div style={STYLES.settingsContainer}> 
      {this.props.volumeChecked && 
        <Row type="flex" justify="space-between" className="volume-settings">
          <h4 className="ant-list-item-meta-title">Volume settings:</h4>
          {this.createTFEditor()}
        </Row>}
        {this.props.isosurfaceChecked &&
        <Row type="flex" justify="space-between">
          {this.renderSurfaceControls()}
        </Row>}
      </div>
    );
  }

  render() {
    const rowClass = classNames({
      'row-card': true,
      'controls-closed': !this.state.controlsOpen,
    });
    return (
      <List.Item
        key={this.props.index}
        className={rowClass}
        actions={this.renderActions()}
      >
        <List.Item.Meta
          title={<span style={STYLES.channelName}>{this.props.name}</span>}
          avatar={this.createColorPicker()}
        />
        {this.state.controlsOpen && this.renderControls()}
      </List.Item>

    );
  }
}

const STYLES = {
  channelName: {
    display: 'inline-block',
    minWidth: 90,
  },
  checkedIcon: { 
    fill: colorPalette.textColor 
  },
  settingsContainer: {
    width: '100%',
    order: 3,
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
