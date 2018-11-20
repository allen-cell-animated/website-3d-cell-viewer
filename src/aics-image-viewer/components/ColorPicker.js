import React from 'react';
import reactCSS from 'reactcss';
import { SketchPicker } from 'react-color';
import { map } from 'lodash';

class ColorPicker extends React.Component {

  constructor(props) {
    super(props);

    this.handleClick = this.handleClick.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleChangeComplete = this.handleChangeComplete.bind(this);

    let defaultColor = {
      r: '241',
      g: '112',
      b: '19',
      a: '1'
    };
    const newColor = props.color || [defaultColor.r, defaultColor.g, defaultColor.b];
    let color = { r: newColor[0], g: newColor[1], b:newColor[2], a: '1' };
    this.state = {
      displayColorPicker: false,
      color: color
    };
  }

  handleClick() {
    this.setState({ displayColorPicker: !this.state.displayColorPicker });
  };

  handleClose() {
    this.setState({ displayColorPicker: false });
  };

  handleChange(color) {
    this.setState({ color: color.rgb });
    // supply onColorChange callback in props.
    if (this.props.onColorChange) {
      this.props.onColorChange(color.rgb, this.state.color, this.props.idx);
    }
  };

  handleChangeComplete(color) {
    this.setState({ color: color.rgb });
    // supply onColorChange callback in props.
    if (this.props.onColorChangeComplete) {
      this.props.onColorChangeComplete(color.rgb, this.state.color, this.props.idx);
    }
  };

  componentDidMount() {
    this.props.onColorChange(this.state.color, this.state.color, this.props.idx);
  }

  componentWillReceiveProps(newProps) {
    if (newProps.color && newProps.color !== this.state.color) {
      this.setState({color: {r:newProps.color[0], g:newProps.color[1], b:newProps.color[2], a:newProps.color[3]} });
    }
  }

  render() {
    const width = this.props.width || 36;
    const styles = reactCSS({
      'default': {
        color: {
          width: `${width}px`,
          height: '14px',
          borderRadius: '2px',
          background: `rgba(${ map(this.state.color, ele => (ele))})`
        },
        swatch: {
          padding: '5px',
          borderRadius: '1px',
          boxShadow: '0 0 0 1px rgba(0,0,0,.1)',
          display: 'inline-block',
          cursor: 'pointer'
        },
        popover: {
          position: 'absolute',
          zIndex: '9999',
        },
        cover: {
          position: 'fixed',
          top: '0px',
          right: '0px',
          bottom: '0px',
          left: '0px'
        }
      }
    });

    return (
      <div>
        <div style={ styles.swatch } onClick={ this.handleClick }>
          <div style={ styles.color } />
        </div>
        { this.state.displayColorPicker ? <div style={ styles.popover }>
          <div style={ styles.cover } onClick={ this.handleClose }/>
          <SketchPicker color={ this.state.color } onChange={ this.handleChange } onChangeComplete={ this.handleChangeComplete }/>
        </div> : null }

      </div>
    );
  }
}

export default ColorPicker;
