import React from 'react';
import muiThemeable from 'material-ui/styles/muiThemeable';
import { Radio } from 'antd';

class BoxRadioButtonGroup extends React.Component {

  constructor(props) {
    super(props);
    this.createRadioButtonGroup = this.createRadioButtonGroup.bind(this);
    this.getButtonStyle = this.getButtonStyle.bind(this);
    this.handleChange = this.handleChange.bind(this);
  }

  getButtonStyle(index, checked) {
    const { buttonStyles } = this.props;
    return {
      backgroundColor: checked ? this.props.muiTheme.palette.primary1Color : 'transparent',
      color: checked ? this.props.muiTheme.palette.alternateTextColor : this.props.muiTheme.palette.textColor,
      borderLeft: index === 0 ? 0 : `2px solid ${this.props.muiTheme.palette.primary1Color}`,
      flex: 1,
      textAlign: 'center',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      ...buttonStyles
    };
  }

  createRadioButton(buttonConfig, id, buttonStyles) {
    if (!buttonConfig.label) {
      return null;
    }
    return (
      <Radio.Button className="clickable" value={buttonConfig.id}>
        {buttonConfig.label}
      </Radio.Button>
    );
  }

  componentWillReceiveProps(nextProps) {
    this.reset(nextProps);
  }

  componentWillMount() {
    this.reset(this.props);
  }

  handleChange({target}){
    
    this.props.onChangeButton(target.value)
  }

  reset(props) {
    const defaultOption = props.selectedOption || props.options[0].id;
    this.setState({selectedMode: defaultOption});
  }

  createRadioButtonGroup() {
    const { options } = this.props;
    return options.map((view, index) => this.createRadioButton(view, index));
  }

  render() {
    const { options, selectedOption } = this.props;
    if (!options || options.length === 0) {
      return null;
    }
    return (
      <Radio.Group onChange={this.handleChange} defaultValue={selectedOption}>
        {this.createRadioButtonGroup()}
      </Radio.Group>
    );
  }
}
export default muiThemeable()(BoxRadioButtonGroup);
