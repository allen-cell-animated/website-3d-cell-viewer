import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import React from "react";

import { ProjectEntry } from "../../types";

const BASE_URL = "https://s3-us-west-2.amazonaws.com/bisque.allencell.org/v1.4.0/Cell-Viewer_Thumbnails/";
export const landingPageContent: ProjectEntry[] = [
  {
    name: "Tracked hiPSC FOV-nuclei timelapse datasets",
    inReview: true,
    description: (
      <p>
        Maximum projections of tracked 3D segmentations of nuclei in growing hiPS cell colonies, with quantitative
        features of nuclear shape, size and more. The exploratory dataset includes all tracked nuclei, with the baseline
        colonies, full-interphase, and lineage-annotated datasets as subsets of this dataset, analyzed in the study of
        nuclear growth{" "}
        <a href="https://www.biorxiv.org/" rel="noopener noreferrer" target="_blank">
          {"<Biorxiv ref>"}
          <FontAwesomeIcon icon={faUpRightFromSquare} size="sm" style={{ marginBottom: "-1px", marginLeft: "3px" }} />
        </a>
        . For documentation on the features available in these datasets, visit{" "}
        <a
          href="https://open.quiltdata.com/b/allencell/tree/aics/nuc-morph-dataset/timelapse_feature_explorer_datasets/"
          rel="noopener noreferrer"
          target="_blank"
        >
          {"our datasets hosted on Quilt"}
          <FontAwesomeIcon icon={faUpRightFromSquare} size="sm" style={{ marginBottom: "-1px", marginLeft: "3px" }} />
        </a>
        .
      </p>
    ),
    // publicationLink: new URL("https://google.com"),
    // publicationName: "This is the name of the associated publication that the user can click to open in a new tab",
    loadParams: {
      cellId: "2025",
      imageUrl: BASE_URL + "AICS-22/AICS-22_8319_2025_atlas.json",
      parentImageUrl: BASE_URL + "AICS-22/AICS-22_8319_atlas.json",
      parentImageDownloadHref: "https://files.allencell.org/api/2.0/file/download?collection=cellviewer-1-4/?id=F8319",
      imageDownloadHref: "https://files.allencell.org/api/2.0/file/download?collection=cellviewer-1-4/?id=C2025",
      viewerChannelSettings: {
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
      },
    },
  },
];
