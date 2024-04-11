import { AppProps } from "../aics-image-viewer/components/App/types";

export type DatasetEntry = {
  name: string;
  description: string;
  loadParams: Omit<AppProps, "appHeight" | "canvasMargin">;
};

export type ProjectEntry = {
  name: string;
  description: string;
  publicationLink?: URL;
  publicationName?: string;
  loadParams?: Omit<AppProps, "appHeight" | "canvasMargin">;
  datasets?: DatasetEntry[];
  inReview?: boolean;
};
