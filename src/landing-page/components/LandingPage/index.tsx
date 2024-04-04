import { faUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button, Tooltip } from "antd";
import React, { ReactElement } from "react";

import { landingPageContent } from "./content";
import { DatasetEntry, ProjectEntry, ViewerArgs } from "../../types";
import styled from "styled-components";
import { FlexColumnAlignCenter, FlexColumn, FlexRowAlignCenter, VisuallyHidden } from "./utils";

const Banner = styled(FlexColumnAlignCenter)`
  position: relative;
  --container-padding-x: 20px;
  padding: 30px var(--container-padding-x);
  overflow: hidden;
  margin: 0;
`;

const BannerTextContainer = styled(FlexColumn)`
  --padding-x: 30px;
  padding: var(--padding-x);
  max-width: calc(1060px - 2 * var(--padding-x));

  --total-padding-x: calc(2 * var(--padding-x) + 2 * var(--container-padding-x));
  width: calc(90vw - var(--total-padding-x));
  border-radius: 5px;
  // Fallback in case color-mix is unsupported.
  background-color: var(--color-background);
  // Make the background slightly transparent. Note that this may fail on internet explorer.
  background-color: color-mix(in srgb, var(--color-background) 80%, transparent);
  box-shadow: 0 4px 4px rgba(0, 0, 0, 0.3);
  gap: 10px;

  & > h1 {
    margin-top: 0;
  }

  & > p {
    font-size: var(--font-size-label);
  }
`;

const BannerVideoContainer = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  width: 100%;
  height: 100%;
  background-color: #ded9ef;
  z-index: -1;

  & > video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    // Fixes a bug where a single pixel black outline would appear around the video.
    clip-path: inset(1px 1px);
  }
`;

const ContentContainer = styled(FlexColumn)`
  max-width: 1060px;
  width: calc(90vw - 40px);
  margin: auto;
  padding: 0 20px;
`;

const FeatureHighlightsContainer = styled.li`
  display: grid;
  width: 100%;
  grid-template-rows: repeat(2, auto);
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  padding: 0;
  justify-content: space-evenly;
  gap: 10px;
  margin: 20px 0;
`;

const FeatureHighlightsItem = styled(FlexColumn)`
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span 2;

  & > h3 {
    font-weight: 600;
  }
`;

const Divider = styled.hr`
  display: block;
  width: 100%;
  height: 1px;
  background-color: var(--color-borders);
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
    background-color: var(--color-borders);
    margin-bottom: 10px;
  }
`;

const ProjectCard = styled.li`
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 12px;

  & h3 {
    font-weight: 600;
  }
`;

const DatasetList = styled.ol`
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

  & > h4 {
    text-align: center;
    display: grid;
    margin: 0;
  }
  & > p {
    text-align: center;
    display: grid;
  }
  & > a {
    margin: auto;
    display: grid;
  }
`;

const InReviewFlag = styled(FlexRowAlignCenter)`
  border-radius: 4px;
  padding: 1px 6px;
  background-color: var(--color-flag-background);
  height: 22px;
  flex-wrap: wrap;

  & > p {
    color: var(--color-flag-text);
    font-size: 10px;
    font-weight: 700;
    white-space: nowrap;
  }
`;

type LandingPageProps = {
  load: (args: ViewerArgs) => void;
};

export default function LandingPage(props: LandingPageProps): ReactElement {
  // Rendering

  // TODO: Should the load buttons be link elements or buttons?
  // Currently both the link and the button inside can be tab-selected.
  const renderDataset = (dataset: DatasetEntry, index: number): ReactElement => {
    return (
      <div className="" key={index}>
        <h4>{dataset.name}</h4>
        <p>{dataset.description}</p>
        <Button type="primary" onClick={() => props.load(dataset.loadParams)}>
          Load<VisuallyHidden> dataset {dataset.name}</VisuallyHidden>
        </Button>
      </div>
    );
  };

  const renderProject = (project: ProjectEntry, index: number): ReactElement => {
    const projectNameElement = project.inReview ? (
      <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "space-between" }}>
        <h3>{project.name}</h3>
        <Tooltip title="Final version of dataset will be released when associated paper is published">
          <div className="in-review-flag">
            <p>IN REVIEW</p>
          </div>
        </Tooltip>
      </div>
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
      <Button type="primary" onClick={() => props.load(loadParams)}>
        Load<VisuallyHidden> dataset {project.name}</VisuallyHidden>
      </Button>
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

  return (
    <>
      {/* <Header>
        <FlexRowAlignCenter $gap={15}>
          <LoadDatasetButton onLoad={onDatasetLoad} currentResourceUrl={""} />
          <HelpDropdown />
        </FlexRowAlignCenter>
      </Header> */}
      <div className="banner">
        <div className="banner-video-container">
          <video autoPlay loop muted>
            <source src="/banner_video.mp4" type="video/mp4" />
          </video>
        </div>
        <BannerTextContainer>
          <h1>Welcome to Timelapse Feature Explorer</h1>
          <p>
            The Timelapse Feature Explorer is a web-based application designed for the interactive visualization and
            analysis of segmented time-series microscopy data. Ideal for biomedical researchers and other data
            professionals, it offers an intuitive set of tools for scientific research and deeper understanding of
            dynamic datasets.
          </p>
        </BannerTextContainer>
      </div>

      <br />
      <ContentContainer $gap={10}>
        <FeatureHighlightsContainer>
          <FeatureHighlightsItem>
            <h3>Dynamic color mapping</h3>
            <p>Customizable colormaps to understand patterns and trends within time lapse data.</p>
          </FeatureHighlightsItem>
          <FeatureHighlightsItem>
            <h3>Interactive data exploration</h3>
            <p>Easily switch between features for focused analysis or comparing different datasets.</p>
          </FeatureHighlightsItem>
          <FeatureHighlightsItem>
            <h3>Temporal navigation controls</h3>
            <p>
              Feature-rich playback controls to observe motion and dynamics over time, revealing trends and anomalies.
            </p>
          </FeatureHighlightsItem>
          <FeatureHighlightsItem>
            <h3>Feature extraction and visualization</h3>
            <p>
              Integrated plots show feature evolution, outliers, clusters and other patterns facilitating a nuanced
              understanding of temporal dynamics.
            </p>
          </FeatureHighlightsItem>
        </FeatureHighlightsContainer>
        <Divider />
        <FlexColumnAlignCenter>
          <h2>Load dataset(s) below or your own data to get started</h2>
        </FlexColumnAlignCenter>
        <ProjectList>{landingPageContent.map(renderProject)}</ProjectList>
      </ContentContainer>
    </>
  );
}
