export interface ViewerChannelSetting {
  // regex or string or array of regexes or strings or number for raw channel index
  // if you want to match on channel index, then you must provide the index here.
  match: string[] | string | number;

  // name is the display name for this channel.
  // if name is not given, use raw data channel name for display
  name?: string;

  // 6 digit hex rrggbb. defaults to auto-assigned by app
  color?: string;
  // default to false
  enabled?: boolean;
  // default to false
  surfaceEnabled?: boolean;
  // min and max. these are shorthand expressions.
  // a plain number (intensity), or a "p##", or a "m##" for percentile or median
  lut?: [string, string];
  // valid when surfaceEnabled = true. default 128 or 0.5 of max intensity range
  isovalue?: number;
  // valid when surfaceEnabled = true. default 1.0 fully opaque
  surfaceOpacity?: number;
}

export interface ViewerChannelGroup {
  name: string;
  channels: ViewerChannelSetting[];
}

export interface ViewerChannelSettings {
  maskChannelName: string;
  groups: ViewerChannelGroup[];
}

export function matchChannel(channel: string, channelIndex: number, c: ViewerChannelSetting): boolean {
  // c could be a number, an array of strings or a single regex
  if (typeof c.match === "number") {
    if (c.match === channelIndex) {
      return true;
    }
  } else if (Array.isArray(c.match)) {
    for (const r of c.match) {
      const re = new RegExp(r);
      if (re.test(channel)) {
        return true;
      }
    }
  } else if (typeof c.match === "string") {
    const re = new RegExp(c.match);
    if (re.test(channel)) {
      return true;
    }
  } else {
    throw new Error(
      "match is required for channel settings groups, and must be a string, array of strings, or integer"
    );
  }
  return false;
}

function findFirstChannelMatchOfGroup(
  channel: string,
  channelIndex: number,
  g: ViewerChannelGroup
): ViewerChannelSetting | undefined {
  for (const c of g.channels) {
    if (matchChannel(channel, channelIndex, c)) {
      return c;
    }
  }
  return undefined;
}

export function findFirstChannelMatch(
  channel: string,
  channelIndex: number,
  settings: ViewerChannelSettings
): ViewerChannelSetting | undefined {
  for (const g of settings.groups) {
    const c = findFirstChannelMatchOfGroup(channel, channelIndex, g);
    if (c !== undefined) {
      return c;
    }
  }
  return undefined;
}

export function getDisplayName(name: string, index: number, settings?: ViewerChannelSettings): string {
  if (settings) {
    const c = findFirstChannelMatch(name, index, settings);
    if (c) {
      return c.name || name;
    }
  }
  return name;
}
