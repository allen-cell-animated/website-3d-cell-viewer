import React from "react";
import ReactDOM from "react-dom";
import { createBrowserRouter, createHashRouter, RouterProvider } from "react-router-dom";

// Components
import AppWrapper from "../website/components/AppWrapper";
import LandingPage from "../website/components/LandingPage";
import ErrorPage from "../website/components/ErrorPage";
import { isQueryStringPath, convertQueryStringPathToUrl } from "../website/utils/gh_route_utils";
import StyleProvider from "../src/aics-image-viewer/components/StyleProvider";
import "./App.css";

// vars filled at build time using webpack DefinePlugin
console.log(`website-3d-cell-viewer ${WEBSITE3DCELLVIEWER_BUILD_ENVIRONMENT} build`);
console.log(`website-3d-cell-viewer Version ${WEBSITE3DCELLVIEWER_VERSION}`);
console.log(`website-3d-cell-viewer Basename ${WEBSITE3DCELLVIEWER_BASENAME}`);
console.log(`volume-viewer Version ${VOLUMEVIEWER_VERSION}`);

const basename = WEBSITE3DCELLVIEWER_BASENAME;

// Check for redirects in the query string, and update browser history state.
const locationUrl = new URL(window.location.toString());
if (isQueryStringPath(locationUrl)) {
  const url = convertQueryStringPathToUrl(locationUrl);
  const newRelativePath = url.pathname + url.search + url.hash;
  console.log("Redirecting to " + newRelativePath);
  // Replaces the query string path with the original path now that the
  // single-page app has loaded. This lets routing work as normal below.
  window.history.replaceState(null, "", newRelativePath);
}

const routes = [
  {
    path: "/",
    element: <LandingPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: "viewer",
    element: <AppWrapper />,
    errorElement: <ErrorPage />,
  },
];

const router = createHashRouter(routes, { basename: basename });

ReactDOM.render(
  <StyleProvider>
    <RouterProvider router={router} />
  </StyleProvider>,
  document.getElementById("cell-viewer")
);
