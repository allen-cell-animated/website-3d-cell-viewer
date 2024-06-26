import React, { ReactElement, useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { FlexRowAlignCenter } from "./LandingPage/utils";
import LoadModal from "./LoadModal";
import Header, { HEADER_HEIGHT_PX } from "./Header";
import HelpDropdown from "./HelpDropdown";
import ShareModal from "./ShareModal";
import { ImageViewerApp, ViewerStateProvider } from "../../src";
import { ViewerState } from "../../src/aics-image-viewer/components/ViewerStateProvider/types";
import { AppDataProps } from "../types";
import { getArgsFromParams } from "../utils/url_utils";

const DEFAULT_APP_PROPS: AppDataProps = {
  imageUrl: "",
  cellId: "",
  imageDownloadHref: "",
  parentImageDownloadHref: "",
  viewerChannelSettings: {
    groups: [
      {
        name: "Channels",
        channels: [
          { match: [0, 1, 2], enabled: true },
          { match: "(.+)", enabled: false },
        ],
      },
    ],
  },
};

/**
 * Wrapper around the main ImageViewer component. Handles the collection of parameters from the
 * URL and location state (from routing) to pass to the viewer.
 */
export default function AppWrapper(): ReactElement {
  const location = useLocation();
  const navigation = useNavigate();

  const [viewerSettings, setViewerSettings] = useState<Partial<ViewerState> | null>(null);
  const [viewerProps, setViewerProps] = useState<AppDataProps | null>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // On load, fetch parameters from the URL and location state, then merge.
    const locationArgs = location.state as AppDataProps;
    getArgsFromParams(searchParams).then(
      ({ args: urlArgs, viewerSettings: urlViewerSettings }) => {
        setViewerProps({ ...DEFAULT_APP_PROPS, ...urlArgs, ...locationArgs });
        setViewerSettings({ ...urlViewerSettings, ...locationArgs?.viewerSettings });
      },
      (reason) => {
        console.warn("Failed to parse URL parameters: ", reason);
        setViewerProps({ ...DEFAULT_APP_PROPS, ...locationArgs });
        setViewerSettings({});
      }
    );
  }, []);

  // TODO: Disabled for now, since it only makes sense for Zarr/OME-tiff URLs. Checking for
  // validity may be more complex. (Also, we could add a callback to `ImageViewerApp` for successful
  // loading and only save the URL then.)
  //
  // Save recent zarr data urls
  // useEffect(() => {
  //   if (typeof viewerArgs.imageUrl === "string" && isValidZarrUrl(viewerArgs.imageUrl)) {
  //     // TODO: Handle case where there are multiple URLs?
  //     // TODO: Save ALL AppProps instead of only the URL? Ignore/handle rawData?
  //     addRecentDataUrl({ url: viewerArgs.imageUrl as string, label: viewerArgs.imageUrl as string });
  //   }
  // }, [viewerArgs]);

  const onLoad = (appProps: AppDataProps): void => {
    // Force a page reload. This prevents a bug where a desync in the number of channels
    // in the viewer can cause a crash. The root cause is React immediately forcing a
    // re-render every time `setState` is called in an async function.
    const url = appProps.imageUrl;
    if (Array.isArray(url)) {
      navigation(`/viewer?url=${encodeURIComponent(url.join(","))}`, {
        state: appProps,
      });
    } else {
      navigation(`/viewer?url=${encodeURIComponent(url)}`, {
        state: appProps,
      });
    }
    navigation(0);
  };

  return (
    <div>
      <Header noNavigate>
        <FlexRowAlignCenter $gap={12}>
          <FlexRowAlignCenter $gap={2}>
            <LoadModal onLoad={onLoad} />
            {viewerProps && <ShareModal appProps={viewerProps} />}
          </FlexRowAlignCenter>
          <HelpDropdown />
        </FlexRowAlignCenter>
      </Header>
      {viewerProps && viewerSettings && (
        <ViewerStateProvider viewerSettings={viewerSettings}>
          <ImageViewerApp {...viewerProps} appHeight={`calc(100vh - ${HEADER_HEIGHT_PX}px)`} canvasMargin="0 0 0 0" />
        </ViewerStateProvider>
      )}
    </div>
  );
}
