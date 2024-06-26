import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import React from "react";

import { AppDataProps, ProjectEntry } from "../../types";
import { ViewMode } from "../../../src";

const nucmorphBaseViewerSettings: Partial<AppDataProps> = {
  viewerChannelSettings: {
    maskChannelName: "low_EGFP",
    groups: [
      {
        name: "Channels",
        channels: [
          { match: [0], enabled: true, lut: ["autoij", "autoij"], color: "C3C3C3" },
          { match: [1], enabled: false },
          { match: [2], enabled: true, colorizeEnabled: true },
        ],
      },
    ],
  },
  viewerSettings: {
    viewMode: ViewMode.xy,
    region: { x: [0, 1], y: [0, 1], z: [0.3, 0.3] },
  },
};

export const landingPageContent: ProjectEntry[] = [
  {
    name: "hiPSC FOV-nuclei timelapse datasets",
    inReview: true,
    description: (
      <p>
        3D timelapses of nuclei in growing hiPS cell colonies of three different starting sizes. Timelapse datasets
        include 3D transmitted-light bright-field and lamin B1-mEGFP fluorescence 20x images and 3D nuclear segmentation
        images. These datasets are available for download on{" "}
        <a
          href="https://open.quiltdata.com/b/allencell/tree/aics/nuc-morph-dataset/hipsc_fov_nuclei_timelapse_dataset/hipsc_fov_nuclei_timelapse_data_used_for_analysis/baseline_colonies_fov_timelapse_dataset/"
          rel="noopener noreferrer"
          target="_blank"
        >
          {"Quilt"}
          <FontAwesomeIcon icon={faUpRightFromSquare} size="sm" style={{ marginBottom: "-1px", marginLeft: "3px" }} />
        </a>{" "}
        and analyzed in the study at{" "}
        <a href="https://www.biorxiv.org/" rel="noopener noreferrer" target="_blank">
          {"<Biorxiv ref>"}
          <FontAwesomeIcon icon={faUpRightFromSquare} size="sm" style={{ marginBottom: "-1px", marginLeft: "3px" }} />
        </a>
        .{" "}
      </p>
    ),
    datasets: [
      {
        name: "Small colony",
        loadParams: {
          imageUrl: [
            "https://allencell.s3.amazonaws.com/aics/nuc_morph_data/data_for_analysis/baseline_colonies/20200323_09_small/raw.ome.zarr",
            "https://allencell.s3.amazonaws.com/aics/nuc_morph_data/data_for_analysis/baseline_colonies/20200323_09_small/seg.ome.zarr",
          ],
          cellId: "",
          imageDownloadHref: "",
          parentImageDownloadHref: "",
          ...nucmorphBaseViewerSettings,
        },
      },
      {
        name: "Medium colony",
        loadParams: {
          imageUrl: [
            "https://allencell.s3.amazonaws.com/aics/nuc_morph_data/data_for_analysis/baseline_colonies/20200323_06_mid/raw.ome.zarr",
            "https://allencell.s3.amazonaws.com/aics/nuc_morph_data/data_for_analysis/baseline_colonies/20200323_06_mid/seg.ome.zarr",
          ],
          cellId: "",
          imageDownloadHref: "",
          parentImageDownloadHref: "",
          ...nucmorphBaseViewerSettings,
        },
      },
      {
        name: "Large colony",
        loadParams: {
          imageUrl: [
            "https://allencell.s3.amazonaws.com/aics/nuc_morph_data/data_for_analysis/baseline_colonies/20200323_05_large/raw.ome.zarr",
            "https://allencell.s3.amazonaws.com/aics/nuc_morph_data/data_for_analysis/baseline_colonies/20200323_05_large/seg.ome.zarr",
          ],
          cellId: "",
          imageDownloadHref: "",
          parentImageDownloadHref: "",
          ...nucmorphBaseViewerSettings,
        },
      },
    ],
  },
];
