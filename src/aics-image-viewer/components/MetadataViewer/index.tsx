import { Table } from "antd";
import React from "react";
import "./styles.css";

type MetadataEntry = string | number | boolean | MetadataRecord;
type MetadataRecord = { [key: string]: MetadataEntry };

interface MetadataViewerProps {
  data: MetadataRecord;
}

const columns = ["key", "value"].map((key) => ({ key, title: key, dataIndex: key }));

type AntFormattedMetadata = {
  key: string;
  value: string | number | undefined;
  children: MetadataRecord | undefined;
};
const formatMetadata = (record: MetadataRecord): AntFormattedMetadata[] => {
  return Object.keys(record).map((key) => {
    const content = record[key];
    if (typeof content === "object") {
      return { key, value: undefined, children: content };
    } else {
      return { key, value: typeof content === "boolean" ? content.toString() : content, children: undefined };
    }
  });
};

const expandedRowRender = ({ children }: AntFormattedMetadata): React.ReactNode => {
  if (children) {
    return <MetadataViewer data={children} />;
  } else {
    return undefined;
  }
};

const MetadataViewer: React.FC<MetadataViewerProps> = ({ data }: MetadataViewerProps) => (
  <Table
    className="viewer-metadata-table"
    showHeader={false}
    columns={columns}
    dataSource={formatMetadata(data)}
    pagination={false}
    size="small"
    bordered={false}
    expandedRowRender={expandedRowRender}
  />
);

export default MetadataViewer;
