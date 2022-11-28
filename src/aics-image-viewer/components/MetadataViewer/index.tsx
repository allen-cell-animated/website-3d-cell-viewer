import React from "react";
import { MetadataRecord } from "../../shared/types";
import "./styles.css";

export interface MetadataViewerProps {
  metadata: MetadataRecord;
}

const MetadataViewer: React.FC<MetadataViewerProps> = ({ metadata: data }) => (
  <table className="viewer-metadata-table">
    <colgroup>
      <col />
      <col />
      <col />
    </colgroup>
    <tbody>
      {Object.keys(data).map((key, idx) => (
        <tr key={idx}>
          <td className="metadata-expand"></td>
          <td>{key}</td>
          <td>{data[key]}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

export default MetadataViewer;
