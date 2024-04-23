import { ProjectEntry } from "../../types";

const BASE_URL = "https://s3-us-west-2.amazonaws.com/bisque.allencell.org/v1.4.0/Cell-Viewer_Thumbnails/";
export const landingPageContent: ProjectEntry[] = [
  {
    name: "Large colony hiPSC nuclei time series, tagged lamin-B",
    description:
      "This image was segmented and analyzed for our Nuclear Morphogenesis publication and consists of 500 time samples at 1000x800x65.",
    publicationLink: new URL("https://google.com"),
    publicationName: "This is the name of the associated publication that the user can click to open in a new tab",
    inReview: true,
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
