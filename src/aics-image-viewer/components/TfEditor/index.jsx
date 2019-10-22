import React from 'react';
import reactCSS from 'reactcss';
import * as d3 from "d3";
import { SketchPicker } from 'react-color';
import './styles.scss';

import { Button } from 'antd';

import { LUT_MIN_PERCENTILE, LUT_MAX_PERCENTILE } from '../../shared/constants';
import { controlPointsToLut } from '../../shared/utils/controlPointsToLut';

export const TFEDITOR_DEFAULT_COLOR = 'rgb(255, 255, 255)';

export default class MyTfEditor extends React.Component {

    constructor(props) {
        super(props);
        this.id = props.id;
        this._width = props.width;
        this._height = props.height;
        this.canvas = React.createRef();
        this.createElements = this.createElements.bind(this);
        this.ready = this.ready.bind(this);
        this._initializeElements = this._initializeElements.bind(this);
        this._updateScales = this._updateScales.bind(this);
        this._drawChart = this._drawChart.bind(this);
        this._redraw = this._redraw.bind(this);
        this._capturedMousemove = this._capturedMousemove.bind(this);
        this._mousemove = this._mousemove.bind(this);
        this._mouseup = this._mouseup.bind(this);
        this._drawCanvas = this._drawCanvas.bind(this);
        this._autoXF = this._autoXF.bind(this);
        this._resetXF = this._resetXF.bind(this);
        this._export = this._export.bind(this);
        this._auto2XF = this._auto2XF.bind(this);
        this._auto98XF = this._auto98XF.bind(this);
        this._bestFitXF = this._bestFitXF.bind(this);
        this._colorPick = this._colorPick.bind(this);
        this.handleCloseColorPicker = this.handleCloseColorPicker.bind(this);
        this.handleChangeColor = this.handleChangeColor.bind(this);

        this.svgElement = React.createRef();

        this.state = {
            displayColorPicker: false
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

    componentDidUpdate(prevProps) {
        const {
            volumeData
        } = this.props;

        this._redraw();
        if (!prevProps.volumeData && volumeData) {
            this._redrawHistogram();
        }
    }

    componentWillUnmount() {
        document.removeEventListener('mousemove', this._capturedMousemove);
        document.removeEventListener('mouseup', this._mouseup);
    }

    createElements() {
        // Custom margins
        this.margin = {
            top: 5,
            right: 20,
            bottom: 5,
            left: 25
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
        this.area = d3.area();

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

    _initializeElements() {
        var extent = [0, 255];
        if (this.fitToData && this.props.volumeData && this.props.volumeData.length > 0) {
            extent = d3.extent(this.props.volumeData);
        }
        var me = this;
        this.xScale
            .rangeRound([0, this._width])
            .domain(extent);
        this.yScale
            .domain([0, 1])
            .range([this._height, 0]);
        this.binScale
            .domain([1, 10])
            .range([this._height, 0])
            .base(2)
            .clamp([0, this._height]);
        this.bins
            .domain(this.xScale.domain())
            .thresholds(this.xScale.ticks(this.numberBins));
        if (this.props.controlPoints.length === 0) {
            let newControlPoints = [
                {
                    'x': extent[0],
                    'opacity': 0,
                    'color': TFEDITOR_DEFAULT_COLOR
                },
                {
                    'x': extent[1],
                    'opacity': 1,
                    'color': TFEDITOR_DEFAULT_COLOR
                }];
            this.props.updateChannelLutControlPoints(newControlPoints);
        }
        this.selected = this.props.controlPoints[0];
        this.area
            .x(function (d) {
                return me.xScale(d.x);
            })
            .y0(function (d) {
                return me.yScale(d.opacity);
            })
            .y1(this._height)
            .curve(d3.curveLinear);

        this.canvasScale.range([0, 1]);
        this.dataScale.domain(extent).range([0, 255]);

        // Canvas element selector to output the result
        this.canvasSelector = this.canvasSelector || "#canvas-" + this.id;

    }

    // Get the 2D canvas context where the TF will be drawn
    _canvasContext() {
        let canvas_element = this.canvas.current;
        if (canvas_element) {
            return canvas_element.getContext("2d");
        }
        return canvas_element;
    }

    // Perform the drawing
    _drawChart() {
        var me = this;
        var g = this.svg.append("g")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

        // Draw initial histogram
        this._redrawHistogram();

        // Gradient definitions
        g.append("defs").append("linearGradient")
            .attr("id", "tfGradient-" + this.id)
            //.attr("gradientUnits", "userSpaceOnUse")
            .attr("gradientUnits", "objectBoundingBox")
            .attr("spreadMethod", "pad")
            .attr("x1", "0%").attr("y1", "0%")
            .attr("x2", "100%").attr("y2", "0%");

        // Draw control points
        g.append("path")
            .datum(me.props.controlPoints)
            .attr("class", "line")
            .attr("fill", "url(#tfGradient-" + this.id + ")")
            .attr("stroke", "white")
            .call(function () {
                me._initDraw();
            });

        // Mouse interaction handler
        g.append("rect")
            .attr("y", -10)
            .attr("x", -10)
            .attr("width", me._width + 20)
            .attr("height", me._height + 20)
            .style("opacity", 0)
            .on("mousedown", function () {
                me._mousedown();

                document.addEventListener('mousemove', me._capturedMousemove, false);
                document.addEventListener('mouseup', me._mouseup, false);

            });

        // Draw axis
        var xTicks = me.xScale.ticks(me.numberTicks);
        xTicks[xTicks.length - 1] = me.xScale.domain()[1];
        g.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(0," + me._height + ")")
            .call(d3.axisBottom(me.xScale).tickValues(xTicks));

        g.append("g")
            .attr("class", "axis axis--y")
            .attr("transform", "translate(0, 0)")
            .call(d3.axisLeft(me.yScale).ticks(me.numberTicks));
    }

    // update scales with new data input
    _updateScales() {
        if (this.fitToData) {
            var dataExtent = d3.extent(this.props.volumeData);
            // First obtain the index of points to be maintain;
            var x0 = -1;
            var x1 = -1;
            // Override dirty checking
            let { controlPoints } = this.props;
            for (var i = controlPoints.length - 1; i >= 0; i--) {
                x1 = (controlPoints[i].x >= dataExtent[1]) ? i : x1;
                if (controlPoints[i].x <= dataExtent[0]) {
                    x0 = i;
                    break;
                }
            }
            let newControlPoints = [...controlPoints];
            // Delete control points out of range
            if (x1 !== -1) {
                newControlPoints[x1].x = dataExtent[1];
                newControlPoints.splice(x1, newControlPoints.length - x1 - 1);
            }
            if (x0 !== -1) {
                newControlPoints[x0].x = dataExtent[0];
                newControlPoints.splice(0, x0);
            }

            this.props.updateChannelLutControlPoints(newControlPoints);

            this.xScale.domain(dataExtent);
            this.dataScale.domain(dataExtent);
        } else {
            this.xScale.domain([0, 255]);
            this.dataScale.domain([0, 255]);
        }
        this.bins.domain(this.xScale.domain())
            .thresholds(this.xScale.ticks(this.numberBins));
    }

    // update the axis with the new data input
    _updateAxis() {
        let svg = d3.select(this.svgElement.current).select("g");
        var xTicks = this.xScale.ticks(this.numberTicks);
        xTicks[xTicks.length - 1] = this.xScale.domain()[1];
        svg.selectAll(".axis.axis--x").call(d3.axisBottom(this.xScale).tickValues(xTicks));
    }

    // update the chart data
    _redrawHistogram() {
        var me = this;
        d3.select(this.svgElement.current).select("g").selectAll(".bar").remove();
        if (this.props.volumeData && this.props.volumeData.length > 0) {
            var bins = this.bins(this.props.volumeData);
            this.binScale.domain([0.1, d3.max(bins, function (d) {
                return d.length;
            })]);
            var bar = d3.select(this.svgElement.current).select("g").selectAll(".bar").data(bins);
            var barEnter = bar.enter().append("g")
                .attr("class", "bar")
                .attr("transform", function (d) {
                    return "translate(" + me.xScale(d.x0) + "," + me.binScale(d.length) + ")";
                });

            barEnter.append("rect")
                .attr("x", 1)
                .attr("width", function (d) {
                    return d.x1 - d.x0;
                })
                .attr("height", function (d) {
                    return me._height - me.binScale(d.length);
                });

            d3.select(this.svgElement.current).select("g").selectAll(".bar").lower();

            bar.exit().remove();
        }
    }

    _makeCirclesForControlPoints() {
        var me = this;
        const {
            controlPoints
        } = this.props;
        if (!controlPoints) {
            return;
        }
        var svg = d3.select(me.svgElement.current).select("g");
        svg.select("path").datum(controlPoints).attr("d", me.area);

        // Add circle to connect and interact with the control points
        var circle = svg.selectAll("circle").data(controlPoints);

        circle.enter().append("circle")
            .attr("cx", function (d) {
                return me.xScale(d.x);
            })
            .attr("cy", function (d) {
                return me.yScale(d.opacity);
            })
            .style("fill", function (d) {
                return d.color;
            })
            .attr("r", 1e-6)
            .on("mousedown", function (d) {
                me.selected = me.dragged = d;
                me.last_color = d.color;
                me._redraw();

                document.addEventListener('mousemove', me._capturedMousemove, false);
                document.addEventListener('mouseup', me._mouseup, false);

            })
            .on("contextmenu", function (d, i) {
                // react on right-clicking
                d3.event.preventDefault();
                me._mouseup();
                me._colorPick();
            })
            .transition()
            .duration(750)
            .attr("r", 5.0);

        circle.classed("selected", function (d) {
            return d === me.selected;
        })
            .style("fill", function (d) {
                return d.color;
            })
            .attr("cx", function (d) {
                return me.xScale(d.x);
            })
            .attr("cy", function (d) {
                return me.yScale(d.opacity);
            })
            .raise();

        circle.exit().remove();
    }

    _makeGradient() {
        const {
            controlPoints
        } = this.props;
        if (!controlPoints) {
            return;
        }
        var svg = d3.select(this.svgElement.current).select("g");
        svg.select("path").datum(controlPoints).attr("d", this.area);

        var gradient = svg.select("linearGradient").selectAll("stop").data(controlPoints);

        var MAX_DISPLAY_OPACITY = 0.9;

        gradient.enter().append("stop")
            .attr("stop-color", function (d) {
                return d.color;
            })
            .attr("stop-opacity", function (d) {
                return Math.min(d.opacity, MAX_DISPLAY_OPACITY);
            })
            .attr("offset", function (d) {
                var l = (controlPoints[controlPoints.length - 1].x - controlPoints[0].x);
                return "" + ((d.x - controlPoints[0].x) / l * 100) + "%";
            });

        gradient.attr("stop-color", function (d) {
            return d.color;
        })
            .attr("stop-opacity", function (d) {
                return Math.min(d.opacity, MAX_DISPLAY_OPACITY);
            })
            .attr("offset", function (d) {
                var l = (controlPoints[controlPoints.length - 1].x - controlPoints[0].x);
                return "" + ((d.x - controlPoints[0].x) / l * 100) + "%";
            });

        gradient.exit().remove();
    }


    // create the chart content
    _initDraw() {
        // Add circle to connect and interact with the control points
        this._makeCirclesForControlPoints();

        // Create a linear gradient definition of the control points
        this._makeGradient();

        // Draw gradient in canvas too
        this._drawCanvas();
    }

    // Update the chart content
    _redraw() {
        // Add circle to connect and interact with the control points
        this._makeCirclesForControlPoints();

        // Create a linear gradient definition of the control points
        this._makeGradient();

        if (d3.event) {
            d3.event.preventDefault();
            d3.event.stopPropagation();
        }

        // Draw gradient in canvas and update image
        this._drawCanvas();
        this._updateImage();

    }

    _updateImage() {
        const {
            controlPoints,
            index
        } = this.props;
        const opacityGradient = controlPointsToLut(controlPoints);
        // send update to image rendering
        this.props.updateChannelTransferFunction(
            index,
            opacityGradient
        );
    }

    /**
     * Draw the TF output in the canvas container.
     */
    _drawCanvas() {
        const {
            controlPoints
        } = this.props;
        if (controlPoints && controlPoints.length > 0) {
            var extent = [controlPoints[0].x, controlPoints[controlPoints.length - 1].x];
            // Convinient access
            var x0 = this.dataScale(extent[0]),
                x1 = this.dataScale(extent[1]);
            // hack to handle degeneracy when not enough control points or control points too close together
            if (x1 === x0) {
                return;
            }
            this.canvasScale.domain([x0, x1]);
            var ctx = this._canvasContext();
            if (!ctx) {
                return;
            }
            // Clear previous result
            var width = ctx.canvas.clientWidth || 256;
            var height = ctx.canvas.clientHeight || 10;
            ctx.clearRect(0, 0, width, height);
            // Draw new result
            //scale to coordinates in case this canvas's width is not 256.
            var x0c = x0 * width / 256;
            var x1c = x1 * width / 256;
            var grd = ctx.createLinearGradient(x0c, 0, x1c, 0);
            for (var i = 0; i < controlPoints.length; i++) {
                var d = controlPoints[i];
                //var d = this.get('controlPoints', i);
                var color = d3.color(d.color);
                color.opacity = d.opacity;
                //grd.addColorStop((d.x - x0) / Math.abs(x1 - x0), color.toString());
                grd.addColorStop(this.canvasScale(this.dataScale(d.x)), color.toString());
            }
            ctx.fillStyle = grd;
            ctx.fillRect(x0c, 0, x1c - x0c + 1, height);
        }
    }

    /////// User interaction related event callbacks ////////

    _colorPick() {
        this.setState({ displayColorPicker: !this.state.displayColorPicker });
    }

    _mousedown() {
        var me = this;
        var pos = d3.mouse(me.svg.node());
        var point = {
            "x": me.xScale.invert(Math.max(0, Math.min(pos[0] - me.margin.left, me._width))),
            "opacity": me.yScale.invert(Math.max(0, Math.min(pos[1] - me.margin.top, me._height))),
            "color": me.last_color
        };
        me.selected = me.dragged = point;
        var bisect = d3.bisector(function (a, b) {
            return a.x - b.x;
        }).left;
        var indexPos = bisect(me.props.controlPoints, point);

        let newControlPoints = [...this.props.controlPoints];
        newControlPoints.splice(indexPos, 0, point);
        this.props.updateChannelLutControlPoints(newControlPoints);
    }

    _capturedMousemove(event) {
        event.preventDefault();
        event.stopPropagation();
        d3.customEvent(event, this._mousemove, this);
    }

    _mousemove(event) {
        if (!this.dragged) {
            return;
        }

        const { controlPoints } = this.props;
        function equalPoint(a, index, array) {
            return a.x === this.x && a.opacity === this.opacity && a.color === this.color;
        };
        var index = controlPoints.findIndex(equalPoint, this.selected);
        if (index === -1) {
            return;
        }
        var m = d3.mouse(d3.select(this.svgElement.current).node());
        this.selected = this.dragged = controlPoints[index];
        this.dragged.x = this.xScale.invert(Math.max(0, Math.min(this._width, m[0] - this.margin.left)));
        this.dragged.opacity = this.yScale.invert(Math.max(0, Math.min(this._height, m[1] - this.margin.top)));
        var bisect = d3.bisector(function (a, b) {
            return a.x - b.x;
        }).left;
        var bisect2 = d3.bisector(function (a, b) {
            return a.x - b.x;
        }).right;
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

    _mouseup() {
        document.removeEventListener('mousemove', this._capturedMousemove);
        document.removeEventListener('mouseup', this._mouseup);
        if (!this.dragged) {
            return;
        }
        this.dragged = null;
    }

    _keydown() {
        if (!this.selected) {
            return;
        }
        switch (d3.event.keyCode) {
            case 46:
                { // delete
                    var i = this.props.controlPoints.indexOf(this.selected);
                    let newControlPoints = [...this.props.controlPoints];
                    newControlPoints.splice(i, 1);
                    this.selected = newControlPoints.length > 0 ? newControlPoints[i > 0 ? i - 1 : 0] : null;
                    this.props.updateChannelLutControlPoints(newControlPoints);
                    break;
                }
        }
    }

    _export() {
        var jsonContent = JSON.stringify(this.props.controlPoints);
        var a = document.createElement("a");
        document.body.appendChild(a);
        a.style = "display: none";
        var blob = new Blob([jsonContent], {
            type: "octet/stream"
        });
        var url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = "transferFunction.json";
        a.click();
        window.URL.revokeObjectURL(url);
    }

    updateControlPointsWithoutColor(ptsWithoutColor) {
        const pts = ptsWithoutColor.map(pt => ({ ...pt, color: 'rgb(255, 255, 255)' }));
        this.selected = pts[0];
        this.props.updateChannelLutControlPoints(pts);
    }

    _autoXF() {
        const { channelData } = this.props;

        const lutObj = channelData.histogram.lutGenerator_auto();
        this.updateControlPointsWithoutColor(lutObj.controlPoints);
    }

    _auto2XF() {
        const { channelData } = this.props;

        const lutObj = channelData.histogram.lutGenerator_auto2();
        this.updateControlPointsWithoutColor(lutObj.controlPoints);
    }

    _auto98XF() {
        const { channelData } = this.props;

        const lutObj = channelData.histogram.lutGenerator_percentiles(LUT_MIN_PERCENTILE, LUT_MAX_PERCENTILE);
        this.updateControlPointsWithoutColor(lutObj.controlPoints);
    }

    _bestFitXF() {
        const { channelData } = this.props;

        const lutObj = channelData.histogram.lutGenerator_bestFit();
        this.updateControlPointsWithoutColor(lutObj.controlPoints);
    }

    _resetXF() {
        const { channelData } = this.props;

        const lutObj = channelData.histogram.lutGenerator_fullRange();
        this.updateControlPointsWithoutColor(lutObj.controlPoints);
    }

    /////// Public API functions ///////

    /**
     * Get the TF output canvas `element`.
     *
     * @return {HTMLElement} canvas 2D with the TF output.
     */
    getCanvas() {
        return this.canvas.current;
    }
    /**
     * Get the output canvas `element` query selector.
     *
     * @return {CSSselector}
     */
    getCanvasSelector() {
        return this.canvasSelector;
    }

    /**
     * TODO: Set the output canvas `element`.
     *
     * @param {HTMLElement} element canvas 2D.
     * @return {bool}
     */
    setCanvas(element) {
        //return this._canvasContext = element.getContext("2d");
    }

    /**
     * Set the pixel data we are manipulating
     *
     * @param {AICSchannel} channel
     */


    setData() {
        if (!this.props.channelData) {
            throw new Error('Transfer Function Editor setData called with no channel data.');
        }
        this._updateScales();
        this._updateAxis();
    }

    /////// Polymer lifecycle callbacks /////////////

    // Initialize elements and perform the drawing of first drawing
    ready() {
        // Access the svg dom element
        this.svg = d3.select(this.svgElement.current);
        this._width = +this.svg.attr("width") - this.margin.left - this.margin.right;
        this._height = +this.svg.attr("height") - this.margin.top - this.margin.bottom - 15;
        this._initializeElements();
        this._drawChart();
    }

    handleCloseColorPicker() {
        this.setState({ displayColorPicker: false });
    };

    handleChangeColor(color) {
        this.last_color = color.hex;
        this.selected.color = this.last_color;
        this._redraw();
    };

    render() {
        const {
            id,
            width,
            height
        } = this.props;

        return (
            <div id="container">
                <svg id={`svg-${id}`} width={width} height={height} ref={this.svgElement}></svg>
                <div className="aligned">
                    {this.state.displayColorPicker ? <div style={STYLES.popover}>
                        <div style={STYLES.cover} onClick={this.handleCloseColorPicker} />
                        <SketchPicker color={this.last_color} onChange={this.handleChangeColor} />
                    </div> : null}
                </div>
                <div className="aligned">
                    <Button id={`reset-${id}`} className="ant-btn" onClick={this._resetXF}>Reset</Button>
                    <Button id={`auto-${id}`} className="ant-btn" onClick={this._autoXF}>Auto</Button>
                    <Button id={`bestfit-${id}`} className="ant-btn" onClick={this._bestFitXF}>BestFit</Button>
                    <Button id={`auto2-${id}`} className="ant-btn" onClick={this._auto2XF}>Auto_IJ</Button>
                    <Button id={`auto98-${id}`} className="ant-btn" onClick={this._auto98XF}>Auto_98</Button>
                </div>
            </div>
        );
    }
};

const STYLES = {
    colorPicker: {
        margin: 'auto',
        marginRight: 16
    },
    cover: {
        position: 'fixed',
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px'
    },
    popover: {
        position: 'absolute',
        zIndex: '9999',
    },
};
