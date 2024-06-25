import React from "react";
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
  ColorObject,
  colorObjectToArray,
} from "../../shared/utils/colorRepresentations";
import { Styles } from "../../shared/types";

export const TFEDITOR_DEFAULT_COLOR: ColorArray = [255, 255, 255];
const COLOR_PICKER_MARGIN = 2;

type Pair = [number, number];

interface MyTfEditorProps {
  id: string;
  width: number;
  height: number;
  volumeData: Uint8Array;
  channelData: Channel;
  controlPoints: ControlPoint[];
  updateChannelLutControlPoints: (controlPoints: ControlPoint[]) => void;
  updateColorizeMode: (colorizeEnabled: boolean) => void;
  updateColorizeAlpha: (colorizeAlpha: number) => void;
  colorizeEnabled: boolean;
  colorizeAlpha: number;
  fitToData?: boolean;
}

interface MyTfEditorState {
  /**
   * Either `null` when the control panel is closed, or an x offset into the plot to position the color picker.
   * Positive: offset right from the left edge of the plot; negative: offset left from the right edge of the plot.
   */
  colorPickerPosition: number | null;
}

/** Wrapper to convince color picker interface to update while open */
const StatefulSketchPicker: React.FC<{
  color: ColorObject;
  onChange: (newColor: ColorResult) => void;
  disableAlpha: boolean;
}> = ({ color, onChange, disableAlpha }) => {
  const [colorState, updateColorState] = React.useState(color);
  const wrappedOnChange = (newColor: ColorResult): void => {
    updateColorState(newColor.rgb);
    onChange(newColor);
  };
  return <SketchPicker color={colorState} onChange={wrappedOnChange} disableAlpha={disableAlpha} />;
};

const TF_GENERATORS: Record<string, (histogram: Histogram) => Lut> = {
  autoXF: (histo) => {
    // Currently unused. min and max are the first and last bins whose values are >=10% of max bin
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

export default class MyTfEditor extends React.Component<MyTfEditorProps, MyTfEditorState> {
  id: string;
  private width: number;
  private height: number;
  canvas: React.RefObject<HTMLCanvasElement>;
  svgElement: React.RefObject<SVGSVGElement>;
  fitToData: boolean;

  // Properties below are set in createElements (called in componentDidMount, should never be accessed while undefined)
  margin!: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  formatCount!: (n: number) => string;
  numberBins!: number;
  numberTicks!: number;
  xScale!: d3.ScaleLinear<number, number>;
  yScale!: d3.ScaleLinear<number, number>;
  binScale!: d3.ScaleLogarithmic<number, number>;
  area!: d3.Area<ControlPoint>;
  bins!: d3.HistogramGeneratorNumber<number, number>;
  canvasScale!: d3.ScaleLinear<number, number>;
  dataScale!: d3.ScaleLinear<number, number>;
  dragged!: ControlPoint | null;
  selected!: ControlPoint | null;
  last_color!: ColorArray;

  canvasSelector!: string; // Set in initializeElements, should also never be undefined
  svg!: d3.Selection<SVGSVGElement | null, unknown, null, undefined>; // Set in ready

  constructor(props: MyTfEditorProps) {
    super(props);
    this.id = props.id;
    this.width = props.width;
    this.height = props.height;
    this.canvas = React.createRef();

    this.createElements = this.createElements.bind(this);
    this.ready = this.ready.bind(this);
    this.initializeElements = this.initializeElements.bind(this);
    this.updateScales = this.updateScales.bind(this);
    this.drawChart = this.drawChart.bind(this);
    this.redraw = this.redraw.bind(this);
    this.capturedMousemove = this.capturedMousemove.bind(this);
    this.mousemove = this.mousemove.bind(this);
    this.mouseup = this.mouseup.bind(this);
    this.drawCanvas = this.drawCanvas.bind(this);
    this.applyTFGenerator = this.applyTFGenerator.bind(this);
    this.colorPick = this.colorPick.bind(this);
    this.handleCloseColorPicker = this.handleCloseColorPicker.bind(this);
    this.handleChangeColor = this.handleChangeColor.bind(this);

    this.svgElement = React.createRef();

    this.state = {
      colorPickerPosition: null,
    };

    /**
     * The X axis range is delimited to the input data range.
     * If false, the range will be set by default: [0-255]
     */
    this.fitToData = props.fitToData || false;
    /**
     * TF control points.
     *
     * The control points that define the transfer function. User
     * added points will be reflected in the _control-points_
     * attribute. Example:
     *
     *     [{"x":0,"opacity":0,"color":"blue"},
     *      {"x":102.3,"opacity":0.55,"color":"green"},
     *      {"x":255,"opacity":1,"color":"red"}]
     * @type {Array}
     */
  }

  componentDidMount(): void {
    this.createElements();
    this.setData();
    this.ready();
  }

  componentDidUpdate(prevProps: MyTfEditorProps): void {
    const { volumeData } = this.props;

    this.redraw();
    if (prevProps.volumeData !== volumeData) {
      this.redrawHistogram();
    }
  }

  componentWillUnmount(): void {
    document.removeEventListener("mousemove", this.capturedMousemove);
    document.removeEventListener("mouseup", this.mouseup);
  }

  createElements(): void {
    // Custom margins
    this.margin = {
      top: 5,
      right: 20,
      bottom: 5,
      left: 25,
    };
    this.formatCount = d3.format(",.0f");
    /**
     * The number of bins to represent the histogram of the input data.
     *
     * @type {Number}
     */
    this.numberBins = 256;

    /**
     * The number of ticks to be displayed in the axis.
     *
     * @type {Number}
     */
    this.numberTicks = 4;
    // Axis scales
    this.xScale = d3.scaleLinear();
    this.yScale = d3.scaleLinear();
    this.binScale = d3.scaleLog();
    // Area for the opacity map representation
    this.area = d3.area<ControlPoint>();

    // Create histogram object
    this.bins = d3.histogram();

    // Scale to fit the gradient in the canvas output
    this.canvasScale = d3.scaleLinear();

    // Scale data range to 8bit
    this.dataScale = d3.scaleLinear();

    // Keep track of control points interaction
    this.dragged = null;
    this.selected = null;
    this.last_color = TFEDITOR_DEFAULT_COLOR;
  }

  private initializeElements(): void {
    let extent = [0, 255];
    if (this.fitToData && this.props.volumeData && this.props.volumeData.length > 0) {
      extent = d3.extent(this.props.volumeData) as Pair;
    }
    this.xScale.rangeRound([0, this.width]).domain(extent);
    this.yScale.domain([0, 1]).range([this.height, 0]);
    this.binScale.domain([1, 10]).range([this.height, 0]).base(2).clamp(true);
    this.bins.domain(this.xScale.domain() as Pair).thresholds(this.xScale.ticks(this.numberBins));
    if (this.props.controlPoints.length === 0) {
      let newControlPoints = [
        {
          x: extent[0],
          opacity: 0,
          color: TFEDITOR_DEFAULT_COLOR,
        },
        {
          x: extent[1],
          opacity: 1,
          color: TFEDITOR_DEFAULT_COLOR,
        },
      ];
      this.props.updateChannelLutControlPoints(newControlPoints);
    }
    this.selected = this.props.controlPoints[0];
    this.area
      .x((d) => this.xScale(d.x))
      .y0((d) => this.yScale(d.opacity))
      .y1(this.height)
      .curve(d3.curveLinear);

    this.canvasScale.range([0, 1]);
    this.dataScale.domain(extent).range([0, 255]);

    // Canvas element selector to output the result
    this.canvasSelector = this.canvasSelector || "#canvas-" + this.id;
  }

  // Get the 2D canvas context where the TF will be drawn
  private canvasContext(): CanvasRenderingContext2D | null {
    let canvas_element = this.canvas.current;
    if (canvas_element) {
      return canvas_element.getContext("2d");
    }
    return canvas_element;
  }

  // Perform the drawing
  private drawChart(): void {
    const g = this.svg.append("g").attr("transform", `translate(${this.margin.left},${this.margin.top})`);

    // Draw initial histogram
    this.redrawHistogram();

    // Gradient definitions
    g.append("defs")
      .append("linearGradient")
      .attr("id", "tfGradient-" + this.id)
      //.attr("gradientUnits", "userSpaceOnUse")
      .attr("gradientUnits", "objectBoundingBox")
      .attr("spreadMethod", "pad")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    // Draw control points
    g.append("path")
      .datum(this.props.controlPoints)
      .attr("class", "line")
      .attr("fill", "url(#tfGradient-" + this.id + ")")
      .attr("stroke", "white")
      .call(() => this.redraw());

    // Mouse interaction handler
    g.append("rect")
      .attr("y", -10)
      .attr("x", -10)
      .attr("width", this.width + 20)
      .attr("height", this.height + 20)
      .style("opacity", 0)
      .on("mousedown", () => {
        this.mousedown();

        document.addEventListener("mousemove", this.capturedMousemove, false);
        document.addEventListener("mouseup", this.mouseup, false);
      });

    // Draw axis
    const xTicks = this.xScale.ticks(this.numberTicks);
    xTicks[xTicks.length - 1] = this.xScale.domain()[1];
    g.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + this.height + ")")
      .call(d3.axisBottom(this.xScale).tickValues(xTicks));

    g.append("g")
      .attr("class", "axis axis--y")
      .attr("transform", "translate(0, 0)")
      .call(d3.axisLeft(this.yScale).ticks(this.numberTicks));
  }

  // update scales with new data input
  private updateScales(): void {
    if (this.fitToData) {
      const dataExtent = d3.extent(this.props.volumeData);
      // First obtain the index of points to be maintain;
      let x0 = -1;
      let x1 = -1;
      // Override dirty checking
      let { controlPoints } = this.props;
      for (let i = controlPoints.length - 1; i >= 0; i--) {
        x1 = controlPoints[i].x >= dataExtent[1]! ? i : x1;
        if (controlPoints[i].x <= dataExtent[0]!) {
          x0 = i;
          break;
        }
      }
      let newControlPoints = [...controlPoints];
      // Delete control points out of range
      if (x1 !== -1) {
        newControlPoints[x1].x = dataExtent[1]!;
        newControlPoints.splice(x1, newControlPoints.length - x1 - 1);
      }
      if (x0 !== -1) {
        newControlPoints[x0].x = dataExtent[0]!;
        newControlPoints.splice(0, x0);
      }

      this.props.updateChannelLutControlPoints(newControlPoints);

      this.xScale.domain(dataExtent as Pair);
      this.dataScale.domain(dataExtent as Pair);
    } else {
      this.xScale.domain([0, 255]);
      this.dataScale.domain([0, 255]);
    }
    this.bins.domain(this.xScale.domain() as Pair).thresholds(this.xScale.ticks(this.numberBins));
  }

  // update the axis with the new data input
  private updateAxis(): void {
    let svg = d3.select(this.svgElement.current).select("g");
    const xTicks = this.xScale.ticks(this.numberTicks);
    xTicks[xTicks.length - 1] = this.xScale.domain()[1];
    const axis = d3.axisBottom(this.xScale).tickValues(xTicks);
    svg.selectAll<SVGGElement, unknown>(".axis.axis--x").call(axis);
  }

  private getBinLengths(): { binLengths: number[]; max: number } {
    const histogram = this.props.channelData.histogram;
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

  // update the chart data
  private redrawHistogram(): void {
    d3.select(this.svgElement.current).select("g").selectAll(".bar").remove();
    if (this.props.volumeData && this.props.volumeData.length > 0) {
      const { binLengths, max } = this.getBinLengths();

      this.binScale.domain([0.1, max]);
      const bar = d3.select(this.svgElement.current).select("g").selectAll(".bar").data(binLengths);
      const barEnter = bar
        .enter()
        .append("g")
        .attr("class", "bar")
        .attr("transform", (length, idx) => `translate(${this.xScale(idx)},${this.binScale(length)})`);

      barEnter
        .append("rect")
        .attr("x", 1)
        .attr("width", 1)
        .attr("height", (length) => this.height - this.binScale(length));

      d3.select(this.svgElement.current).select("g").selectAll(".bar").lower();

      bar.exit().remove();
    }
  }

  private makeCirclesForControlPoints(): void {
    const { controlPoints } = this.props;
    if (!controlPoints) {
      return;
    }
    const svg = d3.select(this.svgElement.current).select("g");
    svg.select("path").datum(controlPoints).attr("d", this.area);

    // Add circle to connect and interact with the control points
    const circle = svg.selectAll("circle").data(controlPoints);

    circle
      .enter()
      .append("circle")
      .attr("cx", (d) => this.xScale(d.x))
      .attr("cy", (d) => this.yScale(d.opacity))
      .style("fill", (d) => colorArrayToString(d.color))
      .attr("r", 1e-6)
      .on("mousedown", (d) => {
        this.selected = this.dragged = d;
        this.last_color = d.color;
        this.redraw();

        document.addEventListener("mousemove", this.capturedMousemove, false);
        document.addEventListener("mouseup", this.mouseup, false);
      })
      .on("contextmenu", () => {
        // react on right-clicking
        d3.event.preventDefault();
        this.mouseup();
        this.colorPick(d3.event.target);
      })
      .transition()
      .duration(750)
      .attr("r", 5.0);

    circle
      .classed("selected", (d) => d === this.selected)
      .style("fill", (d) => colorArrayToString(d.color))
      .attr("cx", (d) => this.xScale(d.x))
      .attr("cy", (d) => this.yScale(d.opacity))
      .raise();

    circle.exit().remove();
  }

  private makeGradient(): void {
    const { controlPoints } = this.props;
    if (!controlPoints) {
      return;
    }
    const svg = d3.select(this.svgElement.current).select("g");
    svg.select("path").datum(controlPoints).attr("d", this.area);

    const gradient = svg.select("linearGradient").selectAll("stop").data(controlPoints);

    const MAX_DISPLAY_OPACITY = 0.9;

    gradient
      .enter()
      .append("stop")
      .attr("stop-color", (d) => colorArrayToString(d.color))
      .attr("stop-opacity", (d) => Math.min(d.opacity, MAX_DISPLAY_OPACITY))
      .attr("offset", (d) => {
        const l = controlPoints[controlPoints.length - 1].x - controlPoints[0].x;
        return "" + ((d.x - controlPoints[0].x) / l) * 100 + "%";
      });

    gradient
      .attr("stop-color", (d) => colorArrayToString(d.color))
      .attr("stop-opacity", (d) => Math.min(d.opacity, MAX_DISPLAY_OPACITY))
      .attr("offset", (d) => {
        const l = controlPoints[controlPoints.length - 1].x - controlPoints[0].x;
        return "" + ((d.x - controlPoints[0].x) / l) * 100 + "%";
      });

    gradient.exit().remove();
  }

  // Update the chart content
  private redraw(): void {
    // Add circle to connect and interact with the control points
    this.makeCirclesForControlPoints();

    // Create a linear gradient definition of the control points
    this.makeGradient();

    if (d3.event) {
      d3.event.preventDefault();
      d3.event.stopPropagation();
    }

    // Draw gradient in canvas and update image
    this.drawCanvas();
  }

  /**
   * Draw the TF output in the canvas container.
   */
  private drawCanvas(): void {
    const { controlPoints } = this.props;
    if (controlPoints && controlPoints.length > 0) {
      const extent = [controlPoints[0].x, controlPoints[controlPoints.length - 1].x];
      // Convinient access
      const x0 = this.dataScale(extent[0]),
        x1 = this.dataScale(extent[1]);
      // hack to handle degeneracy when not enough control points or control points too close together
      if (x1 === x0) {
        return;
      }
      this.canvasScale.domain([x0, x1]);
      const ctx = this.canvasContext();
      if (!ctx) {
        return;
      }
      // Clear previous result
      const width = ctx.canvas.clientWidth || 256;
      const height = ctx.canvas.clientHeight || 10;
      ctx.clearRect(0, 0, width, height);
      // Draw new result
      //scale to coordinates in case this canvas's width is not 256.
      const x0c = (x0 * width) / 256;
      const x1c = (x1 * width) / 256;
      const grd = ctx.createLinearGradient(x0c, 0, x1c, 0);
      for (let i = 0; i < controlPoints.length; i++) {
        const d = controlPoints[i];
        //const d = this.get('controlPoints', i);
        const color = d3.color(colorArrayToString(d.color));
        color!.opacity = d.opacity;
        //grd.addColorStop((d.x - x0) / Math.abs(x1 - x0), color.toString());
        grd.addColorStop(this.canvasScale(this.dataScale(d.x)), color!.toString());
      }
      ctx.fillStyle = grd;
      ctx.fillRect(x0c, 0, x1c - x0c + 1, height);
    }
  }

  /////// User interaction related event callbacks ////////

  private colorPick(cpEl?: HTMLElement): void {
    if (!cpEl || !this.svgElement.current) {
      this.setState({ colorPickerPosition: 0 });
      return;
    }

    const svgRect = this.svgElement.current.getBoundingClientRect();
    const cpRect = cpEl.getBoundingClientRect();
    const cpRectCenter = cpRect.left + cpRect.width / 2;

    if (cpRectCenter - svgRect.left < svgRect.width / 2) {
      // Control point is towards the left of the plot; open color picker to its right
      this.setState({ colorPickerPosition: cpRect.right - svgRect.left + COLOR_PICKER_MARGIN });
    } else {
      // Control point is towards the right of the plot; open color picker to its left
      this.setState({ colorPickerPosition: -(svgRect.right - cpRect.left + COLOR_PICKER_MARGIN) });
    }
  }

  private mousedown(): void {
    const pos = d3.mouse(this.svg.node()!);
    const point = {
      x: this.xScale.invert(Math.max(0, Math.min(pos[0] - this.margin.left, this.width))),
      opacity: this.yScale.invert(Math.max(0, Math.min(pos[1] - this.margin.top, this.height))),
      color: this.last_color,
    };
    this.selected = this.dragged = point;
    const bisect = d3.bisector<ControlPoint, ControlPoint>((a, b) => a.x - b.x).left;
    const indexPos = bisect(this.props.controlPoints, point);

    let newControlPoints = [...this.props.controlPoints];
    newControlPoints.splice(indexPos, 0, point);
    this.props.updateChannelLutControlPoints(newControlPoints);
  }

  private capturedMousemove(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    d3.customEvent(event, this.mousemove, this);
  }

  private mousemove(_event: this): void {
    if (!this.dragged) {
      return;
    }

    const { controlPoints } = this.props;
    const index = controlPoints.findIndex(
      (a) => a.x === this.selected?.x && a.opacity === this.selected?.opacity && a.color === this.selected?.color
    );
    if (index === -1) {
      return;
    }
    const m = d3.mouse(d3.select(this.svgElement.current).node()!);
    this.selected = this.dragged = controlPoints[index];
    this.dragged.x = this.xScale.invert(Math.max(0, Math.min(this.width, m[0] - this.margin.left)));
    this.dragged.opacity = this.yScale.invert(Math.max(0, Math.min(this.height, m[1] - this.margin.top)));
    const bisect = d3.bisector<ControlPoint, ControlPoint>((a, b) => a.x - b.x).left;
    const bisect2 = d3.bisector<ControlPoint, ControlPoint>((a, b) => a.x - b.x).right;
    const virtualIndex = bisect(controlPoints, this.dragged);
    const virtualIndex2 = bisect2(controlPoints, this.dragged);
    let newControlPoints = [...controlPoints];
    if (virtualIndex < index) {
      newControlPoints.splice(virtualIndex, 1);
    } else if (virtualIndex > index) {
      newControlPoints.splice(index + 1, 1);
    } else if (virtualIndex2 - index >= 2) {
      newControlPoints.splice(index + 1, 1);
    }
    this.props.updateChannelLutControlPoints(newControlPoints);
  }

  private mouseup(): void {
    document.removeEventListener("mousemove", this.capturedMousemove);
    document.removeEventListener("mouseup", this.mouseup);
    if (!this.dragged) {
      return;
    }
    this.dragged = null;
  }

  updateControlPointsWithoutColor(ptsWithoutColor: ControlPoint[]): void {
    const pts = ptsWithoutColor.map((pt) => ({
      ...pt,
      color: TFEDITOR_DEFAULT_COLOR,
    }));
    this.updateControlPoints(pts);
  }

  updateControlPoints(pts: ControlPoint[]): void {
    // TODO do I need to copy the pts here?
    this.selected = pts[0];
    this.props.updateChannelLutControlPoints(pts);
  }

  applyTFGenerator(generator: string): void {
    const lut = TF_GENERATORS[generator](this.props.channelData.histogram);
    this.updateControlPointsWithoutColor(lut.controlPoints);
  }

  createTFGeneratorButton(generator: string, name: string, description: string): React.ReactNode {
    return (
      <Tooltip title={description} placement="top">
        <Button onClick={() => this.applyTFGenerator(generator)}>{name}</Button>
      </Tooltip>
    );
  }

  /////// Public API functions ///////

  /** Set the pixel data we are manipulating */
  setData(): void {
    if (!this.props.channelData) {
      throw new Error("Transfer Function Editor setData called with no channel data.");
    }
    this.updateScales();
    this.updateAxis();
  }

  // Initialize elements and perform the drawing of first drawing
  ready(): void {
    // Access the svg dom element
    this.svg = d3.select(this.svgElement.current);
    this.width = +this.svg.attr("width") - this.margin.left - this.margin.right;
    this.height = +this.svg.attr("height") - this.margin.top - this.margin.bottom - 15;
    this.initializeElements();
    this.drawChart();
  }

  handleCloseColorPicker(): void {
    this.setState({ colorPickerPosition: null });
  }

  handleChangeColor(color: ColorResult): void {
    this.last_color = colorObjectToArray(color.rgb);
    if (this.selected) {
      this.selected.color = this.last_color;
      this.props.updateChannelLutControlPoints([...this.props.controlPoints]);
      this.redraw();
    }
  }

  render(): React.ReactNode {
    const { width, height, colorizeEnabled, colorizeAlpha } = this.props;
    const { colorPickerPosition } = this.state;
    const cpDirection = (colorPickerPosition ?? 0) < 0 ? "right" : "left";

    return (
      <div>
        <div className="button-row">
          {this.createTFGeneratorButton("resetXF", "None", "Reset transfer function to full range.")}
          {this.createTFGeneratorButton("auto98XF", "Default", "Ramp from 50th percentile to 98th.")}
          {this.createTFGeneratorButton("auto2XF", "IJ Auto", `Emulates ImageJ's "auto" button.`)}
          {this.createTFGeneratorButton("bestFitXF", "Auto 2", "Ramp over the middle 80% of data.")}
        </div>
        {colorPickerPosition !== null && (
          <div style={{ ...STYLES.popover, ...{ [cpDirection]: Math.abs(colorPickerPosition) } }}>
            <div style={STYLES.cover} onClick={this.handleCloseColorPicker} />
            <StatefulSketchPicker
              color={colorArrayToObject(this.last_color)}
              onChange={this.handleChangeColor}
              disableAlpha={true}
            />
          </div>
        )}
        <svg className="tf-editor-svg" width={width} height={height} ref={this.svgElement} />
        <SliderRow
          label={
            <Checkbox checked={colorizeEnabled} onChange={(e) => this.props.updateColorizeMode(e.target.checked)}>
              Colorize
            </Checkbox>
          }
          max={1}
          start={colorizeAlpha}
          onUpdate={(values) => this.props.updateColorizeAlpha(values[0])}
          hideSlider={!colorizeEnabled}
        />
      </div>
    );
  }
}

const STYLES: Styles = {
  cover: {
    position: "fixed",
    top: "0px",
    right: "0px",
    bottom: "0px",
    left: "0px",
  },
  popover: {
    position: "absolute",
    zIndex: "9999",
  },
};

const GRADIENT_MAX_OPACITY = 0.9;

const ControlPointGradientDef: React.FC<{ controlPoints: ControlPoint[]; id: string }> = ({ controlPoints, id }) => {
  const range = controlPoints[controlPoints.length - 1].x - controlPoints[0].x;
  return (
    <defs>
      <linearGradient id={id} gradientUnits="objectBoundingBox" spreadMethod="pad" x1="0%" y1="0%" x2="100%" y2="0%">
        {controlPoints.map((cp, i) => {
          const offset = "" + ((cp.x - controlPoints[0].x) / range) * 100 + "%";
          const opacity = Math.min(cp.opacity, GRADIENT_MAX_OPACITY);
          return <stop key={i} stopColor={colorArrayToString(cp.color)} stopOpacity={opacity} offset={offset} />;
        })}
      </linearGradient>
    </defs>
  );
};

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

const TF_EDITOR_MARGINS = {
  top: 10,
  right: 20,
  bottom: 20, // includes space for x-axis
  left: 25,
};

const TF_EDITOR_NUM_TICKS = 4;
const TF_EDITOR_BINS = 256;

const TfEditor: React.FC<MyTfEditorProps> = (props) => {
  const innerWidth = props.width - TF_EDITOR_MARGINS.left - TF_EDITOR_MARGINS.right;
  const innerHeight = props.height - TF_EDITOR_MARGINS.top - TF_EDITOR_MARGINS.bottom;

  const [colorPickerPosition, setColorPickerPosition] = React.useState<number | null>(null);

  const [selectedPointIdx, setSelectedPointIdx] = React.useState<number | null>(null);
  const draggedPointIdxRef = React.useRef<number | null>(null);

  const svgRef = React.useRef<SVGSVGElement>(null);

  const controlPointsRef = React.useRef<ControlPoint[]>(props.controlPoints);
  const setControlPoints = (newControlPoints: ControlPoint[]): void => {
    controlPointsRef.current = newControlPoints;
    props.updateChannelLutControlPoints(newControlPoints);
  };

  const xScale = d3.scaleLinear().domain([0, 255]).rangeRound([0, innerWidth]);
  const yScale = d3.scaleLinear().domain([0, 1]).range([innerHeight, 0]);

  const mouseEventToControlPointValues = (event: MouseEvent | React.MouseEvent): [number, number] => {
    const svgRect = svgRef.current?.getBoundingClientRect() ?? { x: 0, y: 0 };
    return [
      xScale.invert(clamp(event.clientX - svgRect.x - TF_EDITOR_MARGINS.left, 0, innerWidth)),
      yScale.invert(clamp(event.clientY - svgRect.y - TF_EDITOR_MARGINS.top, 0, innerHeight)),
    ];
  };

  const mouseMove = (event: MouseEvent): void => {
    if (draggedPointIdxRef.current === null) {
      return;
    }
    const draggedIdx = draggedPointIdxRef.current;

    // Update dragged control point
    const [x, opacity] = mouseEventToControlPointValues(event);
    const newControlPoints = [...controlPointsRef.current]; // TODO closure stuff here
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

  const plotMouseDown: React.MouseEventHandler<SVGSVGElement> = (event) => {
    if (draggedPointIdxRef.current === null) {
      // create new control point
      const [x, opacity] = mouseEventToControlPointValues(event);

      // TODO use last_color
      const point = { x, opacity, color: props.controlPoints[0].color };

      // add new control point to controlPoints
      const index = d3.bisector<ControlPoint, ControlPoint>((a, b) => a.x - b.x).left(props.controlPoints, point);
      draggedPointIdxRef.current = index;

      const newControlPoints = [...props.controlPoints];
      newControlPoints.splice(index, 0, point);
      setControlPoints(newControlPoints);
    }

    setSelectedPointIdx(draggedPointIdxRef.current);
    document.addEventListener("mousemove", mouseMove);
    document.addEventListener(
      "mouseup",
      () => {
        draggedPointIdxRef.current = null;
        document.removeEventListener("mousemove", mouseMove);
      },
      { once: true }
    );
  };

  /** d3-generated svg data string representing the line between points and the region filled with gradient */
  const area = React.useMemo(() => {
    const areaGenerator = d3
      .area<ControlPoint>()
      .x((d) => xScale(d.x))
      .y0((d) => yScale(d.opacity))
      .y1(innerHeight)
      .curve(d3.curveLinear);
    return areaGenerator(props.controlPoints) ?? undefined;
  }, [props.controlPoints]);
  // dragged, selected, last_color?

  // The below `useCallback`s are used as "ref callbacks" - passed as the `ref` prop of SVG elements in order to fill
  // these elements using D3. They are called when the ref'd component mounts and unmounts, and whenever their identity
  // changes (i.e. whenever their dependencies change).

  const xAxisRef = React.useCallback(
    (el: SVGGElement) => {
      const ticks = xScale.ticks(TF_EDITOR_NUM_TICKS);
      ticks[ticks.length - 1] = xScale.domain()[1];
      d3.select(el).call(d3.axisBottom(xScale).tickValues(ticks));
    },
    [props.width]
  );

  const yAxisRef = React.useCallback(
    (el: SVGGElement) => d3.select(el).call(d3.axisLeft(yScale).ticks(TF_EDITOR_NUM_TICKS)),
    [props.height]
  );

  const histogramRef = React.useCallback(
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
        .join("rect") // ensure we have exactly as many bound `rect` elements as we have histogram bins
        .attr("class", "bar")
        .attr("width", barWidth)
        .attr("x", (_len, idx) => xScale(idx)) // set position and height from data
        .attr("y", (len) => binScale(len))
        .attr("height", (len) => innerHeight - binScale(len));
    },
    [props.channelData.histogram]
  );

  const applyTFGenerator = (generator: string): void => {
    // const lut = TF_GENERATORS[generator](props.channelData.histogram);
    // updateControlPointsWithoutColor(lut.controlPoints);
  };

  const createTFGeneratorButton = (generator: string, name: string, description: string): React.ReactNode => (
    <Tooltip title={description} placement="top">
      <Button onClick={() => applyTFGenerator(generator)}>{name}</Button>
    </Tooltip>
  );

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
      {/* {colorPickerPosition !== null && (
        <div style={{ ...STYLES.popover, ...{ [cpDirection]: Math.abs(colorPickerPosition) } }}>
          <div style={STYLES.cover} onClick={this.handleCloseColorPicker} />
          <StatefulSketchPicker
            color={colorArrayToObject(this.last_color)}
            onChange={this.handleChangeColor}
            disableAlpha={true}
          />
        </div>
      )} */}

      {/* ----- PLOT SVG ----- */}
      <svg className="tf-editor-svg" ref={svgRef} width={props.width} height={props.height} onMouseDown={plotMouseDown}>
        <ControlPointGradientDef controlPoints={props.controlPoints} id={`tfGradient-${props.id}`} />
        <g transform={`translate(${TF_EDITOR_MARGINS.left},${TF_EDITOR_MARGINS.top})`}>
          <g ref={histogramRef} />
          <path className="line" fill={`url(#tfGradient-${props.id})`} stroke="white" d={area} />
          {/* plot axes */}
          <g ref={xAxisRef} className="axis axis--x" transform={`translate(0,${innerHeight})`} />
          <g ref={yAxisRef} className="axis axis--y" transform="translate(0, 0)" />
          {/* control point circles */}
          {props.controlPoints.map((cp, i) => (
            <circle
              key={i}
              className={i === selectedPointIdx ? "selected" : ""}
              cx={xScale(cp.x)}
              cy={yScale(cp.opacity)}
              style={{ fill: colorArrayToString(cp.color) }}
              r={5}
              onMouseDown={() => (draggedPointIdxRef.current = i)}
              // TODO: onMouseDown, onContextMenu, transition - see makeCirclesForControlPoints
            />
          ))}
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

export { TfEditor };
