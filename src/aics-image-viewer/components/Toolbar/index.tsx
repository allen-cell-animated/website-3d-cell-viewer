import React, { WheelEventHandler } from "react";
import { Button, Radio, Select, Tooltip } from "antd";
import { debounce } from "lodash";

import ViewModeRadioButtons from "./ViewModeRadioButtons";
import DownloadButton from "./DownloadButton";

import { ImageType, RenderMode, ViewMode } from "../../shared/enums";
import ViewerIcon from "../shared/ViewerIcon";
import "./styles.css";

interface ToolbarProps {
  imageType: ImageType;
  renderSetting: RenderMode;
  cellDownloadHref: string;
  fovDownloadHref: string;
  mode: ViewMode;
  hasCellId: boolean;
  hasParentImage: boolean;
  autorotate: boolean;
  pathTraceOn: boolean;
  canPathTrace: boolean;
  showAxes: boolean;
  showBoundingBox: boolean;

  onViewModeChange: (mode: ViewMode) => void;
  onResetCamera: () => void;
  onAutorotateChange: () => void;
  downloadScreenshot: () => void;
  onSwitchFovCell: (value: ImageType) => void;
  onChangeRenderingAlgorithm: (newAlgorithm: RenderMode) => void;
  changeAxisShowing: (showing: boolean) => void;
  changeBoundingBoxShowing: (showing: boolean) => void;

  renderConfig: {
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
    const leftRect = leftRef.current!.getBoundingClientRect();
    const centerRect = centerRef.current!.getBoundingClientRect();
    const rightRect = rightRef.current!.getBoundingClientRect();

    if (this.state.scrollMode) {
      // Leave scroll mode if there is enough space for centered controls not to overlap left/right-aligned ones
      const barWidth = barRef.current!.getBoundingClientRect().width;
      const requiredWidth = Math.max(leftRect.width, rightRect.width) * 2 + centerRect.width + 30;
      if (barWidth > requiredWidth) {
        this.setState({ scrollMode: false });
      } else {
        this.checkScrollBtnVisible();
      }
    } else {
      // Enter scroll mode if centered controls are overlapping either left/right-aligned ones
      if (leftRect.right > centerRect.left || centerRect.right > rightRect.left) {
        this.setState({ scrollMode: true });
        this.checkScrollBtnVisible();
      }
    }
  }, 50);

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

  toggleAxis = (): void => this.props.changeAxisShowing(!this.props.showAxes);
  toggleBoundingBox = (): void => this.props.changeBoundingBoxShowing(!this.props.showBoundingBox);
  // TODO remove ant-btn-icon-only hack when upgrading antd
  classForToggleBtn = (active: boolean): string => "ant-btn-icon-only btn-borderless" + (active ? " btn-active" : "");

  render() {
    const { props } = this;
    const { renderConfig, showAxes, showBoundingBox, autorotate } = props;
    const { scrollMode, scrollBtnLeft, scrollBtnRight } = this.state;
    const twoDMode = props.mode !== ViewMode.threeD;

    const renderGroup1 =
      renderConfig.viewModeRadioButtons || renderConfig.resetCameraButton || renderConfig.autoRotateButton;
    const renderGroup4 = renderConfig.showAxesButton || renderConfig.showBoundingBoxButton;

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
          <span className="viewer-toolbar-left" ref={this.leftRef} />
          <span className="viewer-toolbar-center" ref={this.centerRef}>
            {renderGroup1 && (
              <span className="viewer-toolbar-group">
                {renderConfig.viewModeRadioButtons && (
                  <ViewModeRadioButtons mode={props.mode} onViewModeChange={props.onViewModeChange} />
                )}
                {renderConfig.resetCameraButton && (
                  <Tooltip placement="bottom" title="Reset camera">
                    <Button className="ant-btn-icon-only btn-borderless" onClick={props.onResetCamera}>
                      <ViewerIcon type="resetView" />
                    </Button>
                  </Tooltip>
                )}
                {renderConfig.autoRotateButton && (
                  <Tooltip placement="bottom" title={turntableToggleTitle}>
                    <Button
                      className={this.classForToggleBtn(autorotate && !twoDMode)}
                      disabled={twoDMode || props.pathTraceOn}
                      onClick={props.onAutorotateChange}
                    >
                      <ViewerIcon type="turnTable" />
                    </Button>
                  </Tooltip>
                )}
              </span>
            )}

            {renderConfig.fovCellSwitchControls && props.hasCellId && props.hasParentImage && (
              <span className="viewer-toolbar-group">
                <Radio.Group value={props.imageType} onChange={({ target }) => props.onSwitchFovCell(target.value)}>
                  <Radio.Button value={ImageType.segmentedCell}>Single cell</Radio.Button>
                  <Radio.Button value={ImageType.fullField}>Full field</Radio.Button>
                </Radio.Group>
              </span>
            )}

            <span className="viewer-toolbar-group">
              <Select
                className="select-render-setting"
                dropdownClassName="viewer-toolbar-dropdown"
                value={props.renderSetting}
                onChange={props.onChangeRenderingAlgorithm}
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
                {renderConfig.showAxesButton && (
                  <Tooltip placement="bottom" title={axesToggleTitle}>
                    <Button className={this.classForToggleBtn(showAxes)} onClick={this.toggleAxis}>
                      <ViewerIcon type="axes" />
                    </Button>
                  </Tooltip>
                )}
                {renderConfig.showBoundingBoxButton && (
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
              <Button icon="camera" className="btn-borderless" onClick={props.downloadScreenshot} />
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
