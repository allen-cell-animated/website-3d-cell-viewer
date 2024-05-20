import React from "react";
import { Alert } from "antd";

import { VolumeLoadError, VolumeLoadErrorType } from "@aics/volume-viewer";
const IssueLink: React.FC<React.PropsWithChildren<{ bug?: boolean }>> = ({ bug, children }) => (
  <a
    href={`https://github.com/allen-cell-animated/website-3d-cell-viewer/issues/new${
      bug ? "?template=bug_report.md" : "/choose"
    }`}
    target="_blank"
    rel="noreferrer noopener"
  >
    {children}
  </a>
);

const UNKNOWN_ERROR_DESCRIPTION: React.ReactNode = (
  <>
    An unknown error occurred. Check the browser console for more details. If this looks like a bug,{" "}
    <IssueLink bug>send us a bug report here</IssueLink>.
  </>
);

const ERROR_TYPE_DESCRIPTIONS: { [T in VolumeLoadErrorType]: React.ReactNode } = {
  [VolumeLoadErrorType.UNKNOWN]: (
    <>
      An unknown error occurred while loading volume data. Check the browser console (F12) for more details. If this
      looks like a bug, <IssueLink bug>send us a bug report here</IssueLink>.
    </>
  ),
  [VolumeLoadErrorType.NOT_FOUND]: (
    <>
      The viewer was unable to find any volume data at the specified location. Check that the provided URL is correct
      and try again.
    </>
  ),
  [VolumeLoadErrorType.TOO_LARGE]: (
    <>
      No scale level is available for this volume which fits within our maximum GPU memory footprint. This maximum is
      tuned to ensure compatibility with the majority of browsers. If the volume you&apos;re opening is in OME-Zarr
      format, try adding a lower scale level.
    </>
  ),
  [VolumeLoadErrorType.LOAD_DATA_FAILED]: (
    <>
      The viewer was able to find a source of volume data at the specified location, but encountered an error while
      trying to load it. Check that your dataset is complete and properly formatted. You can also check the browser
      console (F12) for more details about this error. If it looks like a problem on our end,{" "}
      <IssueLink bug>start a bug report here</IssueLink>.
    </>
  ),
  [VolumeLoadErrorType.INVALID_METADATA]: (
    <>
      The viewer was unable to read all necessary information from this volume&apos;s metadata. Check that your
      dataset&apos;s metadata is complete and properly formatted. If you believe your data is valid and should be
      supported by our viewer, <IssueLink>open a GitHub issue here</IssueLink>.
    </>
  ),
  [VolumeLoadErrorType.INVALID_MULTI_SOURCE_ZARR]: <>TODO write message</>,
};

const pickErrorDescription = (error: unknown): React.ReactNode => {
  const type: VolumeLoadErrorType | undefined = (error as VolumeLoadError).type;
  if (!type) {
    return UNKNOWN_ERROR_DESCRIPTION;
  }
  return ERROR_TYPE_DESCRIPTIONS[type] ?? UNKNOWN_ERROR_DESCRIPTION;
};

export type ErrorBannerProps = {
  error: unknown;
};

const ErrorBanner: React.FC<ErrorBannerProps> = (props) => {
  // const test = (
  //   <>
  //     <p style={{ margin: "5px 0" }}>Test line 1</p>
  //     <p style={{ margin: "5px 0" }}>Test line 2</p>
  //   </>
  // );

  return (
    <Alert
      type="error"
      message={pickErrorDescription(props.error)}
      banner
      closable
      style={{ position: "fixed", zIndex: 5000, width: "100%" }}
    />
  );
};

export default ErrorBanner;
