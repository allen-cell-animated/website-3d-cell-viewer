import { faUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button, Tooltip } from "antd";
import React, { ReactElement, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useSearchParams } from "react-router-dom";
import styled from "styled-components";

import Header from "../Header";
import LoadModal from "../Modals/LoadModal";
import { AppDataProps, DatasetEntry, ProjectEntry } from "../../types";
import { FlexColumnAlignCenter, FlexColumn, FlexRowAlignCenter, VisuallyHidden, FlexRow } from "./utils";
import { parseViewerUrlParams } from "../../utils/url_utils";
import HelpDropdown from "../HelpDropdown";
import { BannerVideo } from "../../assets/videos";

import { landingPageContent } from "./content";

const MAX_CONTENT_WIDTH_PX = 1060;

const Banner = styled(FlexColumnAlignCenter)`
  position: relative;
  --container-padding-x: 20px;
  padding: 40px var(--container-padding-x);
  overflow: hidden;
  margin: 0;
`;

const BannerTextContainer = styled(FlexColumnAlignCenter)`
  --padding-x: 30px;
  padding: 26px var(--padding-x);
  max-width: calc(${MAX_CONTENT_WIDTH_PX}px - 2 * var(--padding-x));

  --total-padding-x: calc(2 * var(--padding-x) + 2 * var(--container-padding-x));
  width: calc(90vw - var(--total-padding-x));
  border-radius: 5px;
  background-color: var(--color-landingpage-banner-highlight-bg);
  gap: 10px;

  & > h1 {
    margin-top: 0;
  }

  && > p {
    font-size: 16px;
    margin: 0;
  }
`;

const BannerVideoContainer = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  width: 100%;
  height: 100%;
  background-color: #000;
  z-index: -1;

  & > div {
    position: absolute;
    width: 100%;
    height: 100%;
    background-image: linear-gradient(90deg, rgba(35, 25, 50, 0.5) 50%, rgba(0, 0, 0, 0) 70%);
    z-index: 3;
  }

  & > video {
    position: absolute;
    width: 100%;
    max-width: 1400px;
    height: 100%;
    left: 35%;
    object-fit: cover;
  }
`;

const ContentContainer = styled(FlexColumn)`
  max-width: ${MAX_CONTENT_WIDTH_PX}px;
  width: calc(90vw - 40px);
  margin: auto;
  padding: 0 20px;
  gap: 20px;

  h2 {
    color: var(--color-text-header);
  }
`;

const FeatureHighlightsContainer = styled.li`
  display: grid;
  width: 100%;
  grid-template-rows: repeat(2, auto);
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  padding: 0;
  justify-content: space-evenly;
  gap: 20px;
  margin: 30px 0 0 0;
`;

const FeatureHighlightsItem = styled(FlexColumn)`
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span 2;

  & > h3 {
    font-weight: 600;
    margin: 0;
  }

  & > p {
    margin: 0;
  }
`;

const Divider = styled.hr`
  display: block;
  width: 100%;
  height: 1px;
  background-color: var(--color-layout-dividers);
  border-style: none;
`;

const ProjectList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 0;
  margin-top: 0;

  // Add a pseudo-element line between cards
  & > li:not(:first-child)::before {
    content: "";
    display: block;
    width: 100%;
    height: 1px;
    background-color: var(--color-layout-dividers);
    margin-bottom: 15px;
  }
`;

const ProjectCard = styled.li`
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 8px;

  & h3 {
    font-weight: 600;
  }

  & p,
  & h3,
  & span {
    margin: 0;
  }

  & a {
    // Add 2px margin to maintain the same visual gap that text has
    margin-top: 2px;
  }
`;

const DatasetList = styled.ul`
  padding: 0;
  width: 100%;
  display: grid;
  // Use grid + subgrid to align the title, description, and button for each horizontal
  // row of cards. repeat is used to tile the layout if the cards wrap to a new line.
  grid-template-rows: repeat(3, auto);
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  justify-content: space-around;
  gap: 10px 20px;
`;

const DatasetCard = styled.li`
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span 3;
  min-width: 180px;
  padding: 5px;

  & > h3 {
    display: grid;
    margin: 0;
  }
  & > p {
    display: grid;
  }
  & > a,
  & > button {
    margin-right: auto;
    display: grid;
  }
`;

const InReviewFlag = styled(FlexRowAlignCenter)`
  border-radius: 4px;
  padding: 1px 6px;
  background-color: var(--color-statusflag-bg);
  height: 22px;
  flex-wrap: wrap;

  && > p {
    margin-bottom: 0;
    color: var(--color-statusflag-text);
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
  }
`;

export default function LandingPage(): ReactElement {
  // Rendering
  const navigation = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if the URL used to open the landing page has arguments;
    // if so, assume that this is an old URL intended to go to the viewer.
    // Navigate to the viewer while preserving URL arguments.
    parseViewerUrlParams(searchParams).then(({ args }) => {
      if (Object.keys(args).length > 0) {
        console.log("Detected URL parameters. Redirecting from landing page to viewer.");
        navigation("viewer" + "?" + searchParams.toString(), {
          state: args,
          replace: true,
        });
      }
    });
  }, []);

  const onClickLoad = (appProps: AppDataProps): void => {
    // TODO: Make URL search params from the appProps and append it to the viewer URL so the URL can be shared directly.
    // Alternatively, AppWrapper should manage syncing URL and viewer props.
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
  };

  // TODO: Should the load buttons be link elements or buttons?
  // Currently both the link and the button inside can be tab-selected.
  const renderDataset = (dataset: DatasetEntry, index: number): ReactElement => {
    // TODO: Use links here instead of button onClicks.
    return (
      <DatasetCard key={index}>
        <h3>{dataset.name}</h3>
        {dataset.description && <p>{dataset.description}</p>}
        <Button type="primary" onClick={() => onClickLoad(dataset.loadParams)}>
          Load<VisuallyHidden> dataset {dataset.name}</VisuallyHidden>
        </Button>
      </DatasetCard>
    );
  };

  const renderProject = (project: ProjectEntry, index: number): ReactElement => {
    const projectNameElement = project.inReview ? (
      <FlexRow $gap={10}>
        <h3>{project.name}</h3>
        <Tooltip title="Final version of dataset will be released when associated paper is published">
          <InReviewFlag>
            <p>IN REVIEW</p>
          </InReviewFlag>
        </Tooltip>
      </FlexRow>
    ) : (
      <h3>{project.name}</h3>
    );

    const publicationElement = project.publicationLink ? (
      <p>
        Related publication:{" "}
        <a
          href={project.publicationLink.toString()}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--color-text-link)" }}
        >
          {project.publicationName}
          {/* Icon offset slightly to align with text */}
          <FontAwesomeIcon icon={faUpRightFromSquare} size="sm" style={{ marginBottom: "-1px", marginLeft: "3px" }} />
          <VisuallyHidden>(opens in new tab)</VisuallyHidden>
        </a>
      </p>
    ) : null;

    const loadParams = project.loadParams;
    const loadButton = loadParams ? (
      <div>
        <Button type="primary" onClick={() => onClickLoad(loadParams)}>
          Load<VisuallyHidden> dataset {project.name}</VisuallyHidden>
        </Button>
      </div>
    ) : null;

    // TODO: Break up list of datasets when too long and hide under collapsible section.
    const datasetList = project.datasets ? <DatasetList>{project.datasets.map(renderDataset)}</DatasetList> : null;

    return (
      <ProjectCard key={index}>
        {projectNameElement}
        <p>{project.description}</p>
        {publicationElement}
        {loadButton}
        {datasetList}
      </ProjectCard>
    );
  };

  const [allowMotion, setAllowMotion] = useState(window.matchMedia("(prefers-reduced-motion: no-preference)").matches);
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: no-preference)");
    mediaQuery.addEventListener("change", () => {
      setAllowMotion(mediaQuery.matches);
    });
    return () => {
      mediaQuery.removeEventListener("change", () => {
        setAllowMotion(mediaQuery.matches);
      });
    };
  }, []);

  return (
    <div style={{ backgroundColor: "var(--color-landingpage-bg)", minHeight: "100%" }}>
      <Header>
        <FlexRowAlignCenter $gap={12}>
          <FlexRowAlignCenter $gap={2}>
            <LoadModal onLoad={onClickLoad} />
          </FlexRowAlignCenter>
          <HelpDropdown />
        </FlexRowAlignCenter>
      </Header>
      <Banner>
        <BannerVideoContainer style={{ zIndex: 1 }}>
          <video autoPlay={allowMotion} loop muted>
            <source src={BannerVideo} type="video/mp4" />
          </video>
          <div></div>
        </BannerVideoContainer>
        <BannerTextContainer style={{ zIndex: 1 }}>
          <h1>Welcome to 3D Volume Viewer</h1>
          <p>
            The 3D Volume Viewer is an open-use web-based tool designed to visualize, analyze and interpret
            multi-channel 3D microscopy data. Ideal for researchers, educators, and students, the viewer offers powerful
            interactive tools to extract key insights from imaging data.
          </p>
        </BannerTextContainer>
      </Banner>

      <ContentContainer $gap={30} style={{ paddingBottom: "400px" }}>
        <FeatureHighlightsContainer>
          <FeatureHighlightsItem>
            <h3>Multiresolution OME-Zarr support</h3>
            <p>Load your cloud hosted OME-Zarr v0.4 images via http(s).</p>
          </FeatureHighlightsItem>
          <FeatureHighlightsItem>
            <h3>Multiple viewing modes</h3>
            <p>Rotate and examine the volume in 3D, or focus on single Z slices in 2D at higher resolution.</p>
          </FeatureHighlightsItem>
          <FeatureHighlightsItem>
            <h3>Time-series playthrough</h3>
            <p>Interactively explore dynamics and manipulate timelapse videos realtime in 2D or 3D.</p>
          </FeatureHighlightsItem>
          <FeatureHighlightsItem>
            <h3>Customizable settings</h3>
            <p>
              Switch colors, turn channels on and off or apply a threshold to reveal interesting features in the data.
            </p>
          </FeatureHighlightsItem>
        </FeatureHighlightsContainer>
        <Divider />
        <FlexColumnAlignCenter>
          <h2>Load an example below or your own data to get started.</h2>
        </FlexColumnAlignCenter>
        <ProjectList>{landingPageContent.map(renderProject)}</ProjectList>
      </ContentContainer>
    </div>
  );
}
