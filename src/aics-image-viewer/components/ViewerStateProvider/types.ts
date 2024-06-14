import { ControlPoint } from "@aics/volume-viewer";
import { ImageType, RenderMode, ViewMode } from "../../shared/enums";
import type { PerAxis } from "../../shared/types";
import type { ColorArray } from "../../shared/utils/colorRepresentations";

/** Global (not per-channel) viewer state which may be changed in the UI */
export interface ViewerState {
  viewMode: ViewMode;
  renderMode: RenderMode;
  imageType: ImageType;
  showAxes: boolean;
  showBoundingBox: boolean;
  boundingBoxColor: ColorArray;
  backgroundColor: ColorArray;
  autorotate: boolean;
  maskAlpha: number;
  brightness: number;
  density: number;
  levels: [number, number, number];
  interpolationEnabled: boolean;
  // `region` values are in the range [0, 1]. We derive from this the format that the sliders expect
  // (integers between 0 and num_slices - 1) and the format that view3d expects (in [-0.5, 0.5]).
  // This state is only active in 3d mode.
  region: PerAxis<[number, number]>;
  // Store the relative position of the slice in the range [0, 1] for each of 3 axes.
  // This state is active in x,y,z single slice modes.
  slice: PerAxis<number>;
  time: number;
}

export type ViewerStateKey = keyof ViewerState;

/**
 * If a value in `ViewerState` is an object, we want to allow updates with a partial object. Otherwise, components that
 * update some but not all of the object's properties have to know the object's current value in order to clone it with
 * only the key they care about updated, which exposes us to stale closure issues.
 */
export type PartialIfObject<T> = T extends Record<string, unknown> ? Partial<T> : T;

/**
 * A type which lets us provide a map of optional check functions for certain settings updates, to avoid entering
 * illegal states. E.g., whenever `renderMode` is changed to pathtrace, make sure `autorotate` is set to false.
 */
export type ViewerSettingChangeHandlers = {
  [K in ViewerStateKey]?: (settings: ViewerState, value: PartialIfObject<ViewerState[K]>) => ViewerState;
};

/**
 * The type of the global settings updater provided by `ViewerStateProvider` and passed down to most UI components.
 * Looks kind of like redux's `dispatch` if you squint. `key` names the setting to update; `value` is the new
 * (potentially partial) value.
 */
export type ViewerSettingUpdater = <K extends ViewerStateKey>(key: K, value: PartialIfObject<ViewerState[K]>) => void;

/** Settings for a single channel, as stored internally by the app */
export interface ChannelState {
  name: string;
  volumeEnabled: boolean;
  isosurfaceEnabled: boolean;
  isovalue: number;
  colorizeEnabled: boolean;
  colorizeAlpha: number;
  opacity: number;
  color: ColorArray;
  controlPoints: ControlPoint[];
}

export type ChannelStateKey = keyof ChannelState;
export type ChannelSettingUpdater = <K extends ChannelStateKey>(index: number, key: K, value: ChannelState[K]) => void;
export type MultipleChannelSettingsUpdater = <K extends ChannelStateKey>(
  indices: number[],
  key: K,
  value: ChannelState[K]
) => void;

export type ViewerStateContextType = ViewerState & {
  channelSettings: ChannelState[];
  changeViewerSetting: ViewerSettingUpdater;
  setChannelSettings: React.Dispatch<React.SetStateAction<ChannelState[]>>;
  changeChannelSetting: ChannelSettingUpdater;
  changeMultipleChannelSettings: MultipleChannelSettingsUpdater;
  applyColorPresets: (presets: ColorArray[]) => void;
};
