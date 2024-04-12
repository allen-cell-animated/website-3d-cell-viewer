import React, { ReactElement, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { GlobalViewerSettings } from "../../aics-image-viewer/components/App/types";
import { ImageViewerApp, RenderMode, ViewMode } from "../..";
import { getArgsFromParams } from "../utils/url_utils";
import { AppDataProps } from "../types";

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
 * Wrapper around the main ImageViewer component. Handles the collection of parameters from the
 * URL and location state (from routing) to pass to the viewer.
 */
export default function AppWrapper(): ReactElement {
  const location = useLocation();

  const [viewerSettings, setViewerSettings] = useState<Partial<GlobalViewerSettings>>(DEFAULT_VIEWER_SETTINGS);
  const [viewerArgs, setViewerArgs] = useState<AppDataProps>(DEFAULT_APP_PROPS);
  const [searchParams] = useSearchParams();

  useMemo(async () => {
    // On load, fetch parameters from the URL and location state, then merge.
    const locationArgs = location.state as AppDataProps;
    const { args: urlArgs, viewerSettings: urlViewerSettings } = await getArgsFromParams(searchParams);

    setViewerArgs({ ...DEFAULT_APP_PROPS, ...locationArgs, ...urlArgs });
    setViewerSettings({ ...DEFAULT_VIEWER_SETTINGS, ...urlViewerSettings });
  }, []);

  return <ImageViewerApp {...viewerArgs} appHeight="100vh" canvasMargin="0 0 0 0" viewerSettings={viewerSettings} />;
}
