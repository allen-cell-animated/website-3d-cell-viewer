import React from "react";
import { Radio } from "antd";

import { ViewMode } from "../../shared/enums";
// Hack to allow iterating over const enum
const viewModes = [ViewMode.threeD, ViewMode.xy, ViewMode.xz, ViewMode.yz];

export default function ViewModeRadioButtons(props: { mode: ViewMode; onViewModeChange: (newMode: ViewMode) => void }) {
  const onChangeButton = ({ target }) => {
    if (props.mode !== target.value) {
      props.onViewModeChange(target.value);
    }
  };

  return (
    <Radio.Group onChange={onChangeButton} value={props.mode.toString()}>
      {viewModes.map((mode, index) => (
        <Radio.Button key={index} value={mode.toString()}>
          {mode}
        </Radio.Button>
      ))}
    </Radio.Group>
  );
}
