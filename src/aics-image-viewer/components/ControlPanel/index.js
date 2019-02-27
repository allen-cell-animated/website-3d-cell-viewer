import React from 'react';

import { 
  Card,
  Button,
  Dropdown,
  Radio,
  Icon,
  Menu,
} from 'antd';

import ViewModeRadioButtons from "../ViewModeRadioButtons";
import ChannelsWidget from "../ChannelsWidget";
import GlobalVolumeControls from "../GlobalVolumeControls";

import { 
  PRESET_COLOR_MAP, 
  SEGMENTED_CELL, 
  FULL_FIELD_IMAGE, 
} from '../../shared/constants';

import './styles.scss';

const RadioGroup = Radio.Group;

export default class ControlPanel extends React.Component {
  constructor(props) {
    super(props);
    this.handleToggle = this.handleToggle.bind(this);
    this.makeTurnOnPresetFn = this.makeTurnOnPresetFn.bind(this);
    this.handleSwitchFovCell = this.handleSwitchFovCell.bind(this);
    this.state = {open: true};
  }

  handleToggle() {
    this.setState({open: !this.state.open});
  }

  makeTurnOnPresetFn({ key }) {
    const presets = PRESET_COLOR_MAP[key].colors;
    this.props.onApplyColorPresets(presets);
  }

  createFovCellSwitchControls() {
    const {
      imageType,
      hasCellId
    } = this.props;
    return hasCellId && (
      <RadioGroup
        defaultValue={imageType}
        onChange={this.handleSwitchFovCell}
      >
        <Radio.Button
          value={SEGMENTED_CELL}
        >Cell</Radio.Button>
        <Radio.Button
          value={FULL_FIELD_IMAGE}
        >Full Field</Radio.Button>
      </RadioGroup>
    );
  }

  handleSwitchFovCell({target}) {
    this.props.onSwitchFovCell(target.value);
  }

  renderColorPresetsDropdown() {
    const dropDownMenuItems = (
      <Menu onClick={this.makeTurnOnPresetFn}>
        {PRESET_COLOR_MAP.map((preset, index)=> <Menu.Item key={preset.key}>{preset.name}</Menu.Item>)}
      </Menu>
    );
    return (
      <Dropdown
        trigger={['click']}
        overlay={dropDownMenuItems}
      >
        <Button>Color<Icon type="down" /></Button>
      </Dropdown>
    );
  }

  render() {

    return (
      <Card 
        style={STYLES.wrapper} 
        open={this.state.open} 
        bordered={false}
        className="control-panel"
        extra={
          <div>
            {this.createFovCellSwitchControls()}
          </div>}
        title={
            <ViewModeRadioButtons
              imageName={this.props.imageName}
              mode={this.props.mode}
              onViewModeChange={this.props.onViewModeChange}
            />}
        >
        <Card.Meta 
          title={this.renderColorPresetsDropdown()}
        />
        {this.props.hasImage ? <div className="channel-rows-list">
          <ChannelsWidget
            imageName={this.props.imageName}
            channels={this.props.channels}
            channelDataChannels={this.props.channelDataChannels}
            channelGroupedByType={this.props.channelGroupedByType}
            changeChannelSettings={this.props.changeChannelSettings}
            handleChangeToImage={this.props.handleChangeToImage}
            setIsosurfaceEnabled={this.props.setIsosurfaceEnabled}
            updateChannelTransferFunction={this.props.updateChannelTransferFunction}
            changeOneChannelSetting={this.props.changeOneChannelSetting}
            onColorChangeComplete={this.props.onColorChangeComplete}
            channelDataReady={this.props.channelDataReady}
            onApplyColorPresets={this.props.onApplyColorPresets}
            showVolumes={this.props.showVolumes}
            showSurfaces={this.props.showSurfaces}
            style={STYLES.channelsWidget}
          />
          <GlobalVolumeControls
            mode={this.props.mode}
            imageName={this.props.imageName}
            pixelSize={this.props.pixelSize}
            channels={this.props.channels}
            handleChangeUserSelection={this.props.handleChangeUserSelection}
            onAutorotateChange={this.props.onAutorotateChange}
            onUpdateImageDensity={this.props.onUpdateImageDensity}
            onUpdateImageBrightness={this.props.onUpdateImageBrightness}
            onUpdateImageMaskAlpha={this.props.onUpdateImageMaskAlpha}
            onUpdateImageGammaLevels={this.props.onUpdateImageGammaLevels}
            onUpdateImageMaxProjectionMode={this.props.onUpdateImageMaxProjectionMode}
            setImageAxisClip={this.props.setImageAxisClip}
            makeUpdatePixelSizeFn={this.props.makeUpdatePixelSizeFn}
            alphaMaskSliderLevel={this.props.alphaMaskSliderLevel}
            brightnessSliderLevel={this.props.brightnessSliderLevel}
            densitySliderLevel={this.props.densitySliderLevel}
            gammaSliderLevel={this.props.gammaSliderLevel}
            maxProjectOn={this.props.maxProjectOn}
          />
        </div> : null}
      </Card>
    );
  }
}
const STYLES = {
  channelsWidget: {
    padding: 0,
  },
  noImage: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%'
  },
  button: {
    margin: 'auto',
  }
};
