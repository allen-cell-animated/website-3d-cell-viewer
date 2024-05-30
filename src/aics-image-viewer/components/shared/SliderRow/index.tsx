import React from "react";
import { NouisliderProps } from "nouislider-react";
import SmarterSlider from "../SmarterSlider";

import "./styles.css";

type SliderRowProps = {
  label: React.ReactNode;
  start?: number | number[];
  max?: number;
  onUpdate?: NouisliderProps["onUpdate"];
  hideSlider?: boolean;
};

/** A component to ensure a single unified style across the many labeled slider rows in the control panel */
const SliderRow: React.FC<SliderRowProps> = (props) => (
  <div className="viewer-control-row">
    <div className="control-name">{props.label}</div>
    <div className={props.children !== undefined ? "control" : "control control-slider"}>
      {props.start === undefined ? (
        props.children
      ) : (
        <SmarterSlider
          range={{ min: 0, max: props.max }}
          start={props.start}
          connect={true}
          tooltips={true}
          behaviour="drag"
          onUpdate={props.onUpdate}
          style={{ display: props.hideSlider ? "none" : "block" }}
        />
      )}
    </div>
  </div>
);

export default SliderRow;
