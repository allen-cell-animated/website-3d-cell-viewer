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

export default function Toolbar(props: ToolbarProps): React.ReactElement {
  const { renderConfig, showAxes, showBoundingBox, autorotate } = props;

  // Track if centered buttons overlap left or right buttons... with lots of refs
  const [scrollMode, _setScrollMode] = React.useState(false);
  const scrollModeRef = React.useRef(scrollMode);
  const setScrollMode = (mode: boolean): void => {
    scrollModeRef.current = mode;
    _setScrollMode(mode);
  };

  const barRef = React.useRef<HTMLDivElement>(null);
  const leftRef = React.useRef<HTMLSpanElement>(null);
  const centerRef = React.useRef<HTMLSpanElement>(null);
  const rightRef = React.useRef<HTMLSpanElement>(null);

  const checkSize = debounce((): void => {
    const leftRect = leftRef.current!.getBoundingClientRect();
    const centerRect = centerRef.current!.getBoundingClientRect();
    const rightRect = rightRef.current!.getBoundingClientRect();
    if (scrollModeRef.current) {
      const barWidth = barRef.current!.getBoundingClientRect().width;
      const requiredWidth = Math.max(leftRect.width, rightRect.width) * 2 + centerRect.width + 30;
      if (barWidth > requiredWidth) {
        setScrollMode(false);
      }
    } else {
      if (leftRect.right > centerRect.left || centerRect.right > rightRect.left) {
        setScrollMode(true);
      }
    }
  }, 50);

  React.useEffect((): void => {
    window.addEventListener("resize", checkSize);
    checkSize();
  }, []); // Dependency-free effect will only run on mount

  const scrollX = (amount: number): number => (barRef.current!.scrollLeft += amount);
  // Translate vertical scrolling into horizontal scrolling
  const scrollHandler: WheelEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    if (e.deltaY === 0) {
      return;
    }
    scrollX(e.deltaY);
  };

  const twoDMode = props.mode !== ViewMode.threeD;

  const renderGroup1 =
    renderConfig.viewModeRadioButtons || renderConfig.resetCameraButton || renderConfig.autoRotateButton;
  const renderGroup4 = renderConfig.showAxesButton || renderConfig.showBoundingBoxButton;

  const toggleAxis = (): void => props.changeAxisShowing(!props.showAxes);
  const toggleBoundingBox = (): void => props.changeBoundingBoxShowing(!props.showBoundingBox);
  const axesToggleTitle = showAxes ? "Hide axes" : "Show axes";
  const boundingBoxToggleTitle = showBoundingBox ? "Hide bounding box" : "Show bounding box";
  const turntableToggleTitle = autorotate ? "Turn off turntable" : "Turn on turntable";

  // TODO remove ant-btn-icon-only hack when upgrading antd
  const classForToggleBtn = (active: boolean): string =>
    "ant-btn-icon-only btn-borderless" + (active ? " btn-active" : "");

  return (
    <div className={`viewer-toolbar-container${scrollMode ? " viewer-toolbar-scroll" : ""}`}>
      <div className="viewer-toolbar-scroll-btn scroll-btn-left" onClick={() => scrollX(-100)}>
        <ViewerIcon type="closePanel" style={{ fontSize: "12px", transform: "rotate(180deg)" }} />
      </div>
      <div className="viewer-toolbar" ref={barRef} onWheel={scrollHandler}>
        <span className="viewer-toolbar-left" ref={leftRef} />
        <span className="viewer-toolbar-center" ref={centerRef}>
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
                    className={classForToggleBtn(autorotate && !twoDMode)}
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
                  <Button className={classForToggleBtn(showAxes)} onClick={toggleAxis}>
                    <ViewerIcon type="axes" />
                  </Button>
                </Tooltip>
              )}
              {renderConfig.showBoundingBoxButton && (
                <Tooltip placement="bottom" title={boundingBoxToggleTitle}>
                  <Button className={classForToggleBtn(showBoundingBox)} onClick={toggleBoundingBox}>
                    <ViewerIcon type="boundingBox" />
                  </Button>
                </Tooltip>
              )}
            </span>
          )}
        </span>

        <span className="viewer-toolbar-right viewer-toolbar-group" ref={rightRef}>
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
      <div className="viewer-toolbar-scroll-btn scroll-btn-right" onClick={() => scrollX(100)}>
        <ViewerIcon type="closePanel" style={{ fontSize: "12px" }} />
      </div>
    </div>
  );
}
