import React from "react";
import ReactDOM from "react-dom";

import "antd/dist/antd.less";

// Components
import "../src/aics-image-viewer/assets/styles/typography.css";
import "./App.css";

import { ImageViewerApp, RenderMode, ViewerChannelSettings, ViewMode } from "../src";
import FirebaseRequest, { DatasetMetaData } from "./firebase";
import { AppProps, GlobalViewerSettings } from "../src/aics-image-viewer/components/App/types";

// vars filled at build time using webpack DefinePlugin
console.log(`website-3d-cell-viewer ${WEBSITE3DCELLVIEWER_BUILD_ENVIRONMENT} build`);
console.log(`website-3d-cell-viewer Version ${WEBSITE3DCELLVIEWER_VERSION}`);
console.log(`volume-viewer Version ${VOLUMEVIEWER_VERSION}`);

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

type ParamKeys = "mask" | "ch" | "luts" | "colors" | "url" | "file" | "dataset" | "id" | "view";
type Params = { [_ in ParamKeys]?: string };

function parseQueryString(): Params {
  const pairs = location.search.slice(1).split("&");
  const result = {};
  pairs.forEach((pairString) => {
    const pair = pairString.split("=");
    result[pair[0]] = decodeURIComponent(pair[1] || "");
  });
  return JSON.parse(JSON.stringify(result));
}
const params = parseQueryString();

const decodeURL = (url: string): string => {
  const decodedUrl = decodeURIComponent(url);
  return decodedUrl.endsWith("/") ? decodedUrl.slice(0, -1) : decodedUrl;
};

/** Try to parse a `string` as a list of 2 or more URLs. Returns `undefined` if the string is not a valid URL list. */
const tryDecodeURLList = (url: string, delim = ","): string[] | undefined => {
  if (!url.includes(delim)) {
    return undefined;
  }

  const urls = url.split(delim).map((u) => decodeURL(u));

  // Verify that all urls are valid
  for (const u of urls) {
    try {
      new URL(u);
    } catch (_e) {
      return undefined;
    }
  }

  return urls;
};

const BASE_URL = "https://s3-us-west-2.amazonaws.com/bisque.allencell.org/v1.4.0/Cell-Viewer_Thumbnails/";
const args: Omit<AppProps, "appHeight" | "canvasMargin"> = {
  cellId: "2025",
  imageUrl: BASE_URL + "AICS-22/AICS-22_8319_2025_atlas.json",
  parentImageUrl: BASE_URL + "AICS-22/AICS-22_8319_atlas.json",
  parentImageDownloadHref: "https://files.allencell.org/api/2.0/file/download?collection=cellviewer-1-4/?id=F8319",
  imageDownloadHref: "https://files.allencell.org/api/2.0/file/download?collection=cellviewer-1-4/?id=C2025",
  viewerChannelSettings: VIEWER_3D_SETTINGS,
};
const viewerSettings: Partial<GlobalViewerSettings> = {
  showAxes: false,
  showBoundingBox: false,
  autorotate: false,
  viewMode: ViewMode.threeD,
  renderMode: RenderMode.volumetric,
  maskAlpha: 50,
  brightness: 70,
  density: 50,
  levels: [0, 128, 255] as [number, number, number],
  backgroundColor: [0, 0, 0] as [number, number, number],
  boundingBoxColor: [255, 255, 255] as [number, number, number],
};

async function loadDataset(dataset: string, id: string) {
  const db = new FirebaseRequest();

  const datasets = await db.getAvailableDatasets();

  let datasetMeta: DatasetMetaData | undefined = undefined;
  for (const d of datasets) {
    const innerDatasets = d.datasets!;
    const names = Object.keys(innerDatasets);
    const matchingName = names.find((name) => name === dataset);
    if (matchingName) {
      datasetMeta = innerDatasets[matchingName];
      break;
    }
  }
  if (datasetMeta === undefined) {
    console.error(`No matching dataset: ${dataset}`);
    return;
  }

  const datasetData = await db.selectDataset(datasetMeta.manifest!);
  const baseUrl = datasetData.volumeViewerDataRoot + "/";
  args.imageDownloadHref = datasetData.downloadRoot + "/" + id;
  // args.fovDownloadHref = datasetData.downloadRoot + "/" + id;

  const fileInfo = await db.getFileInfoByCellId(id);
  args.imageUrl = baseUrl + fileInfo!.volumeviewerPath;
  args.parentImageUrl = baseUrl + fileInfo!.fovVolumeviewerPath;
  runApp();

  // only now do we have all the data needed
}

if (params) {
  if (params.mask) {
    viewerSettings.maskAlpha = parseInt(params.mask, 10);
  }
  if (params.view) {
    const mapping = {
      "3D": ViewMode.threeD,
      Z: ViewMode.xy,
      Y: ViewMode.xz,
      X: ViewMode.yz,
    };
    const allowedViews = Object.keys(mapping);
    if (!allowedViews.includes(params.view)) {
      params.view = "3D";
    }
    viewerSettings.viewMode = mapping[params.view];
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
    args.viewerChannelSettings = initialChannelSettings;
  }
  if (params.url) {
    const imageUrls = tryDecodeURLList(params.url) ?? decodeURL(params.url);
    const firstUrl = Array.isArray(imageUrls) ? imageUrls[0] : imageUrls;

    args.cellId = "1";
    args.imageUrl = imageUrls;
    // this is invalid for zarr?
    args.imageDownloadHref = firstUrl;
    args.parentImageUrl = "";
    args.parentImageDownloadHref = "";
    // if json, then use the CFE settings for now.
    // (See VIEWER_3D_SETTINGS)
    // otherwise turn the first 3 channels on and group them
    if (!firstUrl.endsWith("json") && !params.ch) {
      args.viewerChannelSettings = {
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
    args.cellId = "1";
    const baseUrl = "http://dev-aics-dtp-001.corp.alleninstitute.org/dan-data/";
    args.imageUrl = baseUrl + params.file;
    args.parentImageUrl = baseUrl + params.file;
    args.parentImageDownloadHref = "";
    args.imageDownloadHref = "";
    runApp();
  } else if (params.dataset && params.id) {
    // ?dataset=aics_hipsc_v2020.1&id=232265
    loadDataset(params.dataset, params.id);
  } else {
    runApp();
  }
} else {
  runApp();
}

function runApp() {
  ReactDOM.render(
    <ImageViewerApp {...args} appHeight="100vh" canvasMargin="0 0 0 0" viewerSettings={viewerSettings} />,
    document.getElementById("cell-viewer")
  );
}
