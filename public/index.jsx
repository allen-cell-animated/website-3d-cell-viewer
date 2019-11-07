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

let baseurl = "http://dev-aics-dtp-001.corp.alleninstitute.org/cellviewer-1-4-0/Cell-Viewer_Thumbnails/";
let cellid = 23618;
let cellPath = "AICS-17/AICS-17_4187_23618";
let fovPath = "AICS-17/AICS-17_4187";
let fovDownloadHref="https://files.allencell.org/api/2.0/file/download?collection=cellviewer-1-4/?id=F4187";
let cellDownloadHref="https://files.allencell.org/api/2.0/file/download?collection=cellviewer-1-4/?id=C23618";
if (params) {
  // quick way to load a atlas.json from a special directory. 
  // 
  if (params.file) {
    cellid = 0;
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
