import React from "react";
import { Radio } from "antd";

export default class BoxRadioButtonGroup extends React.Component {
  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
    this.state = BoxRadioButtonGroup.getDerivedStateFromProps(props);
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

  handleChange({ target }) {
    this.props.onChangeButton(target.value);
  }

  static getDerivedStateFromProps(props) {
    return { selectedMode: props.selectedOption || props.options[0].id };
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
