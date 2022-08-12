import React from "react";
import { Button, Radio, Select } from "antd";
import "./styles.css";

import ViewModeRadioButtons from "../ViewModeRadioButtons";

// TODO use ts enum
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
  imageName: string;
  mode: symbol;
  autorotate: boolean;
  pathTraceOn: boolean;
  imageType: string;
  hasParentImage: boolean;
  hasCellId: boolean;
  canPathTrace: boolean;
  renderSetting: string;
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
  const { renderConfig } = props;

  const twoDMode = viewMode.VIEW_MODE_ENUM_TO_LABEL_MAP.get(props.mode) !== THREE_D_MODE;
  const autorotateIcon = props.autorotate ? "pause-circle" : "play-circle";

  const renderGroup1 =
    renderConfig.viewModeRadioButtons || renderConfig.resetCameraButton || renderConfig.autoRotateButton;
  const renderGroup4 = renderConfig.showAxesButton || renderConfig.showBoundingBoxButton;

  const toggleAxisShowing = () => props.changeAxisShowing(!props.showAxes);
  const toggleBoundingBoxShowing = () => props.changeBoundingBoxShowing(!props.showBoundingBox);

  return (
    <div className="toolbar">
      {renderGroup1 && (
        <span className="toolbar-group">
          {renderConfig.viewModeRadioButtons && (
            <ViewModeRadioButtons
              imageName={props.imageName}
              mode={props.mode}
              onViewModeChange={props.onViewModeChange}
            />
          )}
          {renderConfig.resetCameraButton && (
            <Button icon="reload" className="btn-borderless" onClick={props.onResetCamera} />
          )}
          {renderConfig.autoRotateButton && (
            <Button icon={autorotateIcon} disabled={twoDMode || props.pathTraceOn} onClick={props.onAutorotateChange} />
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
        <Select value={props.renderSetting} onChange={(alg) => props.onChangeRenderingAlgorithm(alg)}>
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
          {renderConfig.showAxesButton && <Button icon="drag" className="btn-borderless" onClick={toggleAxisShowing} />}
          {renderConfig.showBoundingBoxButton && (
            <Button icon="close-square" className="btn-borderless" onClick={toggleBoundingBoxShowing} />
          )}
        </span>
      )}
    </div>
  );
}
