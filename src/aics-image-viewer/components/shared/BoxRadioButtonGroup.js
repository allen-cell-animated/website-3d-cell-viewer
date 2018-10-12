import React from 'react';
import muiThemeable from 'material-ui/styles/muiThemeable';

class BoxRadioButtonGroup extends React.Component {

  constructor(props) {
    super(props);
    this.createRadioButtonGroup = this.createRadioButtonGroup.bind(this);
    this.getButtonStyle = this.getButtonStyle.bind(this);
  }

  getButtonStyle(index, checked) {
    const { buttonStyles } = this.props;
    return {
      backgroundColor: checked ? this.props.muiTheme.palette.primary1Color : this.props.muiTheme.palette.accent2Color,
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
    if (!buttonConfig.label || !buttonConfig.onClick) {
      return null;
    }
    const style = this.getButtonStyle(id, buttonConfig.id === this.state.selectedMode);
    const onClick = () => {
      this.setState({selectedMode: buttonConfig.id});
      buttonConfig.onClick();
    };
    return (
      <div style={style} className="clickable" onClick={onClick} key={buttonConfig.id}>
        {buttonConfig.label}
      </div>
    );
  }

  componentWillReceiveProps(nextProps) {
    this.reset(nextProps);
  }

  componentWillMount() {
    this.reset(this.props);
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
    if (!this.props.options || this.props.options.length === 0) {
      return null;
    }

    const { groupStyles } = this.props;
    return (
      <div style={{
        border: `2px solid ${this.props.muiTheme.palette.primary1Color}`,
        display: 'flex',
        height: '2em',
        borderRadius: 3,
        flex: 2,
        margin: 'auto',
        backgroundColor: this.props.muiTheme.palette.canvasColor,
        color: this.props.muiTheme.palette.textColor,
        ...groupStyles
      }}>
        {this.createRadioButtonGroup()}
      </div>
    );
  }
}
export default muiThemeable()(BoxRadioButtonGroup);
