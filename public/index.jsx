import React from "react";
import ReactDOM from "react-dom";

import "antd/dist/antd.css";

import "./App.scss";

import { ImageViewerApp } from "../src";

function parseQueryString() {
  var pairs = location.search.slice(1).split('&');
  var result = {};
  pairs.forEach(function(pair) {
      pair = pair.split('=');
      result[pair[0]] = decodeURIComponent(pair[1] || '');
  });  
  return JSON.parse(JSON.stringify(result));
}
const params = parseQueryString();

//let baseurl = "http://dev-aics-dtp-001.corp.alleninstitute.org/cellviewer-1-4-0/Cell-Viewer_Thumbnails/";
let baseurl =
  "https://s3-us-west-2.amazonaws.com/bisque.allencell.org/v1.4.0/Cell-Viewer_Thumbnails";
let cellid = 2025;
let cellPath = "AICS-22/AICS-22_8319_2025";
let fovPath = "AICS-22/AICS-22_8319";
let fovDownloadHref =
  "https://files.allencell.org/api/2.0/file/download?collection=cellviewer-1-4/?id=F8319";
let cellDownloadHref =
  "https://files.allencell.org/api/2.0/file/download?collection=cellviewer-1-4/?id=C2025";
if (params) {
  // quick way to load a atlas.json from a special directory.
  //
  if (params.file) {
    cellid = 1;
    baseurl = "http://dev-aics-dtp-001.corp.alleninstitute.org/dan-data/";
    cellPath = params.file;
    fovPath = params.file;
    fovDownloadHref = "";
    cellDownloadHref = "";
  }
}

ReactDOM.render(
  <section className="ant-layout">
    <div className="mycellviewer">
      <ImageViewerApp
        cellId={cellid}
        baseUrl={baseurl}
        //cellPath="AICS-25/AICS-25_6035_43757"
        //fovPath="AICS-25/AICS-25_6035"
        cellPath={cellPath}
        fovPath={fovPath}
        defaultVolumesOn={[0, 1, 2]}
        defaultSurfacesOn={[]}
        fovDownloadHref={fovDownloadHref}
        cellDownloadHref={cellDownloadHref}
      />
    </div>
  </section>,
  document.getElementById("cell-viewer")
);
