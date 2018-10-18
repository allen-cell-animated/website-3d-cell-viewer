import React from 'react';
import { Card, CardText, Toolbar, FlatButton, IconMenu, IconButton, MenuItem} from 'material-ui';

import ViewModeRadioButtons from "../ViewModeRadioButtons";
import ChannelsWidget from "../ChannelsWidget";
import View3dControls from "../View3dControls";

import { PRESET_COLORS_1, PRESET_COLORS_2, PRESET_COLORS_3 } from '../../shared/constants';

import './styles.scss';

export default class ViewerControlPanel extends React.Component {
  constructor(props) {
    super(props);
    this.handleToggle = this.handleToggle.bind(this);
    this.handleAutorotateCheck = this.handleAutorotateCheck.bind(this);
    this.makeTurnOnPresetFn = this.makeTurnOnPresetFn.bind(this);
    this.state = {open: true};
    this.presetMap = new Map();
    this.presetMap.set(1, PRESET_COLORS_1);
    this.presetMap.set(2, PRESET_COLORS_2);
    this.presetMap.set(3, PRESET_COLORS_3);
  }

  handleToggle() {
    this.setState({open: !this.state.open});
  }

  makeTurnOnPresetFn(preset) {
    return () => {
      if (this.presetMap.has(preset)) {
        const presets = this.presetMap.get(preset);

        this.props.onApplyColorPresets(presets);
      }
    };
  }

  createAutorotateControls() {
    const {
      autorotate
    } = this.props;
    const buttonType = autorotate ? "pause_circle_outline" : "play_circle_outline";
    return (
      <FlatButton onClick={this.handleAutorotateCheck} style={STYLES.button}>
        <i className="mdc-fab__icon material-icons" style={{ verticalAlign: 'middle' }}>{buttonType}</i> Turntable
      </FlatButton>
    );
  }

  handleAutorotateCheck(event, checked) {
    this.props.onAutorotateChange();
  }

  render() {
    return (

      <Card style={STYLES.wrapper} open={this.state.open} className="control-panel">
        <Toolbar style={STYLES.toolbar}>
          <ViewModeRadioButtons 
            image={this.props.image}
            onViewModeChange={this.props.onViewModeChange}
          />
          {this.createAutorotateControls()}
          <IconMenu className="float-right"
            style={STYLES.button}
            iconButtonElement={<IconButton><i className="material-icons">color_lens</i></IconButton>}
            anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
            targetOrigin={{ horizontal: 'right', vertical: 'top' }}>
            <MenuItem primaryText="Color preset 1" onClick={this.makeTurnOnPresetFn(1)} />
            <MenuItem primaryText="Color preset 2" onClick={this.makeTurnOnPresetFn(2)} />
            <MenuItem primaryText="Color preset 3" onClick={this.makeTurnOnPresetFn(3)} />
          </IconMenu>
        </Toolbar>
        {this.props.image ? <CardText>
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
        </CardText> : null}
      </Card>
    );
  }
}
const STYLES = {
  wrapper: {
    height: '100%',
    boxShadow: 'none',
    borderRadius: 0,
    backgroundColor: 'none'
  },
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
  toolbar: {
    backgroundColor: 'none',
    borderBottom: '0.5px solid gray'
  },
  button: {
    margin: 'auto',
  }
};
