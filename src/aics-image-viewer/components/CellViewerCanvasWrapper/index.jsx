import React from "react";
import { View3d } from "@aics/volume-viewer";

import { Icon } from "antd";

import viewMode from "../../shared/enums/viewMode";

import AxisClipSliders from "../AxisClipSliders";
import { BottomPanel } from "../BottomPanel";
import "./styles.css";

const ViewMode = viewMode.mainMapping;

export default class ViewerWrapper extends React.Component {
  constructor(props) {
    super(props);
    this.view3dviewerRef = React.createRef();
    this.getActiveAxis = this.getActiveAxis.bind(this);
    this.setAxisClip = this.setAxisClip.bind(this);
    this.renderOverlay = this.renderOverlay.bind(this);
    this.renderClipSliders = this.renderClipSliders.bind(this);
  }

  componentDidMount() {
    if (!this.view3D) {
      this.view3D = new View3d(this.view3dviewerRef.current);
      this.props.onView3DCreated(this.view3D);
    }
  }

  componentWillReceiveProps(newProps) {
    if (this.view3D && this.props.mode && this.props.mode !== newProps.mode) {
      this.view3D.setCameraMode(viewMode.VIEW_MODE_ENUM_TO_LABEL_MAP.get(newProps.mode));
    }
    if (this.view3D && this.props.autorotate !== newProps.autorotate) {
      this.view3D.setAutoRotate(newProps.autorotate);
    }

    this.view3D.resize();
  }

  getActiveAxis() {
    const { mode } = this.props;
    switch (mode) {
      case ViewMode.yz:
        return "x";
      case ViewMode.xz:
        return "y";
      case ViewMode.xy:
        return "z";
      default:
        return null;
    }
  }

  setAxisClip(axis, minval, maxval, isOrthoAxis) {
    this.props.setAxisClip(axis, minval, maxval, isOrthoAxis);
  }

  renderOverlay() {
    const spinner = this.props.loadingImage ? (
      <div style={STYLES.noImage}>
        <Icon type="loading" theme="outlined" style={{ fontSize: 60, zIndex: 1000 }} />
      </div>
    ) : null;

    const noImageText =
      !this.props.loadingImage && !this.props.image ? <div style={STYLES.noImage}>No image selected</div> : null;
    if (!!noImageText && this.view3D) {
      this.view3D.removeAllVolumes();
    }
    return noImageText || spinner;
  }

  renderClipSliders() {
    if (!this.props.image) {
      return null;
    }

    const { numSlices, mode } = this.props;
    return (
      <AxisClipSliders
        mode={mode}
        activeAxis={this.getActiveAxis()}
        setAxisClip={this.setAxisClip}
        numSlices={numSlices}
      />
    );
  }

  render() {
    const { appHeight, renderConfig } = this.props;
    return (
      <div className="cell-canvas" style={{ ...STYLES.viewer, height: appHeight }}>
        <div ref={this.view3dviewerRef} style={STYLES.view3d}></div>
        <BottomPanel>{renderConfig.axisClipSliders && this.renderClipSliders()}</BottomPanel>
        {this.renderOverlay()}
      </div>
    );
  }
}

const STYLES = {
  viewer: {
    display: "flex",
    position: "relative",
  },
  view3d: {
    width: "100%",
    display: "flex",
  },
  noImage: {
    position: "absolute",
    zIndex: 999,
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#eeeee",
    color: "#9b9b9b",
    fontSize: "2em",
    opacity: 0.75,
  },
};
