import { AxisName } from "../types";

type PlayAxisName = AxisName | "t";

const PLAY_STEP_INTERVAL = 125;

export default class PlayControls {
  playingAxis: PlayAxisName | null = null;
  playWaitingForLoad = false;
  playHolding = false;
  playTimeoutId = 0;

  public getVolumeIsLoaded?: () => boolean;
  public stepAxis?: (axis: PlayAxisName) => void;
  public onPlayingAxisChanged?: (axis: PlayAxisName | null) => void;

  private setPlayingAxis(axis: PlayAxisName | null): void {
    this.playingAxis = axis;
    this.onPlayingAxisChanged?.(axis);
  }

  private playStep(): void {
    if (!this.playingAxis || this.playHolding || !this.stepAxis) {
      return;
    }
    // If the volume is not loaded, wait for it to load before continuing
    if (!this.getVolumeIsLoaded?.()) {
      this.playWaitingForLoad = true;
      return;
    }

    this.stepAxis(this.playingAxis);
    this.playTimeoutId = window.setTimeout(this.playStep.bind(this), PLAY_STEP_INTERVAL);
  }

  onImageLoaded(): void {
    if (this.playWaitingForLoad) {
      this.playWaitingForLoad = false;
      this.playStep();
    }
  }

  pause(willResume = false): void {
    window.clearTimeout(this.playTimeoutId);
    this.playTimeoutId = 0;
    this.playWaitingForLoad = false;
    if (this.playingAxis !== null && !willResume) {
      this.playHolding = false;
      this.setPlayingAxis(null);
    }
  }

  play(axis: PlayAxisName): void {
    if (this.playingAxis !== null) {
      this.pause(true);
    }
    this.setPlayingAxis(axis);
    this.playStep();
  }

  startHold(axis: PlayAxisName): void {
    this.playHolding = true;
    this.pause(axis === this.playingAxis);
  }

  endHold(): void {
    if (this.playHolding) {
      this.playHolding = false;
      this.playStep();
    }
  }
}
