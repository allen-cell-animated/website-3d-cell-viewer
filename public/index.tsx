import React from "react";
import ReactDOM from "react-dom";
import { createBrowserRouter, createHashRouter, RouterProvider } from "react-router-dom";

// import "antd/dist/antd.less";

// Components
import AppWrapper from "../src/website/components/AppWrapper";
import LandingPage from "../src/website/components/LandingPage";
import ErrorPage from "../src/website/components/ErrorPage";
import StyleProvider from "../src/aics-image-viewer/components/StyleProvider";
import "../src/aics-image-viewer/assets/styles/typography.css";
import "./App.css";

// vars filled at build time using webpack DefinePlugin
console.log(`website-3d-cell-viewer ${WEBSITE3DCELLVIEWER_BUILD_ENVIRONMENT} build`);
console.log(`website-3d-cell-viewer Version ${WEBSITE3DCELLVIEWER_VERSION}`);
console.log(`volume-viewer Version ${VOLUMEVIEWER_VERSION}`);

const routes = [
  {
    path: "/",
    element: <LandingPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: "viewer",
    element: <AppWrapper />,
  },
];

let router;
if (WEBSITE3DCELLVIEWER_BUILD_ENVIRONMENT === "dev") {
  router = createBrowserRouter(routes);
} else {
  // Production mode.
  // TODO: Use createBrowserRouter when building to S3.
  router = createHashRouter(routes);
}

ReactDOM.render(
  <StyleProvider>
    <RouterProvider router={router} />
  </StyleProvider>,
  document.getElementById("cell-viewer")
);
