import React, { PropsWithChildren, ReactElement } from "react";
import { theme as AntTheme, ConfigProvider } from "antd";

// import "./styles.css";
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
      secondary: palette.ltPurple,
      success: palette.brightGreen,
      error: palette.brightRed,
      warning: palette.brightRed,
      info: palette.brightBlue,
    },
    text: {
      link: palette.brightBlue,
      title: palette.medPurple,
      header: palette.ltGrey,
      body: palette.ltGrey,
      selectionBg: palette.medPurple,
      selectionText: palette.white,
    },
    header: {
      icon: palette.white,
      bg: palette.veryDarkGrey,
      border: palette.medGrey,
    },
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
        hoverBg: palette.ltPurple,
        hoverText: palette.white,
        disabledText: palette.medLtGreyAlt,
      },
      secondary: {
        text: palette.medPurple,
        outline: palette.medPurple,
        hoverBg: palette.ltPurple,
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
    },
  },
  fonts: {
    family: "'Open Sans', Arial, sans-serif",
  },
};

type AppTheme = typeof theme;

const CssProvider = styled.div<{ $theme: AppTheme }>`
  width: 100%;
  height: 100%;

  ${({ $theme }) => {
    return css`
      /* Component and color variables.
       * TODO: use these to control component colors instead of the currently
       * hard-coded colors in the components.
       */
      --color-header-text: ${$theme.colors.text.header};
      --color-header-icon: ${$theme.colors.header.icon};
      --color-header-bg: ${$theme.colors.header.bg};
      --color-header-border: ${$theme.colors.header.border};

      --color-button-primary-bg: ${$theme.colors.button.primary.bg};
      --color-button-primary-text: ${$theme.colors.button.primary.text};
      --color-button-primary-hover-bg: ${$theme.colors.button.primary.hoverBg};
      --color-button-primary-active-outline: ${$theme.colors.button.primary.activeOutline};
      --color-button-primary-disabled-bg: ${$theme.colors.button.primary.disabledBg};

      --color-button-link-text: ${$theme.colors.button.link.text};
      --color-button-link-hover-bg: ${$theme.colors.button.link.hoverBg};
      --color-button-link-hover-text: ${$theme.colors.button.link.hoverText};
      --color-button-link-disabled-text: ${$theme.colors.button.link.disabledText};

      --color-button-secondary-bg: transparent;
      --color-button-secondary-text: ${$theme.colors.button.secondary.text};
      --color-button-secondary-outline: ${$theme.colors.button.secondary.outline};
      --color-button-secondary-hover-bg: ${$theme.colors.button.secondary.hoverBg};

      --color-controlpanel-bg: ${$theme.colors.controlPanel.bg};
      --color-controlpanel-border: ${$theme.colors.controlPanel.border};
      --color-controlpanel-text: ${$theme.colors.controlPanel.text};
      --color-controlpanel-section-bg: ${$theme.colors.controlPanel.sectionBg};

      --color-landingpage-bg: ${$theme.colors.landingPage.bg};
      --color-landingpage-text: ${$theme.colors.landingPage.text};
      --color-landingpage-banner-highlight-bg: ${$theme.colors.landingPage.bannerBg};

      --color-statusflag-bg: ${$theme.colors.statusFlag.bg};
      --color-statusflag-text: ${$theme.colors.statusFlag.text};

      --color-layout-dividers: ${$theme.colors.layout.dividers};

      --color-checkbox-bg: ${$theme.colors.checkbox.bg};

      --color-text-link: ${$theme.colors.text.link};
      --color-text-header: ${$theme.colors.text.header};
      --color-text-body: ${$theme.colors.text.body};
      --color-text-selection-bg: ${$theme.colors.text.selectionBg};
      --color-text-selection-text: ${$theme.colors.text.selectionText};

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
    color: var(--color-text-header);
    font-size: 19px;
    font-weight: 400;
  }

  h3 {
    font-family: var(--font-family);
    color: var(--color-text-header);
    font-size: 16px;
    font-weight: 600;
  }

  p {
    font-family: var(--font-family);
    color: var(--color-text-body);
    font-size: 14px;
    font-weight: 400;
  }

  a {
    color: var(--color-text-link);
    &:focus-visible {
      text-decoration: underline;
    }
  }

  & *::selection {
    /** 
         * Override Ant + Less styling, since it uses a very light purple that's 
         * impossible to read white text on.
         * TODO: Fix this in the main app too. This currently only applies to landing page.
         */
    background-color: var(--color-text-selection-bg);
    color: var(--color-text-selection-text);
  }

  /* TODO: Remove this when we upgrade to Ant versions that provide support for
     * ConfigProvider. 
     */
  .ant-btn-primary {
    background-color: var(--color-button-primary-bg);
    color: var(--color-button-primary-text);
    border-color: var(--color-button-primary-bg);
    border: 1px solid transparent;
  }

  .ant-btn:hover,
  .ant-btn:focus-visible {
    background-color: var(--color-button-primary-hover-bg);
    border-color: var(--color-button-primary-hover-bg);
  }

  .ant-btn:active {
    border: 1px solid var(--color-button-primary-active-outline);
  }

  .ant-btn-link {
    color: var(--color-button-link-text);

    &:hover,
    &:focus-visible {
      color: var(--color-button-link-hover-text);
      background-color: var(--color-button-link-hover-bg);
    }

    &:disabled,
    &:disabled:hover {
      color: var(--color-button-link-disabled-text);
    }
  }

  // Overrides for checkbox styling
  & .ant-checkbox-input {
    &:hover {
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
`;

/**
 * Provides CSS variables and global styling for the image viewer.
 */
export default function StyleProvider(props: PropsWithChildren<{}>): ReactElement {
  const { defaultAlgorithm, darkAlgorithm } = AntTheme;

  return (
    <ConfigProvider
      theme={{
        algorithm: darkAlgorithm,
        token: {
          colorPrimary: theme.colors.theme.primary,
          colorLink: theme.colors.text.link,
          margin: 0,
          colorBgBase: theme.colors.controlPanel.bg,
          borderRadiusSM: 2,
          borderRadiusLG: 0,
        },
        components: {
          Collapse: {
            borderRadius: 0,
          },
          Layout: {
            siderBg: theme.colors.controlPanel.bg,
          },
          Checkbox: {
            colorBgContainer: theme.colors.checkbox.bg,
            colorPrimary: theme.colors.checkbox.bg,
            colorPrimaryHover: theme.colors.checkbox.hoverBg,
          },
        },
      }}
    >
      <CssProvider $theme={theme}>{props.children}</CssProvider>
    </ConfigProvider>
  );
}
