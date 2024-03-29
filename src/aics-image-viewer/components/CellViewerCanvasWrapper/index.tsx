import React from "react";
import { View3d } from "@aics/volume-viewer";

import { Icon } from "antd";

import { AxisName, PerAxis, Styles } from "../../shared/types";
import { ViewMode } from "../../shared/enums";
import { ViewerSettingUpdater } from "../App/types";
import PlayControls from "../../shared/utils/playControls";

import AxisClipSliders from "../AxisClipSliders";
import BottomPanel from "../BottomPanel";
import "./styles.css";

interface ViewerWrapperProps {
  view3d: View3d;
  autorotate: boolean;
  loadingImage: boolean;
  viewMode: ViewMode;
  appHeight: string;
  hasImage: boolean;
  numSlices: PerAxis<number>;
  numSlicesLoaded: PerAxis<number>;
  region: PerAxis<[number, number]>;
  slices: PerAxis<number>;
  playControls: PlayControls;
  playingAxis: AxisName | "t" | null;
  numTimesteps: number;
  time: number;
  showControls: {
    axisClipSliders: boolean;
  };
  changeViewerSetting: ViewerSettingUpdater;
  onClippingPanelVisibleChange?: (panelOpen: boolean, hasTime: boolean) => void;
  onClippingPanelVisibleChangeEnd?: (panelOpen: boolean) => void;
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
    // Don't show spinner during playback - we may be constantly loading new data, it'll block the view!
    const showSpinner = this.props.loadingImage && !this.props.playingAxis;
    const spinner = showSpinner ? (
      <div style={STYLES.noImage}>
        <Icon type="loading" theme="outlined" style={{ fontSize: 60, zIndex: 1000 }} />
      </div>
    ) : null;

    const noImageText =
      !this.props.loadingImage && !this.props.hasImage ? <div style={STYLES.noImage}>No image selected</div> : null;
    if (!!noImageText && this.props.view3d) {
      this.props.view3d.removeAllVolumes();
    }
    return noImageText || spinner;
  }

  render(): React.ReactNode {
    const { appHeight, changeViewerSetting, showControls, numSlices, numTimesteps, viewMode, region, slices, time } =
      this.props;

    return (
      <div className="cell-canvas" style={{ ...STYLES.viewer, height: appHeight }}>
        <div ref={this.view3dviewerRef} style={STYLES.view3d}></div>
        <BottomPanel
          title="Clipping"
          onVisibleChange={(visible) => this.props.onClippingPanelVisibleChange?.(visible, numTimesteps > 1)}
          onVisibleChangeEnd={this.props.onClippingPanelVisibleChangeEnd}
        >
          {showControls.axisClipSliders && this.props.hasImage && (
            <AxisClipSliders
              mode={viewMode}
              changeViewerSetting={changeViewerSetting}
              numSlices={numSlices}
              numSlicesLoaded={this.props.numSlicesLoaded}
              region={region}
              slices={slices}
              numTimesteps={numTimesteps}
              time={time}
              playControls={this.props.playControls}
              playingAxis={this.props.playingAxis}
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
