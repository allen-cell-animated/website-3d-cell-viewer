import React, { ReactElement, useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { FlexRowAlignCenter } from "./LandingPage/utils";
import LoadModal from "./LoadModal";
import Header, { HEADER_HEIGHT_PX } from "./Header";
import HelpDropdown from "./HelpDropdown";
import ShareModal from "./ShareModal";
import { ImageViewerApp, RenderMode, ViewMode } from "../../src";
import { GlobalViewerSettings } from "../../src/aics-image-viewer/components/App/types";
import { AppDataProps } from "../types";
import { getArgsFromParams } from "../utils/url_utils";

type AppWrapperProps = {
  viewerSettings?: Partial<GlobalViewerSettings>;
  viewerArgs?: AppDataProps;
};

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

const defaultAppWrapperProps = {
  viewerSettings: DEFAULT_VIEWER_SETTINGS,
  viewerArgs: DEFAULT_APP_PROPS,
};

/**
 * Wrapper around the main ImageViewer component. Handles the collection of parameters from the
 * URL and location state (from routing) to pass to the viewer.
 */
export default function AppWrapper(inputProps: AppWrapperProps): ReactElement {
  const props = { ...defaultAppWrapperProps, ...inputProps };
  const location = useLocation();
  const navigation = useNavigate();

  const [viewerSettings, setViewerSettings] = useState<Partial<GlobalViewerSettings>>(props.viewerSettings);
  const [viewerArgs, setViewerArgs] = useState<AppDataProps>(props.viewerArgs);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // On load, fetch parameters from the URL and location state, then merge.
    const locationArgs = location.state as AppDataProps;
    getArgsFromParams(searchParams).then(({ args: urlArgs, viewerSettings: urlViewerSettings }) => {
      setViewerArgs({ ...DEFAULT_APP_PROPS, ...urlArgs, ...locationArgs });
      setViewerSettings({ ...DEFAULT_VIEWER_SETTINGS, ...urlViewerSettings });
    });
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
      <Header>
        <FlexRowAlignCenter $gap={15}>
          <FlexRowAlignCenter $gap={2}>
            <LoadModal onLoad={onLoad} />
            <ShareModal appProps={viewerArgs} />
          </FlexRowAlignCenter>
          <HelpDropdown />
        </FlexRowAlignCenter>
      </Header>
      <ImageViewerApp
        {...viewerArgs}
        appHeight={`calc(100vh - ${HEADER_HEIGHT_PX}px)`}
        canvasMargin="0 0 0 0"
        viewerSettings={viewerSettings}
      />
    </div>
  );
}
