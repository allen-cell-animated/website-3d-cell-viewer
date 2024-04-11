import React, { ReactElement, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { GlobalViewerSettings } from "../../aics-image-viewer/components/App/types";
import { ImageViewerApp, RenderMode, ViewMode } from "../..";
import { getArgsFromParams } from "../utils/url_utils";
import { AppDataProps } from "../types";

type AppWrapperProps = {};

const DEFAULT_VIEWER_SETTINGS: Partial<GlobalViewerSettings> = {
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

const DEFAULT_APP_PROPS: AppDataProps = {
  imageUrl: "",
  cellId: "",
  imageDownloadHref: "",
  parentImageDownloadHref: "",
};

/**
 * Renders additional components around the main ImageViewer component, and also collects URL and navigation state params
 * to pass to the viewer.
 */
export default function AppWrapper(props: AppWrapperProps): ReactElement {
  const location = useLocation();

  // TODO: Update this with the load parameter later :)
  const [viewerSettings, setViewerSettings] = useState<Partial<GlobalViewerSettings>>(DEFAULT_VIEWER_SETTINGS);
  const [viewerArgs, setViewerArgs] = useState<AppDataProps>(DEFAULT_APP_PROPS);
  const [searchParams] = useSearchParams();

  useMemo(async () => {
    // Collect navigation state params (AppProps)
    const locationArgs = location.state as AppDataProps;
    // Fetching URL query parameters is async, so we need to do it here
    const { args, viewerSettings } = await getArgsFromParams(searchParams);

    console.log("locationArgs", locationArgs);
    console.log("args", args);

    setViewerArgs({ ...locationArgs, ...args });
    setViewerSettings({ ...DEFAULT_VIEWER_SETTINGS, ...viewerSettings });
  }, []);

  return <ImageViewerApp {...viewerArgs} appHeight="100vh" canvasMargin="0 0 0 0" viewerSettings={viewerSettings} />;
}
