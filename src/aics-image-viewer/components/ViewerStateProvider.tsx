import React, { useState, useCallback } from "react";

import { GlobalViewerSettings, ViewerSettingChangeHandlers, ViewerSettingUpdater } from "./App/types";
import { ImageType, RenderMode, ViewMode } from "../shared/enums";
import {
  ALPHA_MASK_SLIDER_DEFAULT,
  BACKGROUND_COLOR_DEFAULT,
  BOUNDING_BOX_COLOR_DEFAULT,
  BRIGHTNESS_SLIDER_LEVEL_DEFAULT,
  DENSITY_SLIDER_LEVEL_DEFAULT,
  INTERPOLATION_ENABLED_DEFAULT,
  LEVELS_SLIDER_DEFAULT,
} from "../shared/constants";
import {
  ChannelSettingUpdater,
  ChannelState,
  MultipleChannelSettingsUpdater,
} from "../shared/utils/viewerChannelSettings";
import { ColorArray } from "../shared/utils/colorRepresentations";

const isObject = <T,>(val: T): val is Extract<T, Record<string, unknown>> =>
  typeof val === "object" && val !== null && !Array.isArray(val);

const DEFAULT_VIEWER_SETTINGS: GlobalViewerSettings = {
  viewMode: ViewMode.threeD, // "XY", "XZ", "YZ"
  renderMode: RenderMode.volumetric, // "pathtrace", "maxproject"
  imageType: ImageType.segmentedCell,
  showAxes: false,
  showBoundingBox: false,
  backgroundColor: BACKGROUND_COLOR_DEFAULT,
  boundingBoxColor: BOUNDING_BOX_COLOR_DEFAULT,
  autorotate: false,
  maskAlpha: ALPHA_MASK_SLIDER_DEFAULT,
  brightness: BRIGHTNESS_SLIDER_LEVEL_DEFAULT,
  density: DENSITY_SLIDER_LEVEL_DEFAULT,
  levels: LEVELS_SLIDER_DEFAULT,
  interpolationEnabled: INTERPOLATION_ENABLED_DEFAULT,
  region: { x: [0, 1], y: [0, 1], z: [0, 1] },
  slice: { x: 0.5, y: 0.5, z: 0.5 },
  time: 0,
};

// Some viewer settings require custom change behaviors to change related settings simultaneously or guard against
// entering an illegal state (e.g. autorotate must not be on in pathtrace mode). Those behaviors are defined here.
const VIEWER_SETTINGS_CHANGE_HANDLERS: ViewerSettingChangeHandlers = {
  // View mode: if we're switching to 2d, switch to volumetric rendering
  viewMode: (prevSettings, viewMode) => {
    const switchToVolumetric = viewMode !== ViewMode.threeD && prevSettings.renderMode === RenderMode.pathTrace;
    return {
      ...prevSettings,
      viewMode,
      renderMode: switchToVolumetric ? RenderMode.volumetric : prevSettings.renderMode,
    };
  },
  // Render mode: if we're switching to pathtrace, turn off autorotate
  renderMode: (prevSettings, renderMode) => ({
    ...prevSettings,
    renderMode,
    autorotate: renderMode === RenderMode.pathTrace ? false : prevSettings.autorotate,
  }),
  // Autorotate: do not enable autorotate while in pathtrace mode
  autorotate: (prevSettings, autorotate) => ({
    ...prevSettings,
    // The button should theoretically be unclickable while in pathtrace mode, but this provides extra security
    autorotate: prevSettings.renderMode === RenderMode.pathTrace ? false : autorotate,
  }),
};

export type ViewerContextType = GlobalViewerSettings & {
  channelSettings: ChannelState[];
  changeViewerSetting: ViewerSettingUpdater;
  changeChannelSetting: ChannelSettingUpdater;
  changeMultipleChannelSettings: MultipleChannelSettingsUpdater;
  applyColorPresets: (presets: ColorArray[]) => void;
};

const DEFAULT_VIEWER_CONTEXT: ViewerContextType = {
  ...DEFAULT_VIEWER_SETTINGS,
  channelSettings: [],
  changeViewerSetting: () => {},
  changeChannelSetting: () => {},
  changeMultipleChannelSettings: () => {},
  applyColorPresets: () => {},
};

export const ViewerStateContext = React.createContext<ViewerContextType>(DEFAULT_VIEWER_CONTEXT);

const ViewerStateProvider: React.FC = ({ children }) => {
  const [viewerSettings, setViewerSettings] = useState({ ...DEFAULT_VIEWER_SETTINGS });
  const [channelSettings, setChannelSettings] = useState<ChannelState[]>([]);

  const changeViewerSetting = useCallback<ViewerSettingUpdater>(
    (key, value) => {
      const changeHandler = VIEWER_SETTINGS_CHANGE_HANDLERS[key];

      if (changeHandler) {
        // This setting has a custom change handler. Let it handle creating a new state object.
        setViewerSettings(changeHandler(viewerSettings, value));
      } else {
        const setting = viewerSettings[key];
        if (isObject(setting) && isObject(value)) {
          // This setting is an object, and we may be updating it with a partial object.
          setViewerSettings({ ...viewerSettings, [key]: { ...setting, ...value } });
        } else {
          // This setting is regular. Update it the regular way.
          setViewerSettings({ ...viewerSettings, [key]: value });
        }
      }
    },
    [viewerSettings]
  );

  const changeChannelSetting = useCallback<ChannelSettingUpdater>(
    (index, key, value) => {
      const newChannelSettings = channelSettings.slice();
      newChannelSettings[index] = { ...newChannelSettings[index], [key]: value };
      setChannelSettings(newChannelSettings);
    },
    [channelSettings]
  );

  const changeMultipleChannelSettings = useCallback<MultipleChannelSettingsUpdater>(
    (indices, key, value) => {
      const newChannelSettings = channelSettings.map((settings, idx) =>
        indices.includes(idx) ? { ...settings, [key]: value } : settings
      );
      setChannelSettings(newChannelSettings);
    },
    [channelSettings]
  );

  const applyColorPresets = useCallback(
    (presets: ColorArray[]): void => {
      const newChannelSettings = channelSettings.map((channel, idx) =>
        presets[idx] ? { ...channel, color: presets[idx] } : channel
      );
      setChannelSettings(newChannelSettings);
    },
    [channelSettings]
  );

  return (
    <ViewerStateContext.Provider
      value={{
        ...viewerSettings,
        channelSettings,
        changeViewerSetting,
        changeChannelSetting,
        changeMultipleChannelSettings,
        applyColorPresets,
      }}
    >
      {children}
    </ViewerStateContext.Provider>
  );
};

/**
 * Higher-order component that connects a component to the viewer state context.
 *
 * Accepts a `component` and an array of `keys` from the viewer state context, and returns a new memoized component
 * which "subscribes" to only those fields of state, and will not re-render if other fields change.
 *
 * NOTE that while higher-order components don't seem to be explicitly considered an anti-pattern, they don't appear in
 * modern documentation because they are ["not commonly used in modern React
 * code"](https://legacy.reactjs.org/docs/higher-order-components.html). React-redux, which inspired this "connect"
 * pattern, has also generally moved away from this pattern [in favor of a hooks-based
 * approach](https://react-redux.js.org/api/hooks). I too would love to use hooks to accomplish this, but there is
 * currently no way hook into a context without agreeing to re-render on every change. I feel okay writing a
 * higher-order component in this case because, analogous to a custom hook, it extends a provided primitive (`memo`).
 */
export function connectToViewerState<Keys extends keyof ViewerContextType, Props extends Pick<ViewerContextType, Keys>>(
  component: React.ComponentType<Props>,
  keys: Keys[]
): React.FC<Omit<Props, Keys>> {
  const MemoedComponent = React.memo(component);

  const ConnectedComponent: React.FC<Omit<Props, Keys>> = (props) => {
    const viewerState = React.useContext(ViewerStateContext);

    const mergedProps = { ...props } as Props;
    for (const key of keys) {
      (mergedProps as Pick<ViewerContextType, Keys>)[key] = viewerState[key];
    }

    return <MemoedComponent {...mergedProps} />;
  };

  ConnectedComponent.displayName = component.displayName ?? component.name;
  return ConnectedComponent;
}

export default React.memo(ViewerStateProvider);
