import React from "react";
import { Button, Radio, Select, Tooltip } from "antd";
import "./styles.css";

import ViewModeRadioButtons from "./ViewModeRadioButtons";
import DownloadButton from "./DownloadButton";

import { ImageType, RenderMode, ViewMode } from "../../shared/enums";
import ViewerIcon from "../shared/ViewerIcon";

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
  transformEnabled: boolean;

  onViewModeChange: (mode: ViewMode) => void;
  onResetCamera: () => void;
  onAutorotateChange: () => void;
  downloadScreenshot: () => void;
  onSwitchFovCell: (value: ImageType) => void;
  onChangeRenderingAlgorithm: (newAlgorithm: RenderMode) => void;
  changeAxisShowing: (showing: boolean) => void;
  changeBoundingBoxShowing: (showing: boolean) => void;
  changeTransformEnabled: (enabled: boolean) => void;

  renderConfig: {
    autoRotateButton: boolean;
    viewModeRadioButtons: boolean;
    fovCellSwitchControls: boolean;
    resetCameraButton: boolean;
    showAxesButton: boolean;
    showBoundingBoxButton: boolean;
    showTransformButton?: boolean;
  };
}

export default function Toolbar(props: ToolbarProps): React.ReactElement {
  const { renderConfig, showAxes, showBoundingBox, transformEnabled } = props;

  const twoDMode = props.mode !== ViewMode.threeD;

  const renderGroup1 =
    renderConfig.viewModeRadioButtons || renderConfig.resetCameraButton || renderConfig.autoRotateButton;
  const renderGroup4 = renderConfig.showAxesButton || renderConfig.showBoundingBoxButton;

  const toggleAxis = (): void => props.changeAxisShowing(!props.showAxes);
  const toggleBoundingBox = (): void => props.changeBoundingBoxShowing(!props.showBoundingBox);
  const toggleTransform = (): void => props.changeTransformEnabled(!props.transformEnabled);

  // TODO remove ant-btn-icon-only hack when upgrading antd
  const classForToggleBtn = (active: boolean): string =>
    "ant-btn-icon-only btn-borderless" + (active ? " btn-active" : "");

  return (
    <div className="viewer-toolbar">
      <span className="viewer-toolbar-center">
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
              <Tooltip placement="bottom" title="Turntable">
                <Button
                  className={classForToggleBtn(props.autorotate && !twoDMode)}
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
              <Tooltip placement="bottom" title={showAxes ? "Hide axes" : "Show axes"}>
                <Button className={classForToggleBtn(showAxes)} onClick={toggleAxis}>
                  <ViewerIcon type="axes" />
                </Button>
              </Tooltip>
            )}
            {renderConfig.showBoundingBoxButton && (
              <Tooltip placement="bottom" title={showBoundingBox ? "Hide bounding box" : "Show bounding box"}>
                <Button className={classForToggleBtn(showBoundingBox)} onClick={toggleBoundingBox}>
                  <ViewerIcon type="boundingBox" />
                </Button>
              </Tooltip>
            )}
          </span>
        )}
        {renderConfig.showTransformButton && (
          <Button className={classForToggleBtn(transformEnabled)} onClick={toggleTransform}>
            A
          </Button>
        )}
      </span>

      <span className="viewer-toolbar-right viewer-toolbar-group">
        <DownloadButton
          cellDownloadHref={props.cellDownloadHref}
          fovDownloadHref={props.fovDownloadHref}
          hasFov={props.hasCellId && props.hasParentImage}
        />
        <Button icon="camera" className="btn-borderless" onClick={props.downloadScreenshot} />
      </span>
    </div>
  );
}
