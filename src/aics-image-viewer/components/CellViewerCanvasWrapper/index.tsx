import React from "react";
import { View3d, Volume } from "@aics/volume-viewer";

import { Icon } from "antd";

import viewMode from "../../shared/enums/viewMode";

import AxisClipSliders from "../AxisClipSliders";
import { BottomPanel } from "../BottomPanel";
import "./styles.css";

interface ViewerWrapperProps {
  autorotate: boolean;
  loadingImage: boolean;
  mode: symbol;
  appHeight: string;
  image: Volume;
  numSlices: {
    x: number;
    y: number;
    z: number;
  };
  renderConfig: {
    axisClipSliders: boolean;
  };
  onView3DCreated: (view3d: View3d) => void;
  setAxisClip: (axis: string, minval: number, maxval: number, isOrthoAxis: boolean) => void;
}

export default class ViewerWrapper extends React.Component<ViewerWrapperProps, {}> {
  private view3dviewerRef: React.RefObject<HTMLDivElement>;
  private view3D: View3d;

  constructor(props) {
    super(props);
    this.view3dviewerRef = React.createRef();
    this.renderOverlay = this.renderOverlay.bind(this);
  }

  componentDidMount() {
    if (!this.view3D) {
      this.view3D = new View3d(this.view3dviewerRef.current);
      this.props.onView3DCreated(this.view3D);
      this.view3D.setAutoRotate(this.props.autorotate);
    }
  }

  componentDidUpdate(prevProps: ViewerWrapperProps, _prevState: {}) {
    if (this.view3D && prevProps.mode && prevProps.mode !== this.props.mode) {
      this.view3D.setCameraMode(viewMode.VIEW_MODE_ENUM_TO_LABEL_MAP.get(this.props.mode));
    }
    if (this.view3D && prevProps.autorotate !== this.props.autorotate) {
      this.view3D.setAutoRotate(this.props.autorotate);
    }

    this.view3D.resize();
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

  render() {
    const { appHeight, renderConfig, image, numSlices, mode, setAxisClip } = this.props;
    return (
      <div className="cell-canvas" style={{ ...STYLES.viewer, height: appHeight }}>
        <div ref={this.view3dviewerRef} style={STYLES.view3d}></div>
        <BottomPanel title="Clipping">
          {renderConfig.axisClipSliders && !!image && (
            <AxisClipSliders mode={mode} setAxisClip={setAxisClip} numSlices={numSlices} />
          )}
        </BottomPanel>
        {this.renderOverlay()}
      </div>
    );
  }
}

const STYLES = {
  viewer: {
    display: "flex" as "flex",
    position: "relative" as "relative",
  },
  view3d: {
    width: "100%",
    display: "flex" as "flex",
  },
  noImage: {
    position: "absolute" as "absolute",
    zIndex: 999,
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    display: "flex" as "flex",
    justifyContent: "center" as "center",
    alignItems: "center" as "center",
    backgroundColor: "#eeeee",
    color: "#9b9b9b",
    fontSize: "2em",
    opacity: 0.75,
  },
};
