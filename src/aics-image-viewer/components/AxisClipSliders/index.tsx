import React, { useCallback, useEffect, useState } from "react";
import { Button, Tooltip } from "antd";

import NumericInput from "../shared/NumericInput";
import SmarterSlider from "../shared/SmarterSlider";

import "./styles.css";

import { ViewMode } from "../../shared/enums";
import { ViewerSettingUpdater } from "../App/types";
import { AxisName, PerAxis, activeAxisMap } from "../../shared/types";
import PlayControls from "../../shared/utils/PlayControls";

const AXES: AxisName[] = ["x", "y", "z"];

type SliderRowProps = {
  label: string;
  vals: number[];
  valsReadout?: number[];
  max: number;
  onSlide?: (values: number[]) => void;
  onChange?: (values: number[]) => void;
  onStart?: () => void;
  onEnd?: () => void;
};

const SliderRow: React.FC<SliderRowProps> = ({
  label,
  vals,
  valsReadout = vals,
  max,
  onSlide,
  onChange = onSlide,
  onStart,
  onEnd,
}) => {
  const isRange = vals.length > 1;

  return (
    <span className="axis-slider-container">
      <span className="slider-name">{label}</span>
      <span className="axis-slider">
        <SmarterSlider
          className={isRange ? "" : "slider-single-handle"}
          connect={true}
          range={{ min: 0, max }}
          start={vals}
          step={1}
          margin={1}
          behaviour="drag"
          pips={{
            mode: "positions",
            values: [25, 50, 75],
            density: 25,
            format: {
              // remove labels from pips
              to: () => "",
            },
          }}
          // round slider output to nearest slice; assume any string inputs represent ints
          format={{ to: Math.round, from: parseInt }}
          onSlide={onSlide}
          onChange={onChange}
          onStart={onStart}
          onEnd={onEnd}
        />
      </span>
      <span className="slider-values">
        <NumericInput
          max={max}
          value={valsReadout[0]}
          onChange={(value) => onChange?.(isRange ? [value, vals[1]] : [value])}
        />
        {isRange && (
          <>
            {" , "}
            <NumericInput max={max} value={valsReadout[1]} onChange={(value) => onChange?.([vals[0], value])} />
          </>
        )}
        {" / "}
        {max}
      </span>
    </span>
  );
};

type PlaySliderRowProps = {
  label: string;
  val: number;
  max: number;
  playing: boolean;
  entireAxisLoaded?: boolean;
  onPlayPause: (play: boolean) => void;
  onChange?: (values: number) => void;
  onStart?: () => void;
  onEnd?: () => void;
};

const PlaySliderRow: React.FC<PlaySliderRowProps> = (props) => {
  const [valReadout, setValReadout] = useState(props.val);

  const wrappedOnChange = useCallback(([val]: number[]) => props.onChange?.(val), [props.onChange]);
  const wrappedSetValReadout = useCallback(([val]: number[]) => setValReadout(val), []);
  return (
    <>
      <SliderRow
        label={props.label}
        vals={[props.val]}
        valsReadout={props.entireAxisLoaded ? [valReadout] : undefined}
        max={props.max}
        onSlide={props.entireAxisLoaded ? wrappedOnChange : wrappedSetValReadout}
        onChange={props.entireAxisLoaded ? undefined : wrappedOnChange}
        onStart={props.onStart}
        onEnd={props.onEnd}
      />
      <Tooltip placement="top" title="Play through sequence">
        <Button
          className="slider-play-button"
          onClick={() => props.onPlayPause(!props.playing)}
          icon={props.playing ? "pause" : "caret-right"}
        />
      </Tooltip>
    </>
  );
};

type AxisClipSlidersProps = {
  mode: ViewMode;
  changeViewerSetting: ViewerSettingUpdater;
  numSlices: PerAxis<number>;
  region: PerAxis<[number, number]>;
  slices: PerAxis<number>;
  numTimesteps: number;
  time: number;
  playingAxis: AxisName | "t" | null;
  playControls: PlayControls;
};

const AxisClipSliders: React.FC<AxisClipSlidersProps> = (props) => {
  const activeAxis = activeAxisMap[props.mode];

  const updateRegion = (axis: AxisName, minval: number, maxval: number): void => {
    if (!props.playControls.playHolding || props.playingAxis !== axis) {
      props.playControls.pause();
    }

    const { changeViewerSetting, numSlices, region } = props;
    // get a value from 0-1
    const max = numSlices[axis];
    const start = minval / max;
    const end = maxval / max;
    changeViewerSetting("region", { ...region, [axis]: [start, end] });
  };

  const updateSlice = (axis: AxisName, val: number): void => {
    if (!props.playControls.playHolding || props.playingAxis !== axis) {
      props.playControls.pause();
    }

    props.changeViewerSetting("slice", { ...props.slices, [axis]: val / props.numSlices[axis] });
  };

  // Pause when view mode or volume size has changed
  useEffect(() => props.playControls.pause(), [props.mode, ...Object.values(props.numSlices)]);

  const handlePlayPause = (axis: AxisName | "t", willPlay: boolean): void => {
    if (willPlay) {
      props.playControls.play(axis);
    } else {
      props.playControls.pause();
    }
  };

  const create2dAxisSlider = (axis: AxisName): React.ReactNode => (
    <div key={axis + props.numSlices[axis]} className={`slider-row slider-${axis}`}>
      <PlaySliderRow
        label={axis.toUpperCase()}
        val={Math.round(props.slices[axis] * props.numSlices[axis])}
        max={props.numSlices[axis] - 1}
        onChange={(val) => updateSlice(axis, val)}
        onStart={() => props.playControls.startHold(axis)}
        onEnd={() => props.playControls.endHold()}
        playing={props.playingAxis === axis}
        onPlayPause={(willPlay) => handlePlayPause(axis, willPlay)}
      />
    </div>
  );

  const create3dAxisSlider = (axis: AxisName): React.ReactNode => {
    const numSlices = props.numSlices[axis];
    const region = props.region[axis];

    return (
      <div key={axis + numSlices} className={`slider-row slider-${axis}`}>
        <SliderRow
          label={axis.toUpperCase()}
          vals={[Math.round(region[0] * numSlices), Math.round(region[1] * numSlices)]}
          max={numSlices - 1}
          onSlide={(values) => updateRegion(axis, values[0], values[1])}
          onStart={() => props.playControls.startHold(axis)}
          onEnd={() => props.playControls.endHold()}
        />
      </div>
    );
  };

  return (
    <div className={activeAxis ? "clip-sliders clip-sliders-2d" : "clip-sliders"}>
      <span className="slider-group">
        <h4 className="slider-group-title">ROI</h4>
        <span className="slider-group-rows">
          {activeAxis ? create2dAxisSlider(activeAxis) : AXES.map(create3dAxisSlider)}
        </span>
      </span>

      {props.numTimesteps > 1 && (
        <span className="slider-group">
          <h4 className="slider-group-title">Time</h4>
          <span className="slider-group-rows">
            <div className="slider-row slider-t">
              <PlaySliderRow
                label={""}
                val={props.time}
                max={props.numTimesteps}
                playing={props.playingAxis === "t"}
                onPlayPause={(willPlay) => handlePlayPause("t", willPlay)}
                onChange={(time) => props.changeViewerSetting("time", time)}
                onStart={() => props.playControls.startHold("t")}
                onEnd={() => props.playControls.endHold()}
              />
            </div>
          </span>
        </span>
      )}
    </div>
  );
};

export default AxisClipSliders;
