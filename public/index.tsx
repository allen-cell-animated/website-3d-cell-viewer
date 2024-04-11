import React from "react";
import ReactDOM from "react-dom";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import "antd/dist/antd.less";

// Components
import { RenderMode, ViewerChannelSettings, ViewMode } from "../src";
import AppWrapper from "../src/website/components/AppWrapper";
import LandingPage from "../src/website/components/LandingPage";
import { AppProps, GlobalViewerSettings } from "../src/aics-image-viewer/components/App/types";
import StyleProvider from "../src/aics-image-viewer/components/StyleProvider";
import "../src/aics-image-viewer/assets/styles/typography.css";
import "./App.css";

// vars filled at build time using webpack DefinePlugin
console.log(`website-3d-cell-viewer ${WEBSITE3DCELLVIEWER_BUILD_ENVIRONMENT} build`);
console.log(`website-3d-cell-viewer Version ${WEBSITE3DCELLVIEWER_VERSION}`);
console.log(`volume-viewer Version ${VOLUMEVIEWER_VERSION}`);

const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "viewer",
    element: <AppWrapper />,
  },
]);

ReactDOM.render(
  // <ImageViewerApp {...args} appHeight="100vh" canvasMargin="0 0 0 0" viewerSettings={viewerSettings} />,
  <StyleProvider>
    <RouterProvider router={router} />
  </StyleProvider>,
  document.getElementById("cell-viewer")
);
