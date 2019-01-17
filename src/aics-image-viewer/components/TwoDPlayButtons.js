import React from 'react';
import { 
  Button, 
  Input } from 'antd';

import BoxRadioButtonGroup from './shared/BoxRadioButtonGroup';
import thicknessUnit from '../shared/enums/thicknessUnit';

const ThicknessUnit = thicknessUnit.mainMapping;

export default class TwoDPlayButtons extends React.Component {
  constructor(props) {
    super(props);
    this.setWidth = this.setWidth.bind(this);
    this.handleButtonGroupChange = this.handleButtonGroupChange.bind(this);
  }

  setWidth(event) {
    this.props.setWidth(event.target.valueAsNumber);
  }

  handleButtonGroupChange(stringMode) {
    let mode = thicknessUnit.STRING_TO_SYMBOL[stringMode];
    this.props.setUnit(mode);
  }

  render() {
    const options = [
      {
        id: ThicknessUnit.percent.toString(),
        label: 'Percent',
      },
      {
        id: ThicknessUnit.slice.toString(),
        label: 'Slice(s)',
      }
    ];

    const onClick = this.props.showPlay ? this.props.play : this.props.pause;
    const icon = this.props.showPlay ? 'caret-right' : 'pause';
    const playButton = <Button type="primary" onClick={onClick} icon={icon} />;

    return (
      <div style={STYLES.wrapper}>
        <div style={STYLES.rangeContainer}>
          {this.props.min}, {this.props.max}
        </div>
        <div style={STYLES.input}>
          <Input type="number" value={this.props.width} onChange={this.setWidth}/>
        </div>
        <div>
          <BoxRadioButtonGroup 
            options={options} 
            selectedOption={this.props.unit}
            onChangeButton={this.handleButtonGroupChange}
            />
        </div>
        <Button.Group style={STYLES.playButtons}>
    

          <Button type="primary" shape="circle" icon="step-backward" onClick={this.props.goBack} />
          {playButton}

          <Button type="primary" shape="circle" icon="step-forward" onClick={this.props.goForward}/>
        </Button.Group>
      </div>
    );
  }
}

const STYLES = {
  playButtons: {
    flex: '1 0 150px'
  },
  input: {
    flex: 1,
  },
  rangeContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: '1em',
    flexBasis: 150
  },
  wrapper: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center'
  },
  icon: {
    color: 'white'
  }
};
