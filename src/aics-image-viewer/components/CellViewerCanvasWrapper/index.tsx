import React from "react";
import { View3d, Volume } from "@aics/volume-viewer";
import { LoadingOutlined } from "@ant-design/icons";

import { AxisName, PerAxis, Styles } from "../../shared/types";
import { ViewMode } from "../../shared/enums";
import { ViewerSettingUpdater } from "../ViewerStateProvider/types";
import PlayControls from "../../shared/utils/playControls";

import { connectToViewerState } from "../ViewerStateProvider";
import AxisClipSliders from "../AxisClipSliders";
import BottomPanel from "../BottomPanel";

import "./styles.css";

interface ViewerWrapperProps {
  // From parent
  view3d: View3d;
  loadingImage: boolean;
  appHeight: string;
  image: Volume | null;
  numSlices: PerAxis<number>;
  numSlicesLoaded: PerAxis<number>;
  playControls: PlayControls;
  playingAxis: AxisName | "t" | null;
  numTimesteps: number;
  visibleControls: {
    axisClipSliders: boolean;
  };
  onClippingPanelVisibleChange?: (panelOpen: boolean, hasTime: boolean) => void;
  onClippingPanelVisibleChangeEnd?: (panelOpen: boolean) => void;

  // From viewer state
  autorotate: boolean;
  viewMode: ViewMode;
  region: PerAxis<[number, number]>;
  slice: PerAxis<number>;
  time: number;
  changeViewerSetting: ViewerSettingUpdater;
}

interface ViewerWrapperState {}

class ViewerWrapper extends React.Component<ViewerWrapperProps, ViewerWrapperState> {
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
        <LoadingOutlined style={{ fontSize: 60, zIndex: 1000 }} />
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
    const { appHeight, changeViewerSetting, visibleControls, numSlices, numTimesteps, viewMode, region, slice, time } =
      this.props;

    return (
      <div className="cell-canvas" style={{ ...STYLES.viewer, height: appHeight }}>
        <div ref={this.view3dviewerRef} style={STYLES.view3d}></div>
        <BottomPanel
          title="Clipping"
          onVisibleChange={(visible) => this.props.onClippingPanelVisibleChange?.(visible, numTimesteps > 1)}
          onVisibleChangeEnd={this.props.onClippingPanelVisibleChangeEnd}
        >
          {visibleControls.axisClipSliders && !!this.props.image && (
            <AxisClipSliders
              mode={viewMode}
              image={this.props.image}
              changeViewerSetting={changeViewerSetting}
              numSlices={numSlices}
              numSlicesLoaded={this.props.numSlicesLoaded}
              region={region}
              slices={slice}
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

export default connectToViewerState(ViewerWrapper, [
  "autorotate",
  "viewMode",
  "region",
  "slice",
  "time",
  "changeViewerSetting",
]);

const STYLES: Styles = {
  viewer: {
    display: "flex",
    position: "relative",
  },
  view3d: {
    width: "100%",
    display: "flex",
    overflow: "hidden",
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
