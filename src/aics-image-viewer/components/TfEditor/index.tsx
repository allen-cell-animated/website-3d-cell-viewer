import React from "react";
import * as d3 from "d3";
import { SketchPicker, ColorResult } from "react-color";
import { Channel } from "@aics/volume-viewer";
import Nouislider from "nouislider-react";
import "nouislider/distribute/nouislider.css";

import "./styles.css";

import { Button, Checkbox } from "antd";

import { LUT_MIN_PERCENTILE, LUT_MAX_PERCENTILE } from "../../shared/constants";
import { controlPointsToLut } from "../../shared/utils/controlPointsToLut";
import {
  ColorArray,
  colorArrayToObject,
  colorArrayToString,
  ColorObject,
  colorObjectToArray,
} from "../../shared/utils/colorRepresentations";
import { CheckboxChangeEvent } from "antd/lib/checkbox";
import { Styles } from "../../shared/types";

// TODO narrow d3 types packages - we don't need everything that comes with @types/d3

export const TFEDITOR_DEFAULT_COLOR: ColorArray = [255, 255, 255];

type Pair = [number, number];

type ControlPoint = {
  color: ColorArray;
  opacity: number;
  x: number;
};

interface MyTfEditorProps {
  id: string;
  index: number;
  imageName: string | undefined;
  width: number;
  height: number;
  volumeData: Uint8Array;
  channelData: Channel;
  controlPoints: ControlPoint[];
  updateChannelTransferFunction: (index: number, lut: Uint8Array) => void;
  updateChannelLutControlPoints: (controlPoints: ControlPoint[]) => void;
  updateColorizeMode: (colorizeEnabled: boolean) => void;
  updateColorizeAlpha: (colorizeAlpha: number) => void;
  colorizeEnabled: boolean;
  colorizeAlpha: number;
  fitToData?: boolean;
}

interface MyTfEditorState {
  displayColorPicker: boolean;
}

const StatefulColorPicker: React.FC<{
  color: ColorObject;
  onChange: (newColor: ColorResult) => void;
  disableAlpha: boolean;
}> = ({ color, onChange, disableAlpha }) => {
  const [colorState, updateColorState] = React.useState(color);
  const wrappedOnChange = (newColor: ColorResult) => {
    updateColorState(newColor.rgb);
    onChange(newColor);
  };
  return <SketchPicker color={colorState} onChange={wrappedOnChange} disableAlpha={disableAlpha} />;
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
    this.autoXF = this.autoXF.bind(this);
    this.resetXF = this.resetXF.bind(this);
    this.export = this.export.bind(this);
    this.auto2XF = this.auto2XF.bind(this);
    this.auto98XF = this.auto98XF.bind(this);
    this.bestFitXF = this.bestFitXF.bind(this);
    this.handleColorizeCheckbox = this.handleColorizeCheckbox.bind(this);
    this.handleColorizeAlpha = this.handleColorizeAlpha.bind(this);
    this.colorPick = this.colorPick.bind(this);
    this.handleCloseColorPicker = this.handleCloseColorPicker.bind(this);
    this.handleChangeColor = this.handleChangeColor.bind(this);

    this.svgElement = React.createRef();

    this.state = {
      displayColorPicker: false,
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

  componentDidMount() {
    this.createElements();
    this.setData();
    this.ready();
  }

  componentDidUpdate(prevProps: MyTfEditorProps) {
    const { volumeData } = this.props;

    this.redraw();
    if (!prevProps.volumeData && volumeData) {
      this.redrawHistogram();
    }
  }

  componentWillUnmount() {
    document.removeEventListener("mousemove", this.capturedMousemove);
    document.removeEventListener("mouseup", this.mouseup);
  }

  createElements() {
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

  private initializeElements() {
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
  private drawChart() {
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
      .call(() => this.initDraw());

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
    var xTicks = this.xScale.ticks(this.numberTicks);
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
  private updateScales() {
    if (this.fitToData) {
      var dataExtent = d3.extent(this.props.volumeData);
      // First obtain the index of points to be maintain;
      var x0 = -1;
      var x1 = -1;
      // Override dirty checking
      let { controlPoints } = this.props;
      for (var i = controlPoints.length - 1; i >= 0; i--) {
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
  private updateAxis() {
    let svg = d3.select(this.svgElement.current).select("g");
    const xTicks = this.xScale.ticks(this.numberTicks);
    xTicks[xTicks.length - 1] = this.xScale.domain()[1];
    const axis = d3.axisBottom(this.xScale).tickValues(xTicks);
    svg.selectAll<SVGGElement, unknown>(".axis.axis--x").call(axis);
  }

  // update the chart data
  private redrawHistogram() {
    d3.select(this.svgElement.current).select("g").selectAll(".bar").remove();
    if (this.props.volumeData && this.props.volumeData.length > 0) {
      var bins = this.bins(this.props.volumeData);
      this.binScale.domain([0.1, d3.max(bins, (d) => d.length)!]);
      var bar = d3.select(this.svgElement.current).select("g").selectAll(".bar").data(bins);
      var barEnter = bar
        .enter()
        .append("g")
        .attr("class", "bar")
        .attr("transform", (d) => `translate(${this.xScale(d.x0!)},${this.binScale(d.length)})`);

      barEnter
        .append("rect")
        .attr("x", 1)
        .attr("width", (d) => d.x1! - d.x0!)
        .attr("height", (d) => this.height - this.binScale(d.length));

      d3.select(this.svgElement.current).select("g").selectAll(".bar").lower();

      bar.exit().remove();
    }
  }

  private makeCirclesForControlPoints() {
    const { controlPoints } = this.props;
    if (!controlPoints) {
      return;
    }
    var svg = d3.select(this.svgElement.current).select("g");
    svg.select("path").datum(controlPoints).attr("d", this.area);

    // Add circle to connect and interact with the control points
    var circle = svg.selectAll("circle").data(controlPoints);

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
      .on("contextmenu", (d, i) => {
        // react on right-clicking
        d3.event.preventDefault();
        this.mouseup();
        this.colorPick();
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

  private makeGradient() {
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

  // create the chart content
  private initDraw() {
    // Add circle to connect and interact with the control points
    this.makeCirclesForControlPoints();

    // Create a linear gradient definition of the control points
    this.makeGradient();

    // Draw gradient in canvas too
    this.drawCanvas();
  }

  // Update the chart content
  private redraw() {
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
    this.updateImage();
  }

  private updateImage() {
    const { controlPoints, index } = this.props;
    const opacityGradient = controlPointsToLut(controlPoints);
    // send update to image rendering
    this.props.updateChannelTransferFunction(index, new Uint8Array(opacityGradient.buffer));
  }

  /**
   * Draw the TF output in the canvas container.
   */
  private drawCanvas() {
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
      var ctx = this.canvasContext();
      if (!ctx) {
        return;
      }
      // Clear previous result
      var width = ctx.canvas.clientWidth || 256;
      var height = ctx.canvas.clientHeight || 10;
      ctx.clearRect(0, 0, width, height);
      // Draw new result
      //scale to coordinates in case this canvas's width is not 256.
      var x0c = (x0 * width) / 256;
      var x1c = (x1 * width) / 256;
      var grd = ctx.createLinearGradient(x0c, 0, x1c, 0);
      for (var i = 0; i < controlPoints.length; i++) {
        var d = controlPoints[i];
        //var d = this.get('controlPoints', i);
        var color = d3.color(colorArrayToString(d.color));
        color!.opacity = d.opacity;
        //grd.addColorStop((d.x - x0) / Math.abs(x1 - x0), color.toString());
        grd.addColorStop(this.canvasScale(this.dataScale(d.x)), color!.toString());
      }
      ctx.fillStyle = grd;
      ctx.fillRect(x0c, 0, x1c - x0c + 1, height);
    }
  }

  /////// User interaction related event callbacks ////////

  private colorPick() {
    this.setState({ displayColorPicker: !this.state.displayColorPicker });
  }

  private mousedown() {
    const pos = d3.mouse(this.svg.node()!);
    const point = {
      x: this.xScale.invert(Math.max(0, Math.min(pos[0] - this.margin.left, this.width))),
      opacity: this.yScale.invert(Math.max(0, Math.min(pos[1] - this.margin.top, this.height))),
      color: this.last_color,
    };
    this.selected = this.dragged = point;
    var bisect = d3.bisector<ControlPoint, ControlPoint>((a, b) => a.x - b.x).left;
    var indexPos = bisect(this.props.controlPoints, point);

    let newControlPoints = [...this.props.controlPoints];
    newControlPoints.splice(indexPos, 0, point);
    this.props.updateChannelLutControlPoints(newControlPoints);
  }

  private capturedMousemove(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    d3.customEvent(event, this.mousemove, this);
  }

  private mousemove(_event: this) {
    if (!this.dragged) {
      return;
    }

    const { controlPoints } = this.props;
    var index = controlPoints.findIndex(
      (a) => a.x === this.selected?.x && a.opacity === this.selected?.opacity && a.color === this.selected?.color
    );
    if (index === -1) {
      return;
    }
    var m = d3.mouse(d3.select(this.svgElement.current).node()!);
    this.selected = this.dragged = controlPoints[index];
    this.dragged.x = this.xScale.invert(Math.max(0, Math.min(this.width, m[0] - this.margin.left)));
    this.dragged.opacity = this.yScale.invert(Math.max(0, Math.min(this.height, m[1] - this.margin.top)));
    var bisect = d3.bisector<ControlPoint, ControlPoint>((a, b) => a.x - b.x).left;
    var bisect2 = d3.bisector<ControlPoint, ControlPoint>((a, b) => a.x - b.x).right;
    var virtualIndex = bisect(controlPoints, this.dragged);
    var virtualIndex2 = bisect2(controlPoints, this.dragged);
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

  private mouseup() {
    document.removeEventListener("mousemove", this.capturedMousemove);
    document.removeEventListener("mouseup", this.mouseup);
    if (!this.dragged) {
      return;
    }
    this.dragged = null;
  }

  // TODO unused
  // NOTE none of this component's elements are focusable (required to fire keyboard events).
  //   The behavior in this function would be a bit awkward to implement properly.
  private keydown(_e: KeyboardEvent) {
    if (!this.selected) {
      return;
    }
    if (d3.event.keyCode === 46) {
      // delete
      var i = this.props.controlPoints.indexOf(this.selected);
      let newControlPoints = [...this.props.controlPoints];
      newControlPoints.splice(i, 1);
      this.selected = newControlPoints.length > 0 ? newControlPoints[i > 0 ? i - 1 : 0] : null;
      this.props.updateChannelLutControlPoints(newControlPoints);
    }
  }

  private export() {
    var jsonContent = JSON.stringify(this.props.controlPoints);
    var a = document.createElement("a");
    // TODO test that this function still works without these lines
    // document.body.appendChild(a);
    // a.style = "display: none";
    var blob = new Blob([jsonContent], {
      type: "octet/stream",
    });
    var url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = "transferFunction.json";
    a.click();
    window.URL.revokeObjectURL(url);
  }

  updateControlPointsWithoutColor(ptsWithoutColor: ControlPoint[]) {
    const pts = ptsWithoutColor.map((pt) => ({
      ...pt,
      color: TFEDITOR_DEFAULT_COLOR,
    }));
    this.updateControlPoints(pts);
  }

  updateControlPoints(pts: ControlPoint[]) {
    // TODO do I need to copy the pts here?
    this.selected = pts[0];
    this.props.updateChannelLutControlPoints(pts);
  }

  private autoXF() {
    const { channelData } = this.props;

    const lutObj = channelData.histogram.lutGenerator_auto();
    this.updateControlPointsWithoutColor(lutObj.controlPoints);
  }

  private auto2XF() {
    const { channelData } = this.props;

    const lutObj = channelData.histogram.lutGenerator_auto2();
    this.updateControlPointsWithoutColor(lutObj.controlPoints);
  }

  private auto98XF() {
    const { channelData } = this.props;

    const lutObj = channelData.histogram.lutGenerator_percentiles(LUT_MIN_PERCENTILE, LUT_MAX_PERCENTILE);
    this.updateControlPointsWithoutColor(lutObj.controlPoints);
  }

  private bestFitXF() {
    const { channelData } = this.props;

    const lutObj = channelData.histogram.lutGenerator_bestFit();
    this.updateControlPointsWithoutColor(lutObj.controlPoints);
  }

  private handleColorizeCheckbox(e: CheckboxChangeEvent) {
    this.props.updateColorizeMode(e.target.checked);
  }

  private handleColorizeAlpha(values: number[]) {
    this.props.updateColorizeAlpha(values[0]);
  }

  private resetXF() {
    const { channelData } = this.props;

    const lutObj = channelData.histogram.lutGenerator_fullRange();
    this.updateControlPointsWithoutColor(lutObj.controlPoints);
  }

  /////// Public API functions ///////

  /**
   * Set the pixel data we are manipulating
   */
  setData() {
    if (!this.props.channelData) {
      throw new Error("Transfer Function Editor setData called with no channel data.");
    }
    this.updateScales();
    this.updateAxis();
  }

  /////// Polymer lifecycle callbacks /////////////

  // Initialize elements and perform the drawing of first drawing
  ready() {
    // Access the svg dom element
    this.svg = d3.select(this.svgElement.current);
    this.width = +this.svg.attr("width") - this.margin.left - this.margin.right;
    this.height = +this.svg.attr("height") - this.margin.top - this.margin.bottom - 15;
    this.initializeElements();
    this.drawChart();
  }

  handleCloseColorPicker() {
    this.setState({ displayColorPicker: false });
  }

  handleChangeColor(color: ColorResult) {
    this.last_color = colorObjectToArray(color.rgb);
    if (this.selected) {
      this.selected.color = this.last_color;
      this.redraw();
    }
  }

  render() {
    const { id, width, height, colorizeEnabled, colorizeAlpha } = this.props;

    return (
      <div id="container">
        <svg id={`svg-${id}`} width={width} height={height} ref={this.svgElement} />
        <div className="aligned">
          {this.state.displayColorPicker ? (
            <div style={STYLES.popover}>
              <div style={STYLES.cover} onClick={this.handleCloseColorPicker} />
              <StatefulColorPicker
                color={colorArrayToObject(this.last_color)}
                onChange={this.handleChangeColor}
                disableAlpha={true}
              />
            </div>
          ) : null}
        </div>
        <div className="aligned">
          <Checkbox checked={colorizeEnabled} onChange={this.handleColorizeCheckbox} id={`colorize-${id}`}>
            Colorize
          </Checkbox>
          <div style={STYLES.control}>
            <Nouislider
              //                      id={`svg-${id}`}
              range={{ min: [0], max: [1] }}
              start={colorizeAlpha}
              connect={true}
              tooltips={true}
              behaviour="drag"
              onUpdate={this.handleColorizeAlpha}
            />
          </div>
        </div>
        <div className="aligned">
          <Button id={`reset-${id}`} className="ant-btn" onClick={this.resetXF}>
            Reset
          </Button>
          <Button id={`auto-${id}`} className="ant-btn" onClick={this.autoXF}>
            Auto
          </Button>
          <Button id={`bestfit-${id}`} className="ant-btn" onClick={this.bestFitXF}>
            BestFit
          </Button>
          <Button id={`auto2-${id}`} className="ant-btn" onClick={this.auto2XF}>
            Auto_IJ
          </Button>
          <Button id={`auto98-${id}`} className="ant-btn" onClick={this.auto98XF}>
            Auto_98
          </Button>
        </div>
      </div>
    );
  }
}

const STYLES: Styles = {
  colorPicker: {
    margin: "auto",
    marginRight: 16,
  },
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
  control: {
    flex: 5,
    height: 30,
    paddingTop: 15,
  },
};
