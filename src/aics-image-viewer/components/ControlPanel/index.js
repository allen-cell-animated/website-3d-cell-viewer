import React from 'react';
import {Card, CardText} from 'material-ui';

import ViewModeRadioButtons from "../ViewModeRadioButtons";
import ChannelsWidget from "../ChannelsWidget";
import View3dControls from "../View3dControls";

import './styles.scss';

export default class ViewerControlPanel extends React.Component {
  constructor(props) {
    super(props);
    this.handleToggle = this.handleToggle.bind(this);
    this.state = {open: true};
  }

  handleToggle() {
    this.setState({open: !this.state.open});
  }

  render() {
    return (

      <Card style={STYLES.wrapper} open={this.state.open} className="control-panel">

        {this.props.image ? <CardText>
          <ViewModeRadioButtons 
            image={this.props.image}
            onViewModeChange={this.props.onViewModeChange}
          />
          <ChannelsWidget
            image={this.props.image}
            channels={this.props.channels}
            imageChannelNames={this.props.imageChannelNames}
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
            showChannels={this.props.showChannels}
          />
          <View3dControls
            image={this.props.image}
            imageChannelNames={this.props.imageChannelNames}
            mode={this.props.mode}
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
  noImage: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%'
  }
};
