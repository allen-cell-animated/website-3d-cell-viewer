import React, { ReactElement, useState } from "react";
import { useLocation } from "react-router-dom";
import { AppProps, GlobalViewerSettings } from "./aics-image-viewer/components/App/types";
import { ImageViewerApp, RenderMode, ViewMode } from ".";

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
  // Collect navigation state params (AppProps)
  const locationArgs = location.state as AppProps;
  // TODO: Update this with the load parameter later :)
  const [viewerProps] = useState(locationArgs);

  return (
    <ImageViewerApp
      {...viewerProps}
      appHeight="100vh"
      canvasMargin="0 0 0 0"
      viewerSettings={DEFAULT_VIEWER_SETTINGS}
    />
  );
}
