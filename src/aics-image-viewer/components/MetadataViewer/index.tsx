import { Icon } from "antd";
import React from "react";
import { MetadataEntry, MetadataRecord } from "../../shared/types";
import "./styles.css";

interface MetadataTableProps {
  metadata: MetadataRecord;
}

interface CollapsibleCategoryProps extends MetadataTableProps {
  title: string;
  className?: string;
}

export interface MetadataViewerProps extends Partial<MetadataTableProps> {
  getExtraMetadata?: () => MetadataRecord;
}

const isCategory = (val: MetadataEntry): val is MetadataRecord => typeof val === "object" && val !== null;

/** Component to hold collapse state */
const MetadataCollapsibleCategory: React.FC<CollapsibleCategoryProps> = ({ metadata, title }) => {
  const [collapsed, setCollapsed] = React.useState(true);

  return (
    <>
      <tr className="metadata-collapse-title" onClick={() => setCollapsed(!collapsed)}>
        <td className="metadata-collapse-caret">
          <Icon type="right" style={{ transform: `rotate(${collapsed ? 0 : 90}deg)` }} />
        </td>
        <td colSpan={2}>{title}</td>
      </tr>
      <tr className={"metadata-collapse-content-row" + (collapsed ? " metadata-collapse-collapsed" : "")}>
        <td className="metadata-collapse-content" colSpan={3}>
          <MetadataTable metadata={metadata} />
        </td>
      </tr>
    </>
  );
};

const MetadataTable: React.FC<MetadataTableProps> = ({ metadata }) => (
  <table className="viewer-metadata-table">
    <tbody>
      {Object.keys(metadata).map((key, idx) => {
        const metadataValue = metadata[key];
        if (isCategory(metadataValue)) {
          return <MetadataCollapsibleCategory key={idx} metadata={metadataValue} title={key} />;
        } else {
          return (
            <tr key={idx}>
              <td className="metadata-key" colSpan={2}>
                {key}
              </td>
              <td className="metadata-value">{metadataValue}</td>
            </tr>
          );
        }
      })}
    </tbody>
  </table>
);

const MetadataViewer: React.FC<MetadataViewerProps> = ({ metadata, getExtraMetadata }) => {
  const extraMetadata = getExtraMetadata ? getExtraMetadata() : {};
  return <MetadataTable metadata={{ ...extraMetadata, ...metadata }} />;
};

export default MetadataViewer;
