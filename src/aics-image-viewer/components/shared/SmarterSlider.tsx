import React from "react";
import Nouislider, { NouisliderProps } from "nouislider-react";

type CallbackArgs = Parameters<NonNullable<NouisliderProps["onStart"]>>;

const MemoedNouislider = React.memo(
  Nouislider as React.ComponentType<NouisliderProps & { shouldUpdate: boolean }>,
  ({ shouldUpdate }) => shouldUpdate
);

/** A wrapper around `Nouislider` that prevents updates while the slider is being dragged. */
const SmarterSlider: React.FC<NouisliderProps> = (props) => {
  const [shouldUpdate, setShouldUpdate] = React.useState(true);
  const wrapEventHandler = (shouldUpdate: boolean, handler?: (...args: CallbackArgs) => void) => {
    return (...args: CallbackArgs) => {
      setShouldUpdate(shouldUpdate);
      if (handler) handler(...args);
    };
  };

  const onStart = wrapEventHandler(false, props.onStart);
  const onEnd = wrapEventHandler(true, props.onEnd);
  return <MemoedNouislider {...{ ...props, shouldUpdate, onStart, onEnd }} />;
};

export default SmarterSlider;
