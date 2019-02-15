import React from 'react';

import { 
  Card,
  Button,
  Dropdown,
  Radio,
  Icon,
  Menu,
  Switch
} from 'antd';

import ViewModeRadioButtons from "../ViewModeRadioButtons";
import ChannelsWidget from "../ChannelsWidget";
import GlobalVolumeControls from "../GlobalVolumeControls";

import { PRESET_COLORS_1, PRESET_COLORS_2, PRESET_COLORS_3 } from '../../shared/constants';

import './styles.scss';

const RadioGroup = Radio.Group;

export default class ControlPanel extends React.Component {
  constructor(props) {
    super(props);
    this.handleToggle = this.handleToggle.bind(this);
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
      isShowingSegmentedCell,
      hasCellId
    } = this.props;
    return hasCellId && (
      <RadioGroup
        defaultValue={isShowingSegmentedCell ? 'Cell' : "Field"}
        onChange={this.handleSwitchFovCell}
      >
        <Radio.Button
          value="Cell"
        >Cell</Radio.Button>
        <Radio.Button
          value="Field"
        >Full Field</Radio.Button>
      </RadioGroup>
    );
  }

  handleSwitchFovCell(event, checked) {
    this.props.onSwitchFovCell();
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
        bordered={false}
        className="control-panel"
        extra={
          <div>
            <Dropdown
                overlay={dropDownMenuItems}
              >
              <Button>Color  <Icon type="down" /></Button>
            </Dropdown>
            {this.createFovCellSwitchControls()}
          </div>}
        title={
            <ViewModeRadioButtons
              image={this.props.image}
              mode={this.props.mode}
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
          <GlobalVolumeControls
            mode={this.props.mode}
            imageName={this.props.image.name}
            pixelSize={this.props.image.pixel_size}
            channels={this.props.channels}
            onAutorotateChange={this.props.onAutorotateChange}
            onUpdateImageDensity={this.props.onUpdateImageDensity}
            onUpdateImageBrightness={this.props.onUpdateImageBrightness}
            onUpdateImageMaskAlpha={this.props.onUpdateImageMaskAlpha}
            onUpdateImageGammaLevels={this.props.onUpdateImageGammaLevels}
            onUpdateImageMaxProjectionMode={this.props.onUpdateImageMaxProjectionMode}
            setImageAxisClip={this.props.setImageAxisClip}
            makeUpdatePixelSizeFn={this.props.makeUpdatePixelSizeFn}
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
