import { faUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button, Tooltip } from "antd";
import React, { ReactElement } from "react";

import { landingPageContent } from "./content";
import { DatasetEntry, ProjectEntry, ViewerArgs } from "../../types";

import "./styles.css";

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
          Load<span className="hidden-text"> dataset {dataset.name}</span>
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
          <span className="hidden-text">(opens in new tab)</span>
        </a>
      </p>
    ) : null;

    const loadParams = project.loadParams;
    const loadButton = loadParams ? (
      <Button type="primary" onClick={() => props.load(loadParams)}>
        Load<span className="hidden-text"> dataset {project.name}</span>
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
