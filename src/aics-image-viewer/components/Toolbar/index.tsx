import { UndoOutlined } from "@ant-design/icons";
import { Button, Radio, Select, Tooltip } from "antd";
import { debounce } from "lodash";
import React from "react";

import ViewModeRadioButtons from "./ViewModeRadioButtons";
import DownloadButton from "./DownloadButton";
import { connectToViewerState } from "../ViewerStateProvider";
import { ViewerSettingUpdater } from "../ViewerStateProvider/types";
import { VisuallyHidden } from "../../../../website/components/LandingPage/utils";
import { ImageType, RenderMode, ViewMode } from "../../shared/enums";
import ViewerIcon from "../shared/ViewerIcon";

import "./styles.css";

interface ToolbarProps {
  // From parent
  cellDownloadHref: string;
  fovDownloadHref: string;
  hasCellId: boolean;
  hasParentImage: boolean;
  canPathTrace: boolean;

  resetCamera: () => void;
  downloadScreenshot: () => void;

  visibleControls: {
    autoRotateButton: boolean;
    viewModeRadioButtons: boolean;
    fovCellSwitchControls: boolean;
    resetCameraButton: boolean;
    showAxesButton: boolean;
    showBoundingBoxButton: boolean;
  };

  // From viewer state
  imageType: ImageType;
  renderMode: RenderMode;
  viewMode: ViewMode;
  autorotate: boolean;
  showAxes: boolean;
  showBoundingBox: boolean;
  changeViewerSetting: ViewerSettingUpdater;
  resetToSavedViewerState: () => void;
}

interface ToolbarState {
  scrollMode: boolean;
  scrollBtnLeft: boolean;
  scrollBtnRight: boolean;
}

const RESIZE_DEBOUNCE_DELAY = 50;

class Toolbar extends React.Component<ToolbarProps, ToolbarState> {
  containerRef: React.RefObject<HTMLDivElement>;
  barRef: React.RefObject<HTMLDivElement>;
  leftRef: React.RefObject<HTMLDivElement>;
  rightRef: React.RefObject<HTMLDivElement>;
  centerRef: React.RefObject<HTMLDivElement>;

  constructor(props: ToolbarProps) {
    super(props);
    this.state = {
      scrollMode: false,
      scrollBtnLeft: false,
      scrollBtnRight: false,
    };
    this.containerRef = React.createRef();
    this.barRef = React.createRef();
    this.leftRef = React.createRef();
    this.rightRef = React.createRef();
    this.centerRef = React.createRef();

    window.addEventListener("resize", this.checkSize);
    this.checkSize();
  }

  checkSize = debounce((): void => {
    const { leftRef, centerRef, rightRef, barRef } = this;
    if (!leftRef.current || !centerRef.current || !rightRef.current || !barRef.current) {
      return;
    }
    const leftRect = leftRef.current.getBoundingClientRect();
    const centerRect = centerRef.current.getBoundingClientRect();
    const rightRect = rightRef.current.getBoundingClientRect();

    // when calculating width required to leave scroll mode, add a bit of extra width to ensure that triggers
    // for entering and leaving scroll mode never overlap (causing toolbar to rapidly switch when resizing)
    const SCROLL_OFF_EXTRA_WIDTH = 15;

    if (this.state.scrollMode) {
      // Leave scroll mode if there is enough space for centered controls not to overlap left/right-aligned ones
      const barWidth = barRef.current!.getBoundingClientRect().width;
      const requiredWidth = Math.max(leftRect.width, rightRect.width) * 2 + centerRect.width + SCROLL_OFF_EXTRA_WIDTH;
      if (barWidth > requiredWidth) {
        this.setState({ scrollMode: false });
      }
    } else {
      // Enter scroll mode if centered controls are overlapping either left/right-aligned ones
      if (leftRect.right > centerRect.left || centerRect.right > rightRect.left) {
        this.setState({ scrollMode: true });
      }
    }
    this.checkScrollBtnVisible();
  }, RESIZE_DEBOUNCE_DELAY);

  scrollX = (amount: number): number => (this.barRef.current!.scrollLeft += amount);

  // Translate vertical scrolling into horizontal scrolling
  wheelHandler: React.WheelEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    if (e.deltaY === 0) {
      return;
    }
    this.scrollX(e.deltaY);
  };

  // Scroll buttons are only visible when toolbar can be scrolled in that direction.
  // This may change on either scroll or resize.
  checkScrollBtnVisible = (): void => {
    const barEl = this.barRef.current;
    if (!barEl) {
      return;
    }
    const scrollBtnLeft = barEl.scrollLeft > 0;
    const scrollBtnRight = barEl.scrollLeft < barEl.scrollWidth - barEl.clientWidth;
    if (scrollBtnLeft !== this.state.scrollBtnLeft || scrollBtnRight !== this.state.scrollBtnRight) {
      this.setState({ scrollBtnLeft, scrollBtnRight });
    }
  };

  toggleAxis = (): void => this.props.changeViewerSetting("showAxes", !this.props.showAxes);
  toggleBoundingBox = (): void => this.props.changeViewerSetting("showBoundingBox", !this.props.showBoundingBox);
  // TODO remove ant-btn-icon-only hack when upgrading antd
  classForToggleBtn = (active: boolean): string => "ant-btn-icon-only btn-borderless" + (active ? " btn-active" : "");

  render(): React.ReactElement {
    const { props } = this;
    const { changeViewerSetting, resetToSavedViewerState, visibleControls, showAxes, showBoundingBox, autorotate } =
      props;
    const { scrollMode, scrollBtnLeft, scrollBtnRight } = this.state;
    const twoDMode = props.viewMode !== ViewMode.threeD;

    const renderGroup1 =
      visibleControls.viewModeRadioButtons || visibleControls.resetCameraButton || visibleControls.autoRotateButton;
    const renderGroup4 = visibleControls.showAxesButton || visibleControls.showBoundingBoxButton;

    const axesToggleTitle = showAxes ? "Hide axes" : "Show axes";
    const boundingBoxToggleTitle = showBoundingBox ? "Hide bounding box" : "Show bounding box";
    const turntableToggleTitle = autorotate ? "Turn off turntable" : "Turn on turntable";

    const getPopupContainer = this.containerRef.current ? () => this.containerRef.current! : undefined;

    return (
      <div className={`viewer-toolbar-container${scrollMode ? " viewer-toolbar-scroll" : ""}`} ref={this.containerRef}>
        <div
          className="viewer-toolbar-scroll-left"
          style={{ display: scrollBtnLeft ? "flex" : "none" }}
          onClick={() => this.scrollX(-100)}
        >
          <ViewerIcon type="closePanel" style={{ fontSize: "12px", transform: "rotate(180deg)" }} />
        </div>
        <div
          className="viewer-toolbar"
          ref={this.barRef}
          onWheel={this.wheelHandler}
          onScroll={this.checkScrollBtnVisible}
        >
          <div className="viewer-toolbar-left" ref={this.leftRef}>
            <Tooltip placement="bottom" title="Reset to initial settings" trigger={["focus", "hover"]}>
              <Button className="ant-btn-icon-only btn-borderless" onClick={resetToSavedViewerState}>
                <UndoOutlined />
                <VisuallyHidden>Reset to initial settings</VisuallyHidden>
              </Button>
            </Tooltip>
          </div>
          <div className="viewer-toolbar-center" ref={this.centerRef}>
            {renderGroup1 && (
              <div className="viewer-toolbar-group">
                {visibleControls.viewModeRadioButtons && (
                  <ViewModeRadioButtons
                    mode={props.viewMode}
                    onViewModeChange={(newMode) => changeViewerSetting("viewMode", newMode)}
                  />
                )}
                {visibleControls.resetCameraButton && (
                  <Tooltip placement="bottom" title="Reset camera">
                    <Button className="ant-btn-icon-only btn-borderless" onClick={props.resetCamera}>
                      <ViewerIcon type="resetView" />
                    </Button>
                  </Tooltip>
                )}
                {visibleControls.autoRotateButton && (
                  <Tooltip placement="bottom" title={turntableToggleTitle}>
                    <Button
                      className={this.classForToggleBtn(autorotate && !twoDMode)}
                      disabled={twoDMode || props.renderMode === RenderMode.pathTrace}
                      onClick={() => changeViewerSetting("autorotate", !autorotate)}
                    >
                      <ViewerIcon type="turnTable" />
                    </Button>
                  </Tooltip>
                )}
              </div>
            )}

            {visibleControls.fovCellSwitchControls && props.hasCellId && props.hasParentImage && (
              <div className="viewer-toolbar-group">
                <Radio.Group
                  value={props.imageType}
                  onChange={({ target }) => changeViewerSetting("imageType", target.value)}
                >
                  <Radio.Button value={ImageType.segmentedCell}>Single cell</Radio.Button>
                  <Radio.Button value={ImageType.fullField}>Full field</Radio.Button>
                </Radio.Group>
              </div>
            )}

            <div className="viewer-toolbar-group">
              <Select
                className="select-render-setting"
                popupClassName="viewer-toolbar-dropdown"
                value={props.renderMode}
                onChange={(value) => changeViewerSetting("renderMode", value)}
                getPopupContainer={getPopupContainer}
              >
                <Select.Option value={RenderMode.volumetric} key={RenderMode.volumetric}>
                  Volumetric
                </Select.Option>
                {props.canPathTrace && (
                  <Select.Option value={RenderMode.pathTrace} key={RenderMode.pathTrace} disabled={twoDMode}>
                    Path trace
                  </Select.Option>
                )}
                <Select.Option value={RenderMode.maxProject} key={RenderMode.maxProject}>
                  Max project
                </Select.Option>
              </Select>
            </div>

            {renderGroup4 && (
              <div className="viewer-toolbar-group">
                {visibleControls.showAxesButton && (
                  <Tooltip placement="bottom" title={axesToggleTitle}>
                    <Button className={this.classForToggleBtn(showAxes)} onClick={this.toggleAxis}>
                      <ViewerIcon type="axes" />
                    </Button>
                  </Tooltip>
                )}
                {visibleControls.showBoundingBoxButton && (
                  <Tooltip placement="bottom" title={boundingBoxToggleTitle}>
                    <Button className={this.classForToggleBtn(showBoundingBox)} onClick={this.toggleBoundingBox}>
                      <ViewerIcon type="boundingBox" />
                    </Button>
                  </Tooltip>
                )}
              </div>
            )}
          </div>

          <div className="viewer-toolbar-right viewer-toolbar-group" ref={this.rightRef}>
            <Tooltip placement="bottom" title="Download">
              <DownloadButton
                cellDownloadHref={props.cellDownloadHref}
                fovDownloadHref={props.fovDownloadHref}
                hasFov={props.hasCellId && props.hasParentImage}
              />
            </Tooltip>
            <Tooltip placement="bottom" title="Screenshot">
              <Button className="ant-btn-icon-only btn-borderless" onClick={props.downloadScreenshot}>
                <ViewerIcon type="camera" />
              </Button>
            </Tooltip>
          </div>
        </div>
        <div
          className="viewer-toolbar-scroll-right"
          style={{ display: scrollBtnRight ? "flex" : "none" }}
          onClick={() => this.scrollX(100)}
        >
          <ViewerIcon type="closePanel" style={{ fontSize: "12px" }} />
        </div>
      </div>
    );
  }
}

export default connectToViewerState(Toolbar, [
  "imageType",
  "renderMode",
  "viewMode",
  "autorotate",
  "showAxes",
  "showBoundingBox",
  "changeViewerSetting",
  "resetToSavedViewerState",
]);
