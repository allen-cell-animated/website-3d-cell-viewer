import { theme as AntTheme, ConfigProvider } from "antd";
import React, { PropsWithChildren, ReactElement } from "react";

import styled, { css } from "styled-components";

const palette = {
  black: "#000000",
  white: "#ffffff",
  ltGrey: "#bfbfbf",
  purpleGrey: "#aeacae",
  medLtGreyAlt: "#a0a0a0",
  medGrey: "#6e6e6e",
  medDarkGrey: "#4b4b4b",
  darkGrey: "#313131",
  veryDarkGrey: "#222222",
  ltPurple: "#aa88ed",
  medPurple: "#9e6aff",
  darkPurple: "#7e46d4",
  veryDarkPurple: "#5f369f",
  veryLtPurple: "#e7e4f2",
  brightRed: "#ff4d4d",
  brightGreen: "#61d900",
  brightBlue: "#0099ff",
};

const theme = {
  colors: {
    theme: {
      primary: palette.medPurple,
      primaryLt: palette.ltPurple,
      primaryDk: palette.darkPurple,
      success: palette.brightGreen,
      error: palette.brightRed,
      warning: palette.brightRed,
      info: palette.brightBlue,
    },
    text: {
      link: palette.brightBlue,
      header: palette.ltGrey,
      section: palette.white,
      body: palette.ltGrey,
      error: palette.brightRed,
      selectionBg: palette.medPurple,
      selectionText: palette.white,
    },
    header: {
      bg: palette.veryDarkGrey,
      border: palette.medGrey,
      title: palette.medPurple,
      hoverTitle: palette.ltPurple,
    },
    // TODO: Buttons could have a shared type
    // with properties for bg, text, and outline across hover/focus,
    // active, and disabled states. This could then be defined for
    // each of the button types (primary, secondary, tertiary).
    button: {
      primary: {
        bg: palette.medPurple,
        text: palette.white,
        hoverBg: palette.ltPurple,
        activeOutline: palette.medPurple,
        disabledBg: palette.medDarkGrey,
      },
      link: {
        text: palette.medPurple,
      },
      secondary: {
        bg: "transparent",
        text: palette.ltGrey,
        outline: palette.ltGrey,
        hoverOutline: palette.ltPurple,
        hoverText: palette.ltPurple,
        activeOutline: palette.medPurple,
        activatedText: palette.white,
        activatedBg: palette.medDarkGrey,
        activatedOutline: palette.purpleGrey,
        disabledText: palette.medGrey,
      },
    },
    checkbox: {
      bg: palette.medGrey,
      hoverBg: palette.medLtGreyAlt,
    },
    controlPanel: {
      bg: palette.darkGrey,
      border: palette.medGrey,
      text: palette.ltGrey,
      sectionBg: palette.medDarkGrey,
      drawerBg: palette.veryDarkGrey,
    },
    toolbar: {
      buttonBg: "#000000cc",
    },
    landingPage: {
      bg: palette.veryDarkGrey,
      text: palette.ltGrey,
      bannerBg: "#020202DB",
    },
    statusFlag: {
      bg: palette.veryLtPurple,
      text: palette.veryDarkPurple,
    },
    layout: {
      dividers: palette.medGrey,
      split: palette.white,
    },
    menu: {
      selectedBg: palette.ltPurple,
      textPlaceholder: palette.ltPurple,
    },
    tooltip: {
      bg: palette.black,
    },
    modal: {
      maskBg: "#000000cc",
      bg: palette.veryDarkGrey,
      border: palette.medDarkGrey,
    },
  },
  fonts: {
    family: "'Open Sans', Arial, sans-serif",
  },
};

type AppTheme = typeof theme;

/** Makes theme styling available to child components via CSS variables. */
const CssProvider = styled.div<{ $theme: AppTheme }>`
  width: 100%;
  height: 100%;

  ${({ $theme }) => {
    return css`
      /* Component and color variables. */
      --color-text-link: ${$theme.colors.text.link};
      --color-text-header: ${$theme.colors.text.header};
      --color-text-section: ${$theme.colors.text.section};
      --color-text-body: ${$theme.colors.text.body};
      --color-text-error: ${$theme.colors.text.error};

      --color-text-selection-bg: ${$theme.colors.text.selectionBg};
      --color-text-selection-text: ${$theme.colors.text.selectionText};

      --color-header-title: ${$theme.colors.header.title};
      --color-header-hover-title: ${theme.colors.header.hoverTitle};
      --color-header-bg: ${$theme.colors.header.bg};
      --color-header-border: ${$theme.colors.header.border};

      --color-button-primary-bg: ${$theme.colors.button.primary.bg};
      --color-button-primary-text: ${$theme.colors.button.primary.text};
      --color-button-primary-hover-bg: ${$theme.colors.button.primary.hoverBg};
      --color-button-primary-active-bg: ${$theme.colors.button.primary.hoverBg};
      --color-button-primary-active-outline: ${$theme.colors.button.primary.activeOutline};
      --color-button-primary-disabled-bg: ${$theme.colors.button.primary.disabledBg};

      --color-button-link-text: ${$theme.colors.button.link.text};

      --color-button-default-bg: transparent;
      --color-button-default-text: ${$theme.colors.button.secondary.text};
      --color-button-default-outline: ${$theme.colors.button.secondary.outline};
      --color-button-default-hover-outline: ${$theme.colors.button.secondary.hoverOutline};
      --color-button-default-hover-text: ${$theme.colors.button.secondary.hoverText};
      --color-button-default-active-outline: ${$theme.colors.button.secondary.activeOutline};
      --color-button-default-active-text: ${$theme.colors.button.secondary.hoverText};

      --color-button-icon-disabled-text: ${$theme.colors.button.secondary.disabledText};
      --color-button-icon-activated-text: ${$theme.colors.button.secondary.activatedText};
      --color-button-icon-activated-bg: ${$theme.colors.button.secondary.activatedBg};
      --color-button-icon-activated-outline: ${$theme.colors.button.secondary.activatedOutline};

      --color-toolbar-button-bg: ${$theme.colors.toolbar.buttonBg};

      --color-controlpanel-bg: ${$theme.colors.controlPanel.bg};
      --color-controlpanel-border: ${$theme.colors.controlPanel.border};
      --color-controlpanel-text: ${$theme.colors.controlPanel.text};
      --color-controlpanel-section-bg: ${$theme.colors.controlPanel.sectionBg};
      --color-controlpanel-drawer-bg: ${$theme.colors.controlPanel.drawerBg};

      --color-landingpage-bg: ${$theme.colors.landingPage.bg};
      --color-landingpage-text: ${$theme.colors.landingPage.text};
      --color-landingpage-banner-highlight-bg: ${$theme.colors.landingPage.bannerBg};

      --color-statusflag-bg: ${$theme.colors.statusFlag.bg};
      --color-statusflag-text: ${$theme.colors.statusFlag.text};

      --color-layout-dividers: ${$theme.colors.layout.dividers};

      --color-checkbox-bg: ${$theme.colors.checkbox.bg};

      --font-family: ${$theme.fonts.family};
    `;
  }}

  h1, h2, h3, h4, p {
    font-family: var(--font-family);
  }

  h1 {
    color: var(--color-text-header);
    font-size: 28px;
    font-weight: 400;
  }

  h2 {
    color: var(--color-text-section);
    font-size: 19px;
    font-weight: 400;
  }

  h3 {
    font-family: var(--font-family);
    color: var(--color-text-header);
    font-size: 16px;
    font-weight: 600;
  }

  h4 {
    font-family: var(--font-family);
    color: var(--color-text-header);
    font-size: 14px;
    font-weight: 400;
  }

  p {
    font-family: var(--font-family);
    color: var(--color-text-body);
    font-size: 14px;
    font-weight: 400;
  }

  a {
    color: var(--color-text-link);
    &:not(:focus-visible) {
      text-decoration: none;
    }

    &:focus-visible {
      text-decoration: underline;
    }
  }

  & *::selection {
    background-color: var(--color-text-selection-bg);
    color: var(--color-text-selection-text);
  }

  /** TODO: Go through these styles and see if we can use Ant ConfigProvider for them instead. */
  .ant-btn-link,
  .ant-btn-text,
  .ant-btn-primary,
  .ant-btn-icon-only {
    box-shadow: none;

    &:hover:not(:disabled),
    &:focus-visible:not(:disabled) {
      background-color: var(--color-button-primary-hover-bg);
      border-color: var(--color-button-primary-hover-bg);
      color: var(--color-button-primary-text);
    }

    &:active:not(:disabled) {
      background-color: var(--color-button-primary-hover-bg);
      border: 1px solid var(--color-button-primary-active-outline);
      color: var(--color-button-primary-text);
    }
  }

  .ant-btn-icon-only:disabled {
    color: var(--color-button-icon-disabled-text);
  }

  .ant-btn-link:not(:disabled) {
    // Change from default blue link text
    color: var(--color-button-link-text);
  }

  /**
   * Tertiary style buttons. Grey outline by default, turns to light
   * purple outline on hover.
   */
  .ant-btn-default:not(.ant-btn-icon-only) {
    background-color: var(--color-button-default-bg);
    color: var(--color-button-default-text);
    border-color: var(--color-button-default-outline);

    &:hover:not(:disabled),
    &:focus-visible:not(:disabled) {
      background-color: transparent;
      border-color: var(--color-button-default-hover-bg);
      color: var(--color-button-default-hover-text);
    }

    &:active:not(:disabled) {
      background-color: transparent;
      border-color: var(--color-button-default-active-outline);
      color: var(--color-button-default-active-text);
    }
  }

  // Overrides for checkbox styling
  & .ant-checkbox-input {
    &:hover,
    &:focus-visible {
      border: 1px solid white;
    }
  }

  & .ant-checkbox.ant-checkbox-checked {
    background-color: var(--color-checkbox-bg);
  }

  .ant-checkbox-inner {
    background-color: transparent;
  }

  & .ant-checkbox-indeterminate.checked .ant-checkbox-inner {
    background-color: var(--color-checkbox-bg);
  }

  // Add outlines to modals and notifications
  & .ant-notification-notice-wrapper,
  & .ant-modal-content {
    border: 1px solid ${theme.colors.modal.border};
  }
`;

/**
 * Provides CSS variables and global styling for the image viewer.
 */
export default function StyleProvider(props: PropsWithChildren<{}>): ReactElement {
  const { darkAlgorithm } = AntTheme;

  return (
    <ConfigProvider
      theme={{
        algorithm: darkAlgorithm,
        token: {
          colorPrimary: theme.colors.theme.primary,
          colorPrimaryHover: theme.colors.theme.primaryLt,
          colorLink: theme.colors.text.link,
          colorBgBase: theme.colors.controlPanel.bg,
          colorBgContainer: "transparent",
          colorSplit: theme.colors.layout.split,
          colorPrimaryTextHover: theme.colors.text.selectionText,
          fontWeightStrong: 400,
          colorBgElevated: palette.darkGrey,
        },
        components: {
          Button: {
            defaultShadow: "",
            primaryColor: theme.colors.button.primary.text,
            defaultHoverBg: theme.colors.button.secondary.bg,
            defaultActiveBg: theme.colors.button.secondary.bg,
            defaultActiveBorderColor: theme.colors.button.secondary.activeOutline,
          },
          Card: {
            borderRadiusLG: 0,
            headerHeight: 48,
          },
          Collapse: {
            borderRadiusLG: 0,
          },
          Layout: {
            siderBg: theme.colors.controlPanel.bg,
          },
          Checkbox: {
            borderRadiusSM: 2,
            colorBgContainer: theme.colors.checkbox.bg,
            colorPrimary: theme.colors.checkbox.bg,
            colorPrimaryHover: theme.colors.checkbox.hoverBg,
          },
          Radio: {},
          Select: {
            optionSelectedBg: theme.colors.menu.selectedBg,
          },
          Tooltip: {
            colorBgSpotlight: theme.colors.tooltip.bg,
          },
          Modal: {
            colorBgMask: theme.colors.modal.maskBg,
            contentBg: theme.colors.modal.bg,
            headerBg: theme.colors.modal.bg,
            footerBg: theme.colors.modal.bg,
            titleFontSize: 19,
          },
        },
      }}
    >
      <CssProvider $theme={theme}>{props.children}</CssProvider>
    </ConfigProvider>
  );
}
