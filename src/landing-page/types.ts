import { ViewerChannelSettings } from "../aics-image-viewer/shared/utils/viewerChannelSettings";

// TBD what URL parameters to include here
export type ViewerArgs = {
  baseurl: string;
  cellid: number;
  cellPath: string;
  fovPath: string;
  fovDownloadHref: string;
  cellDownloadHref: string;
  viewerSettings: ViewerChannelSettings;
};

export type DatasetEntry = {
  name: string;
  description: string;
  loadParams: Partial<ViewerArgs>;
};

export type ProjectEntry = {
  name: string;
  description: string;
  publicationLink?: URL;
  publicationName?: string;
  loadParams?: Partial<ViewerArgs>;
  datasets?: DatasetEntry[];
  inReview?: boolean;
};
