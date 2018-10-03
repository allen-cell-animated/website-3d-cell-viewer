import React from 'react';
import { IconButton } from 'material-ui';

import BoxRadioButtonGroup from './shared/BoxRadioButtonGroup';
import { ThicknessUnit } from '../shared/enums/thicknessUnit';

export default class TwoDPlayButtons extends React.Component {
  constructor(props) {
    super(props);
    this.setWidth = this.setWidth.bind(this);
  }

  setWidth(event) {
    this.props.setWidth(event.target.valueAsNumber);
  }

  render() {
    const options = [
      {
        id: ThicknessUnit.percent.toString(),
        label: 'Percent',
        onClick: () => {this.props.setUnit(ThicknessUnit.percent);}
      },
      {
        id: ThicknessUnit.slice.toString(),
        label: 'Slice(s)',
        onClick: () => {this.props.setUnit(ThicknessUnit.slice);}
      }
    ];

    const onClick = this.props.showPlay ? this.props.play : this.props.pause;
    const icon = this.props.showPlay ? 'play_arrow' : 'pause';
    const playButton = <IconButton iconStyle={STYLES.icon} onClick={onClick}>
      <i className="material-icons">{icon}</i>
    </IconButton>;

    return (
      <div style={STYLES.wrapper}>
        <div style={STYLES.rangeContainer}>
          {this.props.min}, {this.props.max}
        </div>
        <div>
          <input type="number" style={STYLES.numberInput} value={this.props.width} onChange={this.setWidth}/>
        </div>
        <div>
          <BoxRadioButtonGroup options={options} groupStyles={STYLES.buttonGroup} buttonStyles={STYLES.buttonGroupButton} selectedOption={this.props.unit}/>
        </div>
        <div style={STYLES.playButtons}>
          <IconButton iconStyle={STYLES.icon} onClick={this.props.goBack}>
            <i className="material-icons">skip_previous</i>
          </IconButton>
          {playButton}
          <IconButton  iconStyle={STYLES.icon} onClick={this.props.stop}>
            <i className="material-icons">stop</i>
          </IconButton>
          <IconButton  iconStyle={STYLES.icon} onClick={this.props.goForward}>
            <i className="material-icons">skip_next</i>
          </IconButton>
        </div>
      </div>
    );
  }
}

const STYLES = {
  numberInput: {
    width: 50,
    textAlign: 'center',
    marginTop: '0.5em',
    border: 'none',
    borderRadius: 3,
    marginRight: 10
  },
  playButtons: {
    flex: '1 0 150px'
  },
  buttonGroup: {
    marginTop: '0.5em',
    height: 'initial'
  },
  buttonGroupButton: {
    height: '1.5em',
    paddingLeft: 10,
    paddingRight: 10
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
