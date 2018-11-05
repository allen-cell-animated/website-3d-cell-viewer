import React from 'react';

import viewMode from '../shared/enums/viewMode';
import BoxRadioButtonGroup from './shared/BoxRadioButtonGroup';

const viewModeMapping = viewMode.mainMapping;

export default class ViewModeRadioButtons extends React.Component {
  constructor(props) {
    super(props);
    this.createRadioButton = this.createRadioButton.bind(this);
    this.onChangeButton = this.onChangeButton.bind(this);
    this.state = {
      selectedMode: viewModeMapping.threeD
    };
  }
  
  onChangeButton(stringMode) {
    let mode = viewMode.STRING_TO_SYMBOL[stringMode];
    if (this.state.selectedMode !== mode) {
      this.setState({selectedMode: mode});
      this.props.onViewModeChange(mode);
    }
  };

  createRadioButton(mode) {
    if (!mode || !this.props.image) {
      return null;
    }
    return {
      id: mode.toString(),
      label: viewMode.VIEW_MODE_ENUM_TO_LABEL_MAP.get(mode),
    };
  }

  componentWillReceiveProps(newProps) {
    this.receivingImageForFirstTime = !this.props.image && !!newProps.image;
    const imageExists = !!newProps.image && !!this.props.image;
    this.imageNameIsDifferent = imageExists && newProps.image.name !== this.props.image.name;
    if (this.receivingImageForFirstTime || this.imageNameIsDifferent) {
      this.setState({ selectedMode: viewModeMapping.threeD});
    }
  }

  shouldComponentUpdate(newProps, newState) {
    const modeChanged = this.state.selectedMode !== newState.selectedMode;
    return this.receivingImageForFirstTime || this.imageNameIsDifferent || modeChanged;
  }

  render() {
    if (!this.props.image) {
      return null;
    }

    const options = [viewModeMapping.threeD, viewModeMapping.xy, viewModeMapping.xz, viewModeMapping.yz]
      .map(this.createRadioButton);
    return (
      <BoxRadioButtonGroup 
        options={options} 
        selectedOption={this.state.selectedMode.toString()}
        onChangeButton={this.onChangeButton}
        />
    );
  }
}
