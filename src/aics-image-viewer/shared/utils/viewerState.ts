import {
  ChannelSettingUpdater,
  ChannelState,
  ViewerSettingUpdater,
  ViewerState,
} from "../../components/ViewerStateProvider/types";

export function resetViewerState(changeViewerSetting: ViewerSettingUpdater, newState: ViewerState): void {
  for (const key of Object.keys(newState) as (keyof ViewerState)[]) {
    changeViewerSetting(key, newState[key] as any);
  }

  // Pathtrace mode is not allowed in 2D mode. Handle the edge case where the user switched
  // from 2D mode to 3D mode but pathtrace mode was forcibly disabled.
  changeViewerSetting("renderMode", newState.renderMode);
}

export function resetChannelState(
  changeChannelSetting: ChannelSettingUpdater,
  index: number,
  newState: ChannelState
): void {
  for (const key of Object.keys(newState) as (keyof ChannelState)[]) {
    changeChannelSetting(index, key, newState[key] as any);
  }
}
