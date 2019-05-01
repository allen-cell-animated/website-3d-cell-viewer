import React from "react";
import ReactDOM from "react-dom";

import "./App.scss";
import "antd/dist/antd.css";
import { ImageViewerApp } from "../src";

ReactDOM.render(
  <ImageViewerApp
    cellId={23618}
    baseUrl="http://dev-aics-dtp-001.corp.alleninstitute.org/cellviewer-1-4-0/Cell-Viewer_Thumbnails/"
    cellPath="AICS-17/AICS-17_4187_23618"
    fovPath="AICS-17/AICS-17_4187"
    defaultVolumesOn={[0, 1, 2]}
    defaultSurfacesOn={[]}
  />,
  document.getElementById("cell-viewer")
);
