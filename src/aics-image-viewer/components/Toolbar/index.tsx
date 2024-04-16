import React from "react";
import { Button, Radio, Select, Tooltip } from "antd";
import { debounce } from "lodash";

import ViewModeRadioButtons from "./ViewModeRadioButtons";
import DownloadButton from "./DownloadButton";

import { ViewerSettingUpdater } from "../App/types";
import { ImageType, RenderMode, ViewMode } from "../../shared/enums";
import ViewerIcon from "../shared/ViewerIcon";
import "./styles.css";

interface ToolbarProps {
  imageType: ImageType;
  renderMode: RenderMode;
  cellDownloadHref: string;
  fovDownloadHref: string;
  viewMode: ViewMode;
  hasCellId: boolean;
  hasParentImage: boolean;
  autorotate: boolean;
  canPathTrace: boolean;
  showAxes: boolean;
  showBoundingBox: boolean;

  changeViewerSetting: ViewerSettingUpdater;
  resetCamera: () => void;
  downloadScreenshot: () => void;

  showControls: {
    autoRotateButton: boolean;
    viewModeRadioButtons: boolean;
    fovCellSwitchControls: boolean;
    resetCameraButton: boolean;
    showAxesButton: boolean;
    showBoundingBoxButton: boolean;
  };
}

interface ToolbarState {
  scrollMode: boolean;
  scrollBtnLeft: boolean;
  scrollBtnRight: boolean;
}

const RESIZE_DEBOUNCE_DELAY = 50;

export default class Toolbar extends React.Component<ToolbarProps, ToolbarState> {
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
    const { changeViewerSetting, showControls, showAxes, showBoundingBox, autorotate } = props;
    const { scrollMode, scrollBtnLeft, scrollBtnRight } = this.state;
    const twoDMode = props.viewMode !== ViewMode.threeD;

    const renderGroup1 =
      showControls.viewModeRadioButtons || showControls.resetCameraButton || showControls.autoRotateButton;
    const renderGroup4 = showControls.showAxesButton || showControls.showBoundingBoxButton;

    const axesToggleTitle = showAxes ? "Hide axes" : "Show axes";
    const boundingBoxToggleTitle = showBoundingBox ? "Hide bounding box" : "Show bounding box";
    const turntableToggleTitle = autorotate ? "Turn off turntable" : "Turn on turntable";

    return (
      <div className={`viewer-toolbar-container${scrollMode ? " viewer-toolbar-scroll" : ""}`}>
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
          <span className="viewer-toolbar-left" ref={this.leftRef}></span>
          <span className="viewer-toolbar-center" ref={this.centerRef}>
            {renderGroup1 && (
              <span className="viewer-toolbar-group">
                {showControls.viewModeRadioButtons && (
                  <ViewModeRadioButtons
                    mode={props.viewMode}
                    onViewModeChange={(newMode) => changeViewerSetting("viewMode", newMode)}
                  />
                )}
                {showControls.resetCameraButton && (
                  <Tooltip placement="bottom" title="Reset camera">
                    <Button className="ant-btn-icon-only btn-borderless" onClick={props.resetCamera}>
                      <ViewerIcon type="resetView" />
                    </Button>
                  </Tooltip>
                )}
                {showControls.autoRotateButton && (
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
              </span>
            )}

            {showControls.fovCellSwitchControls && props.hasCellId && props.hasParentImage && (
              <span className="viewer-toolbar-group">
                <Radio.Group
                  value={props.imageType}
                  onChange={({ target }) => changeViewerSetting("imageType", target.value)}
                >
                  <Radio.Button value={ImageType.segmentedCell}>Single cell</Radio.Button>
                  <Radio.Button value={ImageType.fullField}>Full field</Radio.Button>
                </Radio.Group>
              </span>
            )}

            <span className="viewer-toolbar-group">
              <Select
                className="select-render-setting"
                popupClassName="viewer-toolbar-dropdown"
                value={props.renderMode}
                onChange={(value) => changeViewerSetting("renderMode", value)}
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
            </span>

            {renderGroup4 && (
              <span className="viewer-toolbar-group">
                {showControls.showAxesButton && (
                  <Tooltip placement="bottom" title={axesToggleTitle}>
                    <Button className={this.classForToggleBtn(showAxes)} onClick={this.toggleAxis}>
                      <ViewerIcon type="axes" />
                    </Button>
                  </Tooltip>
                )}
                {showControls.showBoundingBoxButton && (
                  <Tooltip placement="bottom" title={boundingBoxToggleTitle}>
                    <Button className={this.classForToggleBtn(showBoundingBox)} onClick={this.toggleBoundingBox}>
                      <ViewerIcon type="boundingBox" />
                    </Button>
                  </Tooltip>
                )}
              </span>
            )}
          </span>

          <span className="viewer-toolbar-right viewer-toolbar-group" ref={this.rightRef}>
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
          </span>
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
