import React from "react";
import { SketchPicker } from "react-color";
import { map } from "lodash";

import { ColorObject } from "../shared/utils/colorRepresentations";
import { Styles } from "../shared/types";

// if there are fewer than this many screen pixels below the swatch but more above, open above the swatch
const OPEN_ABOVE_MARGIN = 310;

type ColorChangeHandler = (currentColor: ColorObject, prevColor?: ColorObject, idx?: number) => void;

interface ColorPickerProps {
  color: ColorObject;
  width: number;
  onColorChange?: ColorChangeHandler;
  onColorChangeComplete?: ColorChangeHandler;
  idx?: any;
  disableAlpha?: boolean;
}

interface ColorPickerState {
  color: ColorObject;
  displayColorPicker: boolean;
  openAboveSwatch: boolean;
}

export default class ColorPicker extends React.Component<ColorPickerProps, ColorPickerState> {
  private swatchRef: React.RefObject<HTMLDivElement>;

  constructor(props: ColorPickerProps) {
    super(props);

    this.handleClick = this.handleClick.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleChangeComplete = this.handleChangeComplete.bind(this);

    this.swatchRef = React.createRef();

    const defaultColor = {
      r: "241",
      g: "112",
      b: "19",
      a: "1",
    };
    const color = props.color || defaultColor;
    this.state = {
      displayColorPicker: false,
      openAboveSwatch: false,
      color,
    };
  }

  handleClick() {
    const swatchRect = this.swatchRef.current!.getBoundingClientRect();
    const noRoomBelowSwatch = swatchRect.bottom > window.innerHeight - OPEN_ABOVE_MARGIN;
    this.setState({
      displayColorPicker: !this.state.displayColorPicker,
      openAboveSwatch: noRoomBelowSwatch && swatchRect.top > OPEN_ABOVE_MARGIN,
    });
  }

  handleClose() {
    this.setState({ displayColorPicker: false });
  }

  handleChange(color) {
    this.setState({ color: color.rgb });
    // supply onColorChange callback in props.
    if (this.props.onColorChange) {
      this.props.onColorChange(color.rgb, this.state.color, this.props.idx);
    }
  }

  handleChangeComplete(color) {
    this.setState({ color: color.rgb });
    // supply onColorChange callback in props.
    if (this.props.onColorChangeComplete) {
      this.props.onColorChangeComplete(color.rgb, this.state.color, this.props.idx);
    }
  }

  static getDerivedStateFromProps(props, state) {
    if (props.color && props.color !== state.color) {
      return { color: props.color };
    }
    return null;
  }

  render() {
    const width = this.props.width || 36;
    const popoverDirectionStyle = this.state.openAboveSwatch ? { bottom: "25px" } : { top: "1px" };

    return (
      <div>
        <div style={STYLES.swatch} ref={this.swatchRef} onClick={this.handleClick}>
          <div
            style={{ ...STYLES.color, width: `${width}px`, background: `rgba(${map(this.state.color, (ele) => ele)})` }}
          />
        </div>
        <div style={{ position: "absolute" }}>
          {this.state.displayColorPicker ? (
            <div style={{ ...STYLES.popover, ...popoverDirectionStyle }}>
              <div style={STYLES.cover} onClick={this.handleClose} />
              <SketchPicker
                color={this.state.color}
                onChange={this.handleChange}
                onChangeComplete={this.handleChangeComplete}
                disableAlpha={this.props.disableAlpha}
              />
            </div>
          ) : null}
        </div>
      </div>
    );
  }
}

const STYLES: Styles = {
  color: {
    height: "14px",
    borderRadius: "2px",
  },
  swatch: {
    padding: "5px",
    borderRadius: "1px",
    boxShadow: "0 0 0 1px rgba(0,0,0,.1)",
    display: "inline-block",
    cursor: "pointer",
    verticalAlign: "middle",
  },
  popover: {
    position: "absolute",
    zIndex: "9999",
  },
  cover: {
    position: "fixed",
    top: "0px",
    right: "0px",
    bottom: "0px",
    left: "0px",
  },
};
