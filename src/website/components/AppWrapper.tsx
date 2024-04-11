import React, { ReactElement, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { AppProps, GlobalViewerSettings } from "../../aics-image-viewer/components/App/types";
import { ImageViewerApp, RenderMode, ViewMode } from "../..";
import { getArgsFromQueryString } from "../utils/url_utils";

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

/**
 * Renders additional components around the main ImageViewer component, and also collects URL and navigation state params
 * to pass to the viewer.
 */
export default function AppWrapper(props: AppWrapperProps): ReactElement {
  const location = useLocation();

  // TODO: Update this with the load parameter later :)
  const [viewerSettings, setViewerSettings] = useState<Partial<GlobalViewerSettings>>(DEFAULT_VIEWER_SETTINGS);
  const [viewerArgs, setViewerArgs] = useState<AppProps | undefined>(undefined);

  useMemo(async () => {
    // Collect navigation state params (AppProps)
    const locationArgs = location.state as AppProps;
    // Fetching URL query parameters is async, so we need to do it here
    const { args, viewerSettings } = await getArgsFromQueryString();

    setViewerArgs({ ...locationArgs, ...args });
    setViewerSettings({ ...DEFAULT_VIEWER_SETTINGS, ...viewerSettings });
  }, []);

  return (
    <>
      {viewerArgs && viewerSettings ? (
        <ImageViewerApp {...viewerArgs} appHeight="100vh" canvasMargin="0 0 0 0" viewerSettings={viewerSettings} />
      ) : (
        <p>Loading...</p>
      )}
    </>
  );
}
