import { AppProps } from "../src/aics-image-viewer/components/App/types";

export type AppDataProps = Omit<AppProps, "appHeight" | "canvasMargin">;

export type DatasetEntry = {
  name: string;
  description: string;
  loadParams: AppDataProps;
};

export type ProjectEntry = {
  name: string;
  description: string;
  publicationLink?: URL;
  publicationName?: string;
  loadParams?: AppDataProps;
  datasets?: DatasetEntry[];
  inReview?: boolean;
};
