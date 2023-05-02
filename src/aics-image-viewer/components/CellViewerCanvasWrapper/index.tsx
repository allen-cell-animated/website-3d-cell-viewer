import React from "react";
import { View3d, Volume } from "@aics/volume-viewer";

import { Icon } from "antd";

import { PerAxis, Styles } from "../../shared/types";
import { ViewMode } from "../../shared/enums";
import { ViewerSettingUpdater } from "../App/types";

import AxisClipSliders from "../AxisClipSliders";
import BottomPanel from "../BottomPanel";
import "./styles.css";

interface ViewerWrapperProps {
  view3d: View3d;
  autorotate: boolean;
  loadingImage: boolean;
  viewMode: ViewMode;
  appHeight: string;
  image: Volume | null;
  numSlices: PerAxis<number>;
  region: PerAxis<[number, number]>;
  showControls: {
    axisClipSliders: boolean;
  };
  changeViewerSetting: ViewerSettingUpdater;
  onClippingPanelVisibleChange?: (open: boolean) => void;
  onClippingPanelVisibleChangeEnd?: (open: boolean) => void;
}

interface ViewerWrapperState {}

export default class ViewerWrapper extends React.Component<ViewerWrapperProps, ViewerWrapperState> {
  private view3dviewerRef: React.RefObject<HTMLDivElement>;

  constructor(props: ViewerWrapperProps) {
    super(props);
    this.view3dviewerRef = React.createRef();
  }

  componentDidMount(): void {
    this.view3dviewerRef.current!.appendChild(this.props.view3d.getDOMElement());
    this.props.view3d.setAutoRotate(this.props.autorotate);
  }

  componentDidUpdate(_prevProps: ViewerWrapperProps, _prevState: ViewerWrapperState): void {
    this.props.view3d.resize(null);
  }

  renderOverlay(): React.ReactNode {
    const spinner = this.props.loadingImage ? (
      <div style={STYLES.noImage}>
        <Icon type="loading" theme="outlined" style={{ fontSize: 60, zIndex: 1000 }} />
      </div>
    ) : null;

    const noImageText =
      !this.props.loadingImage && !this.props.image ? <div style={STYLES.noImage}>No image selected</div> : null;
    if (!!noImageText && this.props.view3d) {
      this.props.view3d.removeAllVolumes();
    }
    return noImageText || spinner;
  }

  render(): React.ReactNode {
    const { appHeight, changeViewerSetting, showControls, image, numSlices, viewMode, region } = this.props;
    return (
      <div className="cell-canvas" style={{ ...STYLES.viewer, height: appHeight }}>
        <div ref={this.view3dviewerRef} style={STYLES.view3d}></div>
        <BottomPanel
          title="Clipping"
          onVisibleChange={this.props.onClippingPanelVisibleChange}
          onVisibleChangeEnd={this.props.onClippingPanelVisibleChangeEnd}
        >
          {showControls.axisClipSliders && !!image && (
            <AxisClipSliders
              mode={viewMode}
              changeViewerSetting={changeViewerSetting}
              numSlices={numSlices}
              region={region}
            />
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
