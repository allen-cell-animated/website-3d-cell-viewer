import React from 'react';

import viewMode from '../shared/enums/viewMode';
import BoxRadioButtonGroup from './shared/BoxRadioButtonGroup';

const viewModeMapping = viewMode.mainMapping;

export default class ViewModeRadioButtons extends React.Component {
  constructor(props) {
    super(props);
    this.createRadioButton = this.createRadioButton.bind(this);
    this.onChangeButton = this.onChangeButton.bind(this);
  }
  
  onChangeButton(stringMode) {
    let mode = viewMode.STRING_TO_SYMBOL[stringMode];
    if (this.props.selectedMode !== mode) {
      this.props.onViewModeChange(mode);
    }
  }

  createRadioButton(mode) {
    if (!mode || !this.props.imageName) {
      return null;
    }
    return {
      id: mode.toString(),
      label: viewMode.VIEW_MODE_ENUM_TO_LABEL_MAP.get(mode),
    };
  }

  render() {
    if (!this.props.imageName) {
      return null;
    }

    const options = [viewModeMapping.threeD, viewModeMapping.xy, viewModeMapping.xz, viewModeMapping.yz]
      .map(this.createRadioButton);
    return (
      <BoxRadioButtonGroup 
        options={options} 
        selectedOption={this.props.mode.toString()}
        onChangeButton={this.onChangeButton}
      />
    );
  }
}
