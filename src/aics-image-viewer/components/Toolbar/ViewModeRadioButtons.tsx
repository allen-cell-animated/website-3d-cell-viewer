import React from "react";
import { Radio } from "antd";

import viewMode from "../../shared/enums/viewMode";
const viewModeMapping = viewMode.mainMapping;

export default function ViewModeRadioButtons(props: { mode: symbol; onViewModeChange(newMode: symbol): void }) {
  const onChangeButton = ({ target }) => {
    let mode = viewMode.STRING_TO_SYMBOL[target.value];
    if (props.mode !== mode) {
      props.onViewModeChange(mode);
    }
  };

  return (
    <Radio.Group onChange={onChangeButton} value={props.mode.toString()}>
      {Object.values(viewModeMapping).map((mode, index) => (
        <Radio.Button key={index} value={mode.toString()}>
          {viewMode.VIEW_MODE_ENUM_TO_LABEL_MAP.get(mode)}
        </Radio.Button>
      ))}
    </Radio.Group>
  );
}
