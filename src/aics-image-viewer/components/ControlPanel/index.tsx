import React from "react";

import { Button, Dropdown, Tooltip, MenuProps, Collapse, CollapseProps } from "antd";
import { MenuInfo } from "rc-menu/lib/interface";

import ChannelsWidget from "../ChannelsWidget";
import GlobalVolumeControls, { GlobalVolumeControlsProps } from "../GlobalVolumeControls";
import CustomizeWidget, { CustomizeWidgetProps } from "../CustomizeWidget";
import MetadataViewer from "../MetadataViewer";

import { PRESET_COLOR_MAP } from "../../shared/constants";

import "./styles.css";
import ViewerIcon from "../shared/ViewerIcon";
import { MetadataRecord } from "../../shared/types";

type PropsOf<T> = T extends React.ComponentType<infer P> ? P : never;

interface ControlPanelProps
  extends PropsOf<typeof ChannelsWidget>,
    PropsOf<typeof GlobalVolumeControls>,
    PropsOf<typeof CustomizeWidget> {
  hasImage: boolean;
  visibleControls: GlobalVolumeControlsProps["visibleControls"] &
    CustomizeWidgetProps["visibleControls"] & {
      colorPresetsDropdown: boolean;
      metadataViewer: boolean;
    };
  getMetadata: () => MetadataRecord;
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
}

const enum ControlTab {
  Channels,
  Advanced,
  Metadata,
}

const ControlTabNames = {
  [ControlTab.Channels]: "Channel Settings",
  [ControlTab.Advanced]: "Advanced Settings",
  [ControlTab.Metadata]: "Metadata",
};

function ControlPanel(props: ControlPanelProps): React.ReactElement {
  const [tab, setTab] = React.useState(ControlTab.Channels);

  const controlPanelContainerRef = React.useRef<HTMLDivElement>(null);
  const getDropdownContainer = controlPanelContainerRef.current ? () => controlPanelContainerRef.current! : undefined;

  const { viewerChannelSettings, visibleControls, hasImage } = props;

  // TODO key is a number, but MenuInfo assumes keys will always be strings
  //   if future versions of antd make this type more permissive, remove ugly double-cast
  const makeTurnOnPresetFn = ({ key }: MenuInfo): void =>
    props.onApplyColorPresets(PRESET_COLOR_MAP[key as unknown as number].colors);

  const renderColorPresetsDropdown = (): React.ReactNode => {
    const dropDownMenuProps: MenuProps = {
      items: PRESET_COLOR_MAP.map((preset, index) => {
        return { key: index, label: preset.name };
      }),
      onClick: makeTurnOnPresetFn,
    };
    return (
      <div className="color-presets-dropdown">
        <Dropdown trigger={["click"]} menu={dropDownMenuProps} getPopupContainer={getDropdownContainer}>
          <Button>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "4px" }}>
              Apply palette
              <ViewerIcon type="dropdownArrow" style={{ fontSize: "14px" }} />
            </div>
          </Button>
        </Dropdown>
      </div>
    );
  };

  const renderTab = (thisTab: ControlTab, icon: React.ReactNode): React.ReactNode => (
    <Tooltip title={ControlTabNames[thisTab]} placement="right" {...(!props.collapsed && { open: false })}>
      <Button
        className={tab === thisTab ? "ant-btn-icon-only btn-tabactive" : "ant-btn-icon-only"}
        onClick={() => setTab(thisTab)}
        icon={typeof icon === "string" ? icon : undefined}
      >
        {typeof icon === "object" && icon}
      </Button>
    </Tooltip>
  );

  const renderAdvancedSettings = (): React.ReactNode => {
    const items: CollapseProps["items"] = [
      {
        key: 0,
        label: "Rendering adjustments",
        children: (
          <GlobalVolumeControls
            imageName={props.imageName}
            pixelSize={props.pixelSize}
            visibleControls={visibleControls}
          />
        ),
      },
    ];
    const showCustomize = visibleControls.backgroundColorPicker || visibleControls.boundingBoxColorPicker;

    if (showCustomize) {
      items.push({
        key: 1,
        label: "Customize",
        children: <CustomizeWidget visibleControls={props.visibleControls} />,
      });
    }

    return <Collapse bordered={false} defaultActiveKey={showCustomize ? [0, 1] : 0} items={items} />;
  };

  return (
    <div className="control-panel-col-container" ref={controlPanelContainerRef}>
      <div className="control-panel-tab-col" style={{ flex: "0 0 50px" }}>
        <Button
          className={"ant-btn-icon-only btn-collapse" + (props.collapsed ? " btn-collapse-collapsed" : "")}
          onClick={() => props.setCollapsed(!props.collapsed)}
        >
          <ViewerIcon type="closePanel" />
        </Button>

        <div className="tab-divider" />

        {renderTab(ControlTab.Channels, <ViewerIcon type="channels" />)}
        {renderTab(ControlTab.Advanced, <ViewerIcon type="preferences" />)}
        {props.visibleControls.metadataViewer && renderTab(ControlTab.Metadata, <ViewerIcon type="metadata" />)}
      </div>
      <div className="control-panel-col" style={{ flex: "0 0 450px" }}>
        <h2 className="control-panel-title">{ControlTabNames[tab]}</h2>
        {visibleControls.colorPresetsDropdown && tab === ControlTab.Channels && renderColorPresetsDropdown()}
        {hasImage && (
          <div className="channel-rows-list">
            {tab === ControlTab.Channels && (
              <ChannelsWidget
                channelDataChannels={props.channelDataChannels}
                channelGroupedByType={props.channelGroupedByType}
                saveIsosurface={props.saveIsosurface}
                onColorChangeComplete={props.onColorChangeComplete}
                onApplyColorPresets={props.onApplyColorPresets}
                filterFunc={props.filterFunc}
                viewerChannelSettings={viewerChannelSettings}
              />
            )}
            {tab === ControlTab.Advanced && renderAdvancedSettings()}
            {tab === ControlTab.Metadata && <MetadataViewer metadata={props.getMetadata()} />}
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(ControlPanel);
