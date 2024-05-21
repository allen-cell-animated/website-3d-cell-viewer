import React from "react";
import { Alert, Button } from "antd";
import { VolumeLoadError, VolumeLoadErrorType } from "@aics/volume-viewer";
import { RightOutlined } from "@ant-design/icons";

import "./styles.css";

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
    An unknown error occurred. Check the browser console (F12) for more details. If this looks like a bug,{" "}
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
      tuned to ensure compatibility with the majority of browsers. If you&apos;re trying to load your own OME-Zarr
      dataset, you may be able to open this volume by including a lower scale level.
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
      supported by our viewer, let us know by <IssueLink>opening a GitHub issue</IssueLink>.
    </>
  ),
  [VolumeLoadErrorType.INVALID_MULTI_SOURCE_ZARR]: (
    <>
      The viewer is currently configured to consolidate multiple OME-Zarr datasets into a single volume, but the
      provided datasets can&apos;t all be matched up. Ensure that all dataset URLs are correct and that at least one
      equivalently-sized scale level exists in all datasets.
    </>
  ),
};

const pickErrorDescription = (error: unknown): React.ReactNode => {
  const type: VolumeLoadErrorType | undefined = (error as VolumeLoadError).type;
  if (!type) {
    return UNKNOWN_ERROR_DESCRIPTION;
  }
  return ERROR_TYPE_DESCRIPTIONS[type] ?? UNKNOWN_ERROR_DESCRIPTION;
};

export type ErrorBannerProps = {
  errors: unknown;
  setErrors?: (errors: React.SetStateAction<unknown[]>) => void;
};

const ErrorBanner: React.FC<ErrorBannerProps> = ({ errors, setErrors }) => {
  const [showDetails, setShowDetails] = React.useState(false);
  const error = Array.isArray(errors) ? errors[0] : errors;

  const errorTitle = (error instanceof Error && error.toString?.()) || "An error occurred";

  const errorMessage = (
    <>
      <div>
        {errorTitle}
        <Button type="text" onClick={() => setShowDetails(!showDetails)}>
          {showDetails ? " show less info" : " show more info"}
        </Button>
      </div>
      <div style={{ display: showDetails ? undefined : "none" }}>{pickErrorDescription(error)}</div>
    </>
  );

  const nextError = Array.isArray(errors) && setErrors && errors.length > 1 && (
    <Button type="text" onClick={() => setErrors((errs) => errs.slice(1))}>
      {errors.length - 1} more errors <RightOutlined />
    </Button>
  );

  return (
    <Alert
      banner
      type="error"
      className="load-error-banner"
      message={errorMessage}
      closable
      afterClose={() => Array.isArray(errors) && setErrors?.([])}
      action={nextError}
    />
  );
};

export const useErrorBanner = (): [React.ReactNode, (error: unknown) => void] => {
  const [errorList, setErrorList] = React.useState<unknown[]>([]);
  const addError = React.useCallback((error: unknown) => setErrorList((prev) => [...prev, error]), []);

  const ErrorBannerComponent = errorList.length > 0 && <ErrorBanner errors={errorList} setErrors={setErrorList} />;
  return [ErrorBannerComponent, addError];
};

export default ErrorBanner;
