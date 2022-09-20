import React from "react";
import Nouislider, { NouisliderProps } from "nouislider-react";

type CallbackArgs = [values: any[], handle: number, unencodedValues: number[], tap: boolean, positions: number[]];

/** A wrapper around `Nouislider` that prevents updates while the slider is being dragged. */
export default class SliderWrapper extends React.Component<NouisliderProps, { inactive: boolean }> {
  constructor(props: NouisliderProps) {
    super(props);
    this.state = { inactive: true };
  }

  shouldComponentUpdate = () => this.state.inactive;

  wrapEventHandler =
    (handler: ((...args: CallbackArgs) => void) | undefined, inactive: boolean) =>
    (...args: CallbackArgs) => {
      this.setState({ inactive });
      if (handler) {
        handler(...args);
      }
    };

  render() {
    const onStart = this.wrapEventHandler(this.props.onStart, false);
    const onEnd = this.wrapEventHandler(this.props.onEnd, true);
    return <Nouislider {...{ ...this.props, onStart, onEnd }} />;
  }
}
