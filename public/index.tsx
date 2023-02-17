import React from "react";
import ReactDOM from "react-dom";

import "antd/dist/antd.less";

// Components
import "../src/aics-image-viewer/assets/styles/typography.css";
import "./App.css";

import { ImageViewerApp, ViewerChannelSettings } from "../src";
import FirebaseRequest from "./firebase";

export const VIEWER_3D_SETTINGS: ViewerChannelSettings = {
  groups: [
    {
      name: "Observed channels",
      channels: [
        { name: "Membrane", match: ["(CMDRP)"], color: "E2CDB3", enabled: true, lut: ["p50", "p98"] },
        {
          name: "Labeled structure",
          match: ["(EGFP)|(RFPT)"],
          color: "6FBA11",
          enabled: true,
          lut: ["p50", "p98"],
        },
        { name: "DNA", match: ["(H3342)"], color: "8DA3C0", enabled: true, lut: ["p50", "p98"] },
        { name: "Bright field", match: ["(100)|(Bright)"], color: "F5F1CB", enabled: false, lut: ["p50", "p98"] },
      ],
    },
    {
      name: "Segmentation channels",
      channels: [
        {
          name: "Labeled structure",
          match: ["(SEG_STRUCT)"],
          color: "E0E3D1",
          enabled: false,
          lut: ["p50", "p98"],
        },
        { name: "Membrane", match: ["(SEG_Memb)"], color: "DD9BF5", enabled: false, lut: ["p50", "p98"] },
        { name: "DNA", match: ["(SEG_DNA)"], color: "E3F4F5", enabled: false, lut: ["p50", "p98"] },
      ],
    },
    {
      name: "Contour channels",
      channels: [
        { name: "Membrane", match: ["(CON_Memb)"], color: "FF6200", enabled: false, lut: ["p50", "p98"] },
        { name: "DNA", match: ["(CON_DNA)"], color: "F7DB78", enabled: false, lut: ["p50", "p98"] },
      ],
    },
  ],
  // must be the true channel name in the volume data
  maskChannelName: "SEG_Memb",
};

type ParamKeys = "mask" | "ch" | "luts" | "colors" | "image" | "url" | "file" | "dataset" | "id";
type Params = { [_ in ParamKeys]?: string };

function parseQueryString(): Params {
  var pairs = location.search.slice(1).split("&");
  var result = {};
  pairs.forEach((pairString) => {
    const pair = pairString.split("=");
    result[pair[0]] = decodeURIComponent(pair[1] || "");
  });
  return JSON.parse(JSON.stringify(result));
}
const params = parseQueryString();

const args = {
  //baseurl: "http://dev-aics-dtp-001.corp.alleninstitute.org/cellviewer-1-4-0/Cell-Viewer_Thumbnails/",
  baseurl: "https://s3-us-west-2.amazonaws.com/bisque.allencell.org/v1.4.0/Cell-Viewer_Thumbnails/",
  cellid: 2025,
  cellPath: "AICS-22/AICS-22_8319_2025_atlas.json",
  fovPath: "AICS-22/AICS-22_8319_atlas.json",
  fovDownloadHref: "https://files.allencell.org/api/2.0/file/download?collection=cellviewer-1-4/?id=F8319",
  cellDownloadHref: "https://files.allencell.org/api/2.0/file/download?collection=cellviewer-1-4/?id=C2025",
  initialChannelSettings: VIEWER_3D_SETTINGS,
};
const viewerConfig = {
  showAxes: false,
  showBoundingBox: false,
  autorotate: false,
  view: "3D", // "XY", "XZ", "YZ"
  mode: "default", // "pathtrace", "maxprojection"
  maskAlpha: 50,
  brightness: 70,
  density: 50,
  levels: [0, 128, 255] as [number, number, number],
  backgroundColor: [0, 0, 0] as [number, number, number],
  boundingBoxColor: [255, 255, 255] as [number, number, number],
};

if (params) {
  if (params.mask) {
    viewerConfig.maskAlpha = parseInt(params.mask, 10);
  }
  if (params.ch) {
    // ?ch=1,2
    // ?luts=0,255,0,255
    // ?colors=ff0000,00ff00
    const initialChannelSettings: ViewerChannelSettings = {
      groups: [{ name: "Channels", channels: [] }],
    };
    const ch = initialChannelSettings.groups[0].channels;

    const channelsOn = params.ch.split(",").map((numstr) => parseInt(numstr, 10));
    for (let i = 0; i < channelsOn.length; ++i) {
      ch.push({ match: channelsOn[i], enabled: true });
    }
    // look for luts or color
    if (params.luts) {
      const luts = params.luts.split(",");
      if (luts.length !== ch.length * 2) {
        console.log("ILL-FORMED QUERYSTRING: luts must have a min/max for each ch");
      }
      for (let i = 0; i < ch.length; ++i) {
        ch[i]["lut"] = [luts[i * 2], luts[i * 2 + 1]];
      }
    }
    if (params.colors) {
      const colors = params.colors.split(",");
      if (colors.length !== ch.length) {
        console.log("ILL-FORMED QUERYSTRING: if colors specified, must have a color for each ch");
      }
      for (let i = 0; i < ch.length; ++i) {
        ch[i]["color"] = colors[i];
      }
    }
    args.initialChannelSettings = initialChannelSettings;
  }
  if (params.url) {
    // ZARR:
    // ?url=zarrstore&image=imagename
    // ?url=zarrstore will default to image "0"
    // zarrstore must end with .zarr
    // put the store url in baseUrl,
    // and the image name in cellPath
    // Time 0 will be loaded.
    // TODO specify Pyramid level

    // OME-TIFF:
    // ?url=imageurl&image=imagename
    // ?url=fullimageurl
    // any split between baseUrl + cellPath is ok
    // as long as (baseUrl+cellPath) ends with .tif or tiff

    // JSON ATLAS:
    // ?url=imageurl&image=imagename
    // ?url=fullimageurl
    // any split between baseUrl + cellPath is ok
    // as long as (baseUrl+cellPath) ends with .json

    // it is understood that if nextImgPath and/or prevImgPath
    // are provided, they must be relative to baseUrl in addition to cellPath.
    // same deal for fovPath

    let decodedurl = decodeURI(params.url);
    let decodedimage = "";
    if (params.image) {
      decodedimage = decodeURIComponent(params.image);
    } else {
      // image not specified
      if (decodedurl.endsWith(".zarr")) {
        decodedimage = "";
      } else {
        if (decodedurl.endsWith("/")) {
          decodedurl = decodedurl.slice(0, -1);
        }
        const spliturl = decodedurl.split("/");
        decodedimage = spliturl[spliturl.length - 1];
        decodedurl = decodedurl.slice(0, -decodedimage.length);
      }
    }

    args.cellid = 1;
    args.baseurl = decodedurl;
    args.cellPath = decodedimage;
    // this is invalid for zarr?
    args.cellDownloadHref = decodedurl + decodedimage;
    args.fovPath = "";
    args.fovDownloadHref = "";
    // if json, then use the CFE settings for now.
    // (See VIEWER_3D_SETTINGS)
    // otherwise turn the first 3 channels on and group them
    if (!decodedimage.endsWith("json") && !params.ch) {
      args.initialChannelSettings = {
        groups: [
          // first 3 channels on by default!
          {
            name: "Channels",
            channels: [
              { match: [0, 1, 2], enabled: true },
              { match: "(.+)", enabled: false },
            ],
          },
        ],
      };
    }
    runApp();
  } else if (params.file) {
    // quick way to load a atlas.json from a special directory.
    //
    // ?file=relative-path-to-atlas-on-isilon
    args.cellid = 1;
    args.baseurl = "http://dev-aics-dtp-001.corp.alleninstitute.org/dan-data/";
    args.cellPath = params.file;
    args.fovPath = params.file;
    args.fovDownloadHref = "";
    args.cellDownloadHref = "";
    runApp();
  } else if (params.dataset && params.id) {
    // ?dataset=aics_hipsc_v2020.1&id=232265
    const db = new FirebaseRequest();

    db.getAvailableDatasets()
      .then((datasets) => {
        for (let i = 0; i < datasets.length; ++i) {
          console.log(datasets);
          const names = Object.keys(datasets[i].datasets!);
          for (let j = 0; j < names.length; ++j) {
            if (names[j] === params.dataset) {
              return datasets[i].datasets![names[j]];
            }
          }
        }
        return undefined;
      })
      .then((dataset) => {
        return db.selectDataset(dataset!.manifest!);
      })
      .then((datasetData) => {
        args.baseurl = datasetData.volumeViewerDataRoot + "/";
        args.cellDownloadHref = datasetData.downloadRoot + "/" + params.id;
        //fovDownloadHref = datasetData.downloadRoot + "/" + params.id;
      })
      .then(() => {
        return db.getFileInfoByCellId(params.id!); // guarded above
      })
      .then((fileInfo) => {
        args.cellPath = fileInfo!.volumeviewerPath;
        args.fovPath = fileInfo!.fovVolumeviewerPath;
        runApp();

        // only now do we have all the data needed
      });
  } else {
    runApp();
  }
} else {
  runApp();
}

function runApp() {
  ReactDOM.render(
    <ImageViewerApp
      cellId={args.cellid.toString()}
      baseUrl={args.baseurl}
      appHeight="90vh"
      canvasMargin="0 120px 0 0"
      cellPath={args.cellPath}
      fovPath={args.fovPath}
      fovDownloadHref={args.fovDownloadHref}
      cellDownloadHref={args.cellDownloadHref}
      viewerConfig={viewerConfig}
      viewerChannelSettings={args.initialChannelSettings}
      metadataConfig={["dimensions", "pixelPhysicalSize", "physicalDimensions", "channels", "userData"]}
    />,
    document.getElementById("cell-viewer")
  );
}
