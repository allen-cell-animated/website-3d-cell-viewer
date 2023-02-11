import { Icon } from "antd";
import React from "react";
import { MetadataEntry, MetadataRecord } from "../../shared/types";
import "./styles.css";

interface MetadataProps {
  metadata: MetadataRecord;
}

interface MetadataTableProps extends MetadataProps {
  // track whether categories will abut a category below when closed, for rendering borders properly
  categoryFollows: boolean;
}

interface CollapsibleCategoryProps extends MetadataTableProps {
  title: string;
}

export interface MetadataViewerProps extends Partial<MetadataProps> {
  getExtraMetadata?: () => MetadataRecord;
}

const isCategory = (val: MetadataEntry): val is MetadataRecord => typeof val === "object" && val !== null;

/** Component to hold collapse state */
const MetadataCollapsibleCategory: React.FC<CollapsibleCategoryProps> = ({ metadata, title, categoryFollows }) => {
  const [collapsed, setCollapsed] = React.useState(true);
  const toggleCollapsed = () => setCollapsed(!collapsed);

  return (
    <>
      <tr
        className={
          "metadata-collapse-title" + (categoryFollows && collapsed ? " metadata-collapse-no-bottom-border" : "")
        }
        onClick={toggleCollapsed}
      >
        <td className="metadata-collapse-caret">
          <Icon type="right" style={{ transform: `rotate(${collapsed ? 0 : 90}deg)` }} />
        </td>
        <td colSpan={2}>{title}</td>
      </tr>
      <tr className={"metadata-collapse-content-row" + (collapsed ? " metadata-collapse-collapsed" : "")}>
        <td className="metadata-collapse-content" colSpan={3}>
          <MetadataTable metadata={metadata} categoryFollows={categoryFollows} />
        </td>
      </tr>
    </>
  );
};

const MetadataTable: React.FC<MetadataTableProps> = ({ metadata, categoryFollows }) => {
  const metadataKeys = Object.keys(metadata);

  return (
    <table className="viewer-metadata-table">
      <tbody>
        {metadataKeys.map((key, idx) => {
          const metadataValue = metadata[key];

          if (isCategory(metadataValue)) {
            let categoryBelow: boolean;
            if (idx + 1 >= metadataKeys.length) {
              categoryBelow = categoryFollows;
            } else {
              categoryBelow = isCategory(metadata[metadataKeys[idx + 1]]);
              console.log(key, metadataKeys[idx + 1]);
            }

            return (
              <MetadataCollapsibleCategory
                key={idx}
                metadata={metadataValue}
                title={key}
                categoryFollows={categoryBelow}
              />
            );
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
};

const MetadataViewer: React.FC<MetadataViewerProps> = ({ metadata, getExtraMetadata }) => {
  const extraMetadata = getExtraMetadata ? getExtraMetadata() : {};
  return <MetadataTable metadata={{ ...extraMetadata, ...metadata }} categoryFollows={false} />;
};

export default MetadataViewer;
