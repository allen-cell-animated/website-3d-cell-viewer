import React from "react";
import Nouislider, { NouisliderProps } from "nouislider-react";

type CallbackArgs = [values: any[], handle: number, unencodedValues: number[], tap: boolean, positions: number[]];

/** A wrapper around `Nouislider` that prevents updates while the slider is being dragged. */
export default class SmarterSlider extends React.Component<NouisliderProps, { inactive: boolean }> {
  constructor(props: NouisliderProps) {
    super(props);
    this.state = { inactive: true };
  }

  shouldComponentUpdate = () => this.state.inactive;

  wrapEventHandler(inactive: boolean, handler?: (...args: CallbackArgs) => void) {
    return (...args: CallbackArgs) => {
      this.setState({ inactive });
      if (handler) {
        handler(...args);
      }
    };
  }

  render() {
    const onStart = this.wrapEventHandler(false, this.props.onStart);
    const onEnd = this.wrapEventHandler(true, this.props.onEnd);
    return <Nouislider {...{ ...this.props, onStart, onEnd }} />;
  }
}
