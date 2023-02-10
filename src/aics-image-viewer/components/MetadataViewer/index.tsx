import { Icon, Tooltip } from "antd";
import React from "react";
import { MetadataFormat, MetadataFormatRecord, MetadataRecord } from "../../shared/types";
import "./styles.css";

interface MetadataTableProps {
  metadata: MetadataRecord;
  metadataFormat?: MetadataFormatRecord;
}

interface CollapsibleRowProps extends MetadataTableProps {
  title: string;
  titleFormat?: MetadataFormat;
}

export interface MetadataViewerProps extends Partial<MetadataTableProps> {
  getExtraMetadata?: () => MetadataTableProps;
}

const addTooltipIfPresent = (tooltip: any, component: React.ReactElement): React.ReactElement => {
  if (typeof tooltip === "string" && tooltip.length > 0) {
    return (
      <Tooltip title={tooltip} placement="right">
        {component}
      </Tooltip>
    );
  }
  return component;
};

/** Component to hold collapse state */
const MetadataCollapsibleRow: React.FC<CollapsibleRowProps> = ({ metadata, metadataFormat, title, titleFormat }) => {
  const [collapsed, setCollapsed] = React.useState(true);

  return (
    <>
      <tr className="metadata-collapse-title" onClick={() => setCollapsed(!collapsed)}>
        <td className="metadata-collapse-caret">
          <Icon type="right" style={{ transform: `rotate(${collapsed ? 0 : 90}deg)` }} />
        </td>
        {addTooltipIfPresent(titleFormat?.tooltip, <td colSpan={3}>{titleFormat?.displayName || title}</td>)}
      </tr>
      <tr className={"metadata-collapse-content-row" + (collapsed ? " metadata-collapse-collapsed" : "")}>
        <td className="metadata-collapse-content" colSpan={4}>
          <MetadataTable metadata={metadata} metadataFormat={metadataFormat} />
        </td>
      </tr>
    </>
  );
};

const MetadataTable: React.FC<MetadataTableProps> = ({ metadata, metadataFormat }) => (
  <table className="viewer-metadata-table">
    <tbody>
      {Object.keys(metadata).map((key, idx) => {
        const format = metadataFormat && metadataFormat[key];
        const hasUnit = typeof format?.unit === "string" && format.unit.length > 0;
        const metadataValue = metadata[key];
        if (typeof metadataValue === "object" && metadataValue !== null) {
          return (
            <MetadataCollapsibleRow
              key={idx}
              metadata={metadataValue}
              metadataFormat={metadataFormat}
              title={key}
              titleFormat={format}
            />
          );
        } else {
          return (
            <tr key={idx}>
              <td className="metadata-collapse-caret"></td>
              {addTooltipIfPresent(format?.tooltip, <td>{format?.displayName || key}</td>)}
              <td className="metadata-value" colSpan={hasUnit ? 1 : 2}>
                {metadataValue}
              </td>
              {hasUnit && <td className="metadata-unit">{format?.unit}</td>}
            </tr>
          );
        }
      })}
    </tbody>
  </table>
);

const MetadataViewer: React.FC<MetadataViewerProps> = ({ metadata, metadataFormat, getExtraMetadata }) => {
  const extraMetadata = getExtraMetadata ? getExtraMetadata() : { metadata: {}, metadataFormat: {} };
  return (
    <MetadataTable
      metadata={{ ...extraMetadata.metadata, ...metadata }}
      metadataFormat={{ ...extraMetadata.metadataFormat, ...metadataFormat }}
    />
  );
};

export default MetadataViewer;
