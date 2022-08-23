import React from "react";
import { Button, Radio, Select, Tooltip } from "antd";
import "./styles.css";

import ViewModeRadioButtons from "./ViewModeRadioButtons";
import DownloadButton from "./DownloadButton";

import viewMode from "../../shared/enums/viewMode";
import {
  FULL_FIELD_IMAGE,
  MAX_PROJECT,
  PATH_TRACE,
  SEGMENTED_CELL,
  THREE_D_MODE,
  VOLUMETRIC_RENDER,
} from "../../shared/constants";

interface ToolbarProps {
  imageType: string;
  renderSetting: string;
  cellDownloadHref: string;
  fovDownloadHref: string;
  mode: symbol;
  hasCellId: boolean;
  hasParentImage: boolean;
  autorotate: boolean;
  pathTraceOn: boolean;
  canPathTrace: boolean;
  showAxes: boolean;
  showBoundingBox: boolean;

  onViewModeChange(mode: symbol): void;
  onResetCamera(): void;
  onAutorotateChange(): void;
  onSwitchFovCell(value: string): void;
  onChangeRenderingAlgorithm(newAlgorithm: string): void;
  changeAxisShowing(showing: boolean): void;
  changeBoundingBoxShowing(showing: boolean): void;

  renderConfig: {
    autoRotateButton: boolean;
    viewModeRadioButtons: boolean;
    fovCellSwitchControls: boolean;
    resetCameraButton: boolean;
    showAxesButton: boolean;
    showBoundingBoxButton: boolean;
  };
}

export default function Toolbar(props: ToolbarProps) {
  const { renderConfig, showAxes, showBoundingBox } = props;

  const twoDMode = viewMode.VIEW_MODE_ENUM_TO_LABEL_MAP.get(props.mode) !== THREE_D_MODE;
  const autorotateIcon = props.autorotate && !twoDMode ? "pause-circle" : "play-circle";

  const renderGroup1 =
    renderConfig.viewModeRadioButtons || renderConfig.resetCameraButton || renderConfig.autoRotateButton;
  const renderGroup4 = renderConfig.showAxesButton || renderConfig.showBoundingBoxButton;

  const toggleAxis = () => props.changeAxisShowing(!props.showAxes);
  const toggleBoundingBox = () => props.changeBoundingBoxShowing(!props.showBoundingBox);

  return (
    <div className="toolbar">
      <span className="toolbar-center">
        {renderGroup1 && (
          <span className="toolbar-group">
            {renderConfig.viewModeRadioButtons && (
              <ViewModeRadioButtons mode={props.mode} onViewModeChange={props.onViewModeChange} />
            )}
            {renderConfig.resetCameraButton && (
              <Tooltip placement="bottom" title="Reset camera">
                <Button icon="reload" className="btn-borderless" onClick={props.onResetCamera} />
              </Tooltip>
            )}
            {renderConfig.autoRotateButton && (
              <Tooltip placement="bottom" title="Turntable">
                <Button
                  icon={autorotateIcon}
                  disabled={twoDMode || props.pathTraceOn}
                  onClick={props.onAutorotateChange}
                />
              </Tooltip>
            )}
          </span>
        )}

        {renderConfig.fovCellSwitchControls && props.hasCellId && props.hasParentImage && (
          <span className="toolbar-group">
            <Radio.Group value={props.imageType} onChange={({ target }) => props.onSwitchFovCell(target.value)}>
              <Radio.Button value={SEGMENTED_CELL}>Single cell</Radio.Button>
              <Radio.Button value={FULL_FIELD_IMAGE}>Full field</Radio.Button>
            </Radio.Group>
          </span>
        )}

        <span className="toolbar-group">
          <Select
            className="select-render-setting"
            value={props.renderSetting}
            onChange={props.onChangeRenderingAlgorithm}
          >
            <Select.Option value={VOLUMETRIC_RENDER} key={VOLUMETRIC_RENDER}>
              Volumetric
            </Select.Option>
            {props.canPathTrace && (
              <Select.Option value={PATH_TRACE} key={PATH_TRACE} disabled={props.mode !== viewMode.mainMapping.threeD}>
                Path trace
              </Select.Option>
            )}
            <Select.Option value={MAX_PROJECT} key={MAX_PROJECT}>
              Max project
            </Select.Option>
          </Select>
        </span>

        {renderGroup4 && (
          <span className="toolbar-group">
            {renderConfig.showAxesButton && (
              <Tooltip placement="bottom" title={showAxes ? "Hide axes" : "Show axes"}>
                <Button icon="drag" className={showAxes ? "" : "btn-borderless"} onClick={toggleAxis} />
              </Tooltip>
            )}
            {renderConfig.showBoundingBoxButton && (
              <Tooltip placement="bottom" title={showBoundingBox ? "Hide bounding box" : "Show bounding box"}>
                <Button
                  icon="close-square"
                  className={showBoundingBox ? "" : "btn-borderless"}
                  onClick={toggleBoundingBox}
                />
              </Tooltip>
            )}
          </span>
        )}
      </span>

      <span className="toolbar-right">
        <DownloadButton
          cellDownloadHref={props.cellDownloadHref}
          fovDownloadHref={props.fovDownloadHref}
          hasFov={props.hasCellId && props.hasParentImage}
        />
      </span>
    </div>
  );
}
