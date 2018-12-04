import React from 'react';

import { 
  Card,
  Button,
  Dropdown,
  Menu,
} from 'antd';

import ViewModeRadioButtons from "../ViewModeRadioButtons";
import ChannelsWidget from "../ChannelsWidget";
import View3dControls from "../View3dControls";

import { PRESET_COLORS_1, PRESET_COLORS_2, PRESET_COLORS_3 } from '../../shared/constants';

import './styles.scss';

export default class ControlPanel extends React.Component {
  constructor(props) {
    super(props);
    this.handleToggle = this.handleToggle.bind(this);
    this.handleAutorotateCheck = this.handleAutorotateCheck.bind(this);
    this.makeTurnOnPresetFn = this.makeTurnOnPresetFn.bind(this);
    this.handleSwitchFovCell = this.handleSwitchFovCell.bind(this);
    this.state = {open: true};
    this.presetMap = new Map();
    this.presetMap.set(1, PRESET_COLORS_1);
    this.presetMap.set(2, PRESET_COLORS_2);
    this.presetMap.set(3, PRESET_COLORS_3);
  }

  handleToggle() {
    this.setState({open: !this.state.open});
  }

  makeTurnOnPresetFn({ key }) {
    const presets = this.presetMap.get(Number(key));
    this.props.onApplyColorPresets(presets);
  }

  createFovCellSwitchControls() {
    const {
      hasCell,
      hasCellId
    } = this.props;
    const buttonType = hasCell ? "pause-circle" : "play-circle";
    const buttonLabel = hasCell ? "Cell" : "Field";
    return hasCellId ? (
      <Button 
        icon={buttonType} 
        onClick={this.handleSwitchFovCell} 
      >
        {buttonLabel}
      </Button>

    ) : null;
  }

  handleSwitchFovCell(event, checked) {
    this.props.onSwitchFovCell();
  }

  createAutorotateControls() {
    const {
      autorotate
    } = this.props;
    const buttonType = autorotate ? "pause-circle" : "play-circle";
    return (
      <Button 
        icon={buttonType} 
        onClick={this.handleAutorotateCheck} 
      >
        Turntable
      </Button>

    );
  }

  handleAutorotateCheck(event, checked) {
    this.props.onAutorotateChange();
  }

  render() {
    const dropDownMenuItems = (
      <Menu onClick={this.makeTurnOnPresetFn}>
        {Array.from(this.presetMap.keys()).map(key => <Menu.Item key={key}>Color preset {key}</Menu.Item>)}
      </Menu>
    );
    return (
      <Card 
        style={STYLES.wrapper} 
        open={this.state.open} 
        className="control-panel"
        extra={
          <div>
            {this.createFovCellSwitchControls()}
            {this.createAutorotateControls()}
            <Dropdown
                overlay={dropDownMenuItems}
              >
              <Button shape="circle" icon="bg-colors" />
            </Dropdown>
          </div>}
        title={
            <ViewModeRadioButtons
              image={this.props.image}
              onViewModeChange={this.props.onViewModeChange}
            />}
        >
        {this.props.image ? <div>
          <ChannelsWidget
            image={this.props.image}
            channels={this.props.channels}
            channelGroupedByType={this.props.channelGroupedByType}
            setChannelEnabled={this.props.setChannelEnabled}
            setVolumeEnabled={this.props.setVolumeEnabled}
            setIsosurfaceEnabled={this.props.setIsosurfaceEnabled}
            updateChannelTransferFunction={this.props.updateChannelTransferFunction}
            updateIsovalue={this.props.updateIsovalue}
            updateIsosurfaceOpacity={this.props.updateIsosurfaceOpacity}
            onColorChange={this.props.onColorChange}
            onColorChangeComplete={this.props.onColorChangeComplete}
            channelDataReady={this.props.channelDataReady}
            onApplyColorPresets={this.props.onApplyColorPresets}
            showVolumes={this.props.showVolumes}
            showSurfaces={this.props.showSurfaces}
            style={STYLES.channelsWidget}
          />
          <View3dControls
            image={this.props.image}
            mode={this.props.mode}
            channels={this.props.channels}
            onAutorotateChange={this.props.onAutorotateChange}
            onUpdateImageDensity={this.props.onUpdateImageDensity}
            onUpdateImageBrightness={this.props.onUpdateImageBrightness}
            onUpdateImageMaskAlpha={this.props.onUpdateImageMaskAlpha}
            onUpdateImageGammaLevels={this.props.onUpdateImageGammaLevels}
            onUpdateImageMaxProjectionMode={this.props.onUpdateImageMaxProjectionMode}
            setImageAxisClip={this.props.setImageAxisClip}
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
