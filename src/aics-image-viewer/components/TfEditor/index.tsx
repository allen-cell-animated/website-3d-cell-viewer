import React, { useCallback, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { SketchPicker, ColorResult } from "react-color";
import { Channel, ControlPoint, Histogram, Lut } from "@aics/volume-viewer";
import { Button, Checkbox, Tooltip } from "antd";
import "nouislider/distribute/nouislider.css";

import "./styles.css";

import SliderRow from "../shared/SliderRow";
import { LUT_MIN_PERCENTILE, LUT_MAX_PERCENTILE } from "../../shared/constants";
import {
  ColorArray,
  colorArrayToObject,
  colorArrayToString,
  colorObjectToArray,
} from "../../shared/utils/colorRepresentations";
import { useRefWithSetter } from "../../shared/utils/hooks";

export const TFEDITOR_DEFAULT_COLOR: ColorArray = [255, 255, 255];
const TFEDITOR_COLOR_PICKER_MARGIN_PX = 2;
const TFEDITOR_GRADIENT_MAX_OPACITY = 0.9;
const TFEDITOR_NUM_TICKS = 4;
const TFEDITOR_MAX_BIN = 255;

const TFEDITOR_MARGINS = {
  top: 10,
  right: 20,
  bottom: 20, // includes space for x-axis
  left: 25,
};

const MOUSE_EVENT_BUTTONS_PRIMARY = 1;

type TfEditorProps = {
  id: string;
  width: number;
  height: number;
  channelData: Channel;
  controlPoints: ControlPoint[];
  updateLutControlPoints: (controlPoints: ControlPoint[]) => void;
  updateColorizeMode: (colorizeEnabled: boolean) => void;
  updateColorizeAlpha: (colorizeAlpha: number) => void;
  colorizeEnabled: boolean;
  colorizeAlpha: number;
};

const TF_GENERATORS: Record<string, (histogram: Histogram) => Lut> = {
  autoXF: (histo) => {
    // Currently unused. min and max are the first and last bins whose values are >=10% that of the max bin
    const [hmin, hmax] = histo.findAutoMinMax();
    return new Lut().createFromMinMax(hmin, hmax);
  },
  auto2XF: (histo) => {
    const [hmin, hmax] = histo.findAutoIJBins();
    return new Lut().createFromMinMax(hmin, hmax);
  },
  auto98XF: (histo) => {
    const hmin = histo.findBinOfPercentile(LUT_MIN_PERCENTILE);
    const hmax = histo.findBinOfPercentile(LUT_MAX_PERCENTILE);
    return new Lut().createFromMinMax(hmin, hmax);
  },
  bestFitXF: (histo) => {
    const [hmin, hmax] = histo.findBestFitBins();
    return new Lut().createFromMinMax(hmin, hmax);
  },
  resetXF: (_histo) => new Lut().createFullRange(),
};

/** Defines an SVG gradient with id `id` based on the provided `controlPoints` */
const ControlPointGradientDef: React.FC<{ controlPoints: ControlPoint[]; id: string }> = ({ controlPoints, id }) => {
  const range = controlPoints[controlPoints.length - 1].x - controlPoints[0].x;
  return (
    <defs>
      <linearGradient id={id} gradientUnits="objectBoundingBox" spreadMethod="pad" x1="0%" y1="0%" x2="100%" y2="0%">
        {controlPoints.map((cp, i) => {
          const offset = "" + ((cp.x - controlPoints[0].x) / range) * 100 + "%";
          const opacity = Math.min(cp.opacity, TFEDITOR_GRADIENT_MAX_OPACITY);
          return <stop key={i} stopColor={colorArrayToString(cp.color)} stopOpacity={opacity} offset={offset} />;
        })}
      </linearGradient>
    </defs>
  );
};

/** Retrieves the bin contents and max bin value from `histogram` */
function getHistogramBinLengths(histogram: Histogram): { binLengths: number[]; max: number } {
  const binLengths = [];
  // TODO: Change `histogram.bins` to be readable/readonly
  // so we don't have to copy it here!
  let max = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < histogram.getNumBins(); i++) {
    const binLength = histogram.getBin(i);
    binLengths.push(binLength);
    max = Math.max(max, binLength);
  }
  return { binLengths, max };
}

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const TfEditor: React.FC<TfEditorProps> = (props) => {
  const innerWidth = props.width - TFEDITOR_MARGINS.left - TFEDITOR_MARGINS.right;
  const innerHeight = props.height - TFEDITOR_MARGINS.top - TFEDITOR_MARGINS.bottom;

  const [selectedPointIdx, setSelectedPointIdx] = useState<number | null>(null);
  const [draggedPointIdx, _setDraggedPointIdx] = useState<number | null>(null);

  // these bits of state need their freshest, most up-to-date values available in mouse event handlers. make refs!
  const [controlPointsRef, setControlPoints] = useRefWithSetter(props.updateLutControlPoints, props.controlPoints);
  const [draggedPointIdxRef, setDraggedPointIdx] = useRefWithSetter(_setDraggedPointIdx, draggedPointIdx);

  // Either `null` when the control panel is closed, or an x offset into the plot to position the color picker.
  // Positive: offset right from the left edge of the plot; negative: offset left from the right edge of the plot.
  const [colorPickerPosition, setColorPickerPosition] = useState<number | null>(null);
  const lastColorRef = useRef<ColorArray>(TFEDITOR_DEFAULT_COLOR);

  const svgRef = useRef<SVGSVGElement>(null); // need access to SVG element to measure mouse position

  // d3 scales define the mapping between data and screen space (and do the heavy lifting of generating plot axes)
  const xScale = useMemo(
    () => d3.scaleLinear().domain([0, TFEDITOR_MAX_BIN]).rangeRound([0, innerWidth]),
    [innerWidth]
  );
  const yScale = useMemo(() => d3.scaleLinear().domain([0, 1]).range([innerHeight, 0]), [innerHeight]);

  const mouseEventToControlPointValues = (event: MouseEvent | React.MouseEvent): [number, number] => {
    const svgRect = svgRef.current?.getBoundingClientRect() ?? { x: 0, y: 0 };
    return [
      xScale.invert(clamp(event.clientX - svgRect.x - TFEDITOR_MARGINS.left, 0, innerWidth)),
      yScale.invert(clamp(event.clientY - svgRect.y - TFEDITOR_MARGINS.top, 0, innerHeight)),
    ];
  };

  const handlePlotPointerDown: React.PointerEventHandler<SVGSVGElement> = (event) => {
    if (draggedPointIdxRef.current === null && event.button === 0) {
      // this click is not on an existing point - create a new one
      const [x, opacity] = mouseEventToControlPointValues(event);
      const point = { x, opacity, color: lastColorRef.current };

      // add new control point to controlPoints
      const index = d3.bisector<ControlPoint, ControlPoint>((a, b) => a.x - b.x).left(props.controlPoints, point);
      setDraggedPointIdx(index);

      const newControlPoints = [...props.controlPoints];
      newControlPoints.splice(index, 0, point);
      setControlPoints(newControlPoints);
    }

    setSelectedPointIdx(draggedPointIdxRef.current);

    if (event.button === 0) {
      // get set up to drag the point around, even if the mouse leaves the SVG element
      event.currentTarget.setPointerCapture(event.nativeEvent.pointerId);
    } else {
      setDraggedPointIdx(null);
    }
  };

  const handleControlPointDrag: React.PointerEventHandler<SVGSVGElement> = (event) => {
    if (draggedPointIdxRef.current === null) {
      return;
    }
    if ((event.buttons & MOUSE_EVENT_BUTTONS_PRIMARY) === 0) {
      handleControlPointDragEnd(event);
      return;
    }
    const draggedIdx = draggedPointIdxRef.current;
    event.stopPropagation();
    event.preventDefault();

    // Update dragged control point
    const [x, opacity] = mouseEventToControlPointValues(event);
    const newControlPoints = [...controlPointsRef.current];
    const draggedPoint = newControlPoints[draggedIdx];
    draggedPoint.x = x;
    draggedPoint.opacity = opacity;

    // Remove control points to keep the list sorted by x value
    const bisector = d3.bisector<ControlPoint, ControlPoint>((a, b) => a.x - b.x);
    const idxLeft = bisector.left(newControlPoints, draggedPoint);
    const idxRight = bisector.right(newControlPoints, draggedPoint);

    if (idxLeft < draggedIdx) {
      const numPointsToRemove = draggedIdx - idxLeft; // should almost always be 1
      newControlPoints.splice(idxLeft, numPointsToRemove);
      draggedPointIdxRef.current -= numPointsToRemove;
      setSelectedPointIdx(draggedPointIdxRef.current);
    } else if (idxRight > draggedIdx + 1) {
      newControlPoints.splice(draggedIdx + 1, idxRight - draggedIdx - 1);
    }

    setControlPoints(newControlPoints);
  };

  const handleControlPointDragEnd: React.PointerEventHandler<SVGSVGElement> = (event) => {
    setDraggedPointIdx(null);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleControlPointContextMenu: React.MouseEventHandler<SVGCircleElement> = (event) => {
    event.preventDefault();
    if (!event.target || !svgRef.current) {
      setColorPickerPosition(null);
      return;
    }

    const svgRect = svgRef.current.getBoundingClientRect();
    const cpRect = (event.target as SVGCircleElement).getBoundingClientRect();
    const cpRectCenter = cpRect.left + cpRect.width / 2;

    if (cpRectCenter - svgRect.left < svgRect.width / 2) {
      // Control point is towards the left of the plot; open color picker to its right
      setColorPickerPosition(cpRect.right - svgRect.left + TFEDITOR_COLOR_PICKER_MARGIN_PX);
    } else {
      // Control point is towards the right of the plot; open color picker to its left
      setColorPickerPosition(-(svgRect.right - cpRect.left + TFEDITOR_COLOR_PICKER_MARGIN_PX));
    }
  };

  const handleChangeColor = (color: ColorResult): void => {
    lastColorRef.current = colorObjectToArray(color.rgb);
    if (selectedPointIdx !== null) {
      const newControlPoints = [...props.controlPoints];
      newControlPoints[selectedPointIdx].color = lastColorRef.current;
      setControlPoints(newControlPoints);
    }
  };

  /** d3-generated svg data string representing both the line between points and the region filled with gradient */
  const area = useMemo(() => {
    const areaGenerator = d3
      .area<ControlPoint>()
      .x((d) => xScale(d.x))
      .y0((d) => yScale(d.opacity))
      .y1(innerHeight)
      .curve(d3.curveLinear);
    return areaGenerator(props.controlPoints) ?? undefined;
  }, [props.controlPoints, xScale, yScale, innerHeight]);

  // The below `useCallback`s are used as "ref callbacks" - passed as the `ref` prop of SVG elements in order to render
  // these elements' content using D3. They are called when the ref'd component mounts and unmounts, and whenever their
  // identity changes (i.e. whenever their dependencies change).

  const xAxisRef = useCallback(
    (el: SVGGElement) => {
      const ticks = xScale.ticks(TFEDITOR_NUM_TICKS);
      ticks[ticks.length - 1] = xScale.domain()[1];
      d3.select(el).call(d3.axisBottom(xScale).tickValues(ticks));
    },
    [xScale]
  );

  const yAxisRef = useCallback(
    (el: SVGGElement) => d3.select(el).call(d3.axisLeft(yScale).ticks(TFEDITOR_NUM_TICKS)),
    [yScale]
  );

  const histogramRef = useCallback(
    (el: SVGGElement) => {
      if (el === null) {
        return;
      }
      const { binLengths, max } = getHistogramBinLengths(props.channelData.histogram);
      const barWidth = innerWidth / props.channelData.histogram.getNumBins();
      const binScale = d3.scaleLog().domain([0.1, max]).range([innerHeight, 0]).base(2).clamp(true);

      d3.select(el)
        .selectAll(".bar") // select all the bars of the histogram
        .data(binLengths) // bind the histogram bins to this selection
        .join("rect") // ensure we have exactly as many bound `rect` elements in the DOM as we have histogram bins
        .attr("class", "bar")
        .attr("width", barWidth)
        .attr("x", (_len, idx) => xScale(idx)) // set position and height from data
        .attr("y", (len) => binScale(len))
        .attr("height", (len) => innerHeight - binScale(len));
    },
    [props.channelData.histogram, innerWidth, innerHeight]
  );

  const applyTFGenerator = useCallback(
    (generator: string): void => {
      setSelectedPointIdx(null);
      lastColorRef.current = TFEDITOR_DEFAULT_COLOR;
      const lut = TF_GENERATORS[generator](props.channelData.histogram);
      setControlPoints(lut.controlPoints.map((cp) => ({ ...cp, color: TFEDITOR_DEFAULT_COLOR })));
    },
    [props.channelData.histogram]
  );

  const createTFGeneratorButton = (generator: string, name: string, description: string): React.ReactNode => (
    <Tooltip title={description} placement="top">
      <Button onClick={() => applyTFGenerator(generator)}>{name}</Button>
    </Tooltip>
  );

  // Create one svg circle element for each control point
  const controlPointCircles = props.controlPoints.map((cp, i) => (
    <circle
      key={i}
      className={i === selectedPointIdx ? "selected" : ""}
      cx={xScale(cp.x)}
      cy={yScale(cp.opacity)}
      style={{ fill: colorArrayToString(cp.color) }}
      r={5}
      onPointerDown={() => setDraggedPointIdx(i)}
      onContextMenu={handleControlPointContextMenu}
    />
  ));
  // Move selected control point to the end so it's not occluded by other nearby points
  if (selectedPointIdx !== null) {
    controlPointCircles.push(controlPointCircles.splice(selectedPointIdx, 1)[0]);
  }

  const cpDirection = (colorPickerPosition ?? 0) < 0 ? "right" : "left";

  return (
    <div>
      {/* ----- PRESET BUTTONS ----- */}
      <div className="button-row">
        {createTFGeneratorButton("resetXF", "None", "Reset transfer function to full range.")}
        {createTFGeneratorButton("auto98XF", "Default", "Ramp from 50th percentile to 98th.")}
        {createTFGeneratorButton("auto2XF", "IJ Auto", `Emulates ImageJ's "auto" button.`)}
        {createTFGeneratorButton("bestFitXF", "Auto 2", "Ramp over the middle 80% of data.")}
      </div>

      {/* ----- CONTROL POINT COLOR PICKER ----- */}
      {colorPickerPosition !== null && (
        <div className="tf-editor-popover" style={{ [cpDirection]: Math.abs(colorPickerPosition) }}>
          <div className="tf-editor-cover" onClick={() => setColorPickerPosition(null)} />
          <SketchPicker
            color={colorArrayToObject(lastColorRef.current)}
            onChange={handleChangeColor}
            disableAlpha={true}
          />
        </div>
      )}

      {/* ----- PLOT SVG ----- */}
      <svg
        className={draggedPointIdx !== null ? "tf-editor-svg dragging" : "tf-editor-svg"}
        ref={svgRef}
        width={props.width}
        height={props.height}
        onPointerDown={handlePlotPointerDown}
        onPointerMove={handleControlPointDrag}
        onPointerUp={handleControlPointDragEnd}
      >
        <ControlPointGradientDef controlPoints={props.controlPoints} id={`tfGradient-${props.id}`} />
        <g transform={`translate(${TFEDITOR_MARGINS.left},${TFEDITOR_MARGINS.top})`}>
          {/* histogram bars */}
          <g ref={histogramRef} />
          {/* line between control points, and the gradient under it */}
          <path className="line" fill={`url(#tfGradient-${props.id})`} stroke="white" d={area} />
          {/* plot axes */}
          <g ref={xAxisRef} className="axis" transform={`translate(0,${innerHeight})`} />
          <g ref={yAxisRef} className="axis" />
          {/* control points */}
          {controlPointCircles}
        </g>
      </svg>

      {/* ----- COLORIZE SLIDER ----- */}
      <SliderRow
        label={
          <Checkbox checked={props.colorizeEnabled} onChange={(e) => props.updateColorizeMode(e.target.checked)}>
            Colorize
          </Checkbox>
        }
        max={1}
        start={props.colorizeAlpha}
        onUpdate={(values) => props.updateColorizeAlpha(values[0])}
        hideSlider={!props.colorizeEnabled}
      />
    </div>
  );
};

export default TfEditor;
