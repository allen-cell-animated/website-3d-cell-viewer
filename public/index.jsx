import React from "react";
import ReactDOM from "react-dom";

import "antd/dist/antd.css";

import "./App.scss";

import { ImageViewerApp } from "../src";

ReactDOM.render(
  <section className="ant-layout">
    <div className="mycellviewer">
      <ImageViewerApp
        cellId={23618}
        baseUrl="http://dev-aics-dtp-001.corp.alleninstitute.org/cellviewer-1-4-0/Cell-Viewer_Thumbnails/"
        //cellPath="AICS-25/AICS-25_6035_43757"
        //fovPath="AICS-25/AICS-25_6035"
        cellPath="AICS-17/AICS-17_4187_23618"
        fovPath="AICS-17/AICS-17_4187"
        defaultVolumesOn={[0, 1, 2]}
        defaultSurfacesOn={[]}
      />
    </div>
  </section>,
  document.getElementById("cell-viewer")
);
