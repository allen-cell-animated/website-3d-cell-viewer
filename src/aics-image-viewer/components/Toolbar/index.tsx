import React from "react";
import { Button, Dropdown, Icon, Menu, Radio, Select } from "antd";
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

interface DownloadButtonProps {
  fovDownloadHref: string;
  cellDownloadHref: string;
  hasCellId: boolean;
  hasParentImage: boolean;
}

interface ToolbarProps extends DownloadButtonProps {
  imageName: string;
  imageType: string;
  renderSetting: string;
  mode: symbol;
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

function DownloadButton({ fovDownloadHref, cellDownloadHref, hasCellId, hasParentImage }: DownloadButtonProps) {
  if (hasCellId && hasParentImage) {
    const menu = (
      <Menu className="download-dropdown">
        <Menu.Item key="1">
          <a href={cellDownloadHref}>
            <Icon type="download" /> Segmented cell
          </a>
        </Menu.Item>
        <Menu.Item key="2">
          <a href={fovDownloadHref}>
            <Icon type="download" /> Full field image
          </a>
        </Menu.Item>
      </Menu>
    );
    return (
      <Dropdown overlay={menu} placement="bottomRight" trigger={["click"]}>
        <Button className="btn-borderless" icon="download" />
      </Dropdown>
    );
  } else {
    return <Button className="btn-borderless" icon="download" href={cellDownloadHref} />;
  }
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
      <span className="toolbar-center">
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
              <Button
                icon={autorotateIcon}
                disabled={twoDMode || props.pathTraceOn}
                onClick={props.onAutorotateChange}
              />
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
              <Button icon="drag" className="btn-borderless" onClick={toggleAxisShowing} />
            )}
            {renderConfig.showBoundingBoxButton && (
              <Button icon="close-square" className="btn-borderless" onClick={toggleBoundingBoxShowing} />
            )}
          </span>
        )}
      </span>

      <span className="toolbar-right">
        <DownloadButton
          fovDownloadHref={props.fovDownloadHref}
          cellDownloadHref={props.cellDownloadHref}
          hasCellId={props.hasCellId}
          hasParentImage={props.hasParentImage}
        />
      </span>
    </div>
  );
}
