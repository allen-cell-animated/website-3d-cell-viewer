import React from 'react';
import { Radio } from 'antd';

export default class BoxRadioButtonGroup extends React.Component {

  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
  }

  createRadioButton(buttonConfig, id) {
    if (!buttonConfig.label) {
      return null;
    }
    return (
      <Radio.Button key={id} className="clickable" value={buttonConfig.id}>
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

  handleChange({target}) {
    this.props.onChangeButton(target.value);
  }

  reset(props) {
    const defaultOption = props.selectedOption || props.options[0].id;
    this.setState({selectedMode: defaultOption});
  }

  render() {
    const { options, selectedOption } = this.props;
    if (!options || options.length === 0) {
      return null;
    }
    return (
      <Radio.Group onChange={this.handleChange} defaultValue={selectedOption} value={selectedOption}>
        {options.map((view, index) => this.createRadioButton(view, index))}
      </Radio.Group>
    );
  }
}
