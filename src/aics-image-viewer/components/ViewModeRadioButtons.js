import React from 'react';

import { ViewMode } from '../shared/enums/viewModeEnum';
import { 
  VIEW_MODE_ENUM_TO_LABEL_MAP, 
  STRING_TO_SYMBOL,
} from '../shared/enumDisplayMap';

import BoxRadioButtonGroup from './shared/BoxRadioButtonGroup';

export default class ViewModeRadioButtons extends React.Component {
  constructor(props) {
    super(props);
    this.createRadioButton = this.createRadioButton.bind(this);
    this.onChangeButton = this.onChangeButton.bind(this);
    this.state = {
      selectedMode: ViewMode.threeD
    };
  }
  
  onChangeButton(stringMode) {
    let mode = STRING_TO_SYMBOL[stringMode];
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
      label: VIEW_MODE_ENUM_TO_LABEL_MAP.get(mode),
    };
  }

  componentWillReceiveProps(newProps) {
    this.receivingImageForFirstTime = !this.props.image && !!newProps.image;
    const imageExists = !!newProps.image && !!this.props.image;
    this.imageNameIsDifferent = imageExists && newProps.image.name !== this.props.image.name;
    if (this.receivingImageForFirstTime || this.imageNameIsDifferent) {
      this.setState({selectedMode: ViewMode.threeD});
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

    const options = [ViewMode.threeD, ViewMode.xy, ViewMode.xz, ViewMode.yz]
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
