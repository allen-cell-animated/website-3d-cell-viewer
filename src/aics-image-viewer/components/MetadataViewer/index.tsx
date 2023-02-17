import { Icon } from "antd";
import React from "react";
import { MetadataEntry, MetadataRecord } from "../../shared/types";
import "./styles.css";

interface MetadataTableProps {
  metadata: MetadataRecord;
  // Track whether a category title will abut another category title below when in the collapsed state.
  // If so, this category title should not render a bottom border when collapsed, otherwise the border will double
  // up with the top border of the lower category and create the appearance of a single thick, uneven border.
  // (there is not a way to prevent this with pure CSS to my knowledge)
  categoryFollows: boolean;
}

interface CollapsibleCategoryProps extends MetadataTableProps {
  title: string;
}

const isCategory = (val: MetadataEntry): val is MetadataRecord => typeof val === "object" && val !== null;

/** Component to hold collapse state */
const MetadataCollapsibleCategory: React.FC<CollapsibleCategoryProps> = ({ metadata, title, categoryFollows }) => {
  const [collapsed, setCollapsed] = React.useState(true);
  const toggleCollapsed = (): void => setCollapsed(!collapsed);

  return (
    <>
      <tr
        className={
          "metadata-collapse-title" + (categoryFollows && collapsed ? " metadata-collapse-no-bottom-border" : "")
        }
        onClick={toggleCollapsed}
      >
        <td colSpan={2}>
          <span className="metadata-collapse-caret">
            <Icon type="right" style={{ transform: `rotate(${collapsed ? 0 : 90}deg)` }} />
          </span>
          {title}
        </td>
      </tr>
      <tr className={"metadata-collapse-content-row" + (collapsed ? " metadata-collapse-collapsed" : "")}>
        <td className="metadata-collapse-content" colSpan={2}>
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
            // Determine whether this category is followed by another category, ignoring data hierarchy:
            // - If this is the last element in the table, this category has another category below if the table does.
            // - Otherwise, just check if the next element in this table is a category.
            const nextItem = metadata[metadataKeys[idx + 1]];
            const categoryBelow = nextItem ? isCategory(nextItem) : categoryFollows;

            return (
              <MetadataCollapsibleCategory
                key={key}
                metadata={metadataValue}
                title={key}
                categoryFollows={categoryBelow}
              />
            );
          } else {
            return (
              <tr key={key}>
                <td className="metadata-key">{key}</td>
                <td className="metadata-value">{metadataValue + ""}</td>
              </tr>
            );
          }
        })}
      </tbody>
    </table>
  );
};

const MetadataViewer: React.FC<{ metadata: MetadataRecord }> = ({ metadata }) => (
  <MetadataTable metadata={metadata} categoryFollows={false} />
);

export default MetadataViewer;
