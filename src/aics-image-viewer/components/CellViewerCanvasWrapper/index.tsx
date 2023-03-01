import React from "react";
import { View3d, Volume } from "@aics/volume-viewer";

import { Icon } from "antd";

import { AxisName, PerAxis, Styles } from "../../shared/types";
import { ViewMode } from "../../shared/enums";

import AxisClipSliders from "../AxisClipSliders";
import BottomPanel from "../BottomPanel";
import "./styles.css";

interface ViewerWrapperProps {
  autorotate: boolean;
  loadingImage: boolean;
  viewMode: ViewMode;
  appHeight: string;
  image: Volume | null;
  numSlices: PerAxis<number>;
  region: PerAxis<[number, number]>;
  renderConfig: {
    axisClipSliders: boolean;
  };
  onView3DCreated: (view3d: View3d) => void;
  setAxisClip: (axis: AxisName, minval: number, maxval: number, isOrthoAxis: boolean) => void;
  onClippingPanelVisibleChange?: (open: boolean) => void;
  onClippingPanelVisibleChangeEnd?: (open: boolean) => void;
}

interface ViewerWrapperState {}

export default class ViewerWrapper extends React.Component<ViewerWrapperProps, ViewerWrapperState> {
  private view3dviewerRef: React.RefObject<HTMLDivElement>;
  private view3D?: View3d;

  constructor(props: ViewerWrapperProps) {
    super(props);
    this.view3dviewerRef = React.createRef();
  }

  componentDidMount(): void {
    if (!this.view3D) {
      this.view3D = new View3d(this.view3dviewerRef.current!);
      this.props.onView3DCreated(this.view3D);
      this.view3D.setAutoRotate(this.props.autorotate);
    }
  }

  componentDidUpdate(prevProps: ViewerWrapperProps, _prevState: ViewerWrapperState): void {
    if (!this.view3D) {
      return;
    }
    if (prevProps.viewMode && prevProps.viewMode !== this.props.viewMode) {
      this.view3D.setCameraMode(this.props.viewMode);
    }
    if (prevProps.autorotate !== this.props.autorotate) {
      this.view3D.setAutoRotate(this.props.autorotate);
    }

    this.view3D.resize(null);
  }

  renderOverlay(): React.ReactNode {
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

  render(): React.ReactNode {
    const { appHeight, renderConfig, image, numSlices, viewMode, setAxisClip, region } = this.props;
    return (
      <div className="cell-canvas" style={{ ...STYLES.viewer, height: appHeight }}>
        <div ref={this.view3dviewerRef} style={STYLES.view3d}></div>
        <BottomPanel
          title="Clipping"
          onVisibleChange={this.props.onClippingPanelVisibleChange}
          onVisibleChangeEnd={this.props.onClippingPanelVisibleChangeEnd}
        >
          {renderConfig.axisClipSliders && !!image && (
            <AxisClipSliders mode={viewMode} setAxisClip={setAxisClip} numSlices={numSlices} region={region} />
          )}
        </BottomPanel>
        {this.renderOverlay()}
      </div>
    );
  }
}

const STYLES: Styles = {
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
