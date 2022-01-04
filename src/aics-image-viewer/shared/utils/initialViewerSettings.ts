export interface ViewerChannelSetting {
  // at least one of name or match MUST be present...
  // name is intended to be the display name for this channel.
  // if name is not given, use raw data channel name for display
  name?: string;
  // regex or string or array of regexes or strings or number for raw channel index
  // if match is not given, then "name" will be used to match.
  // if you want to match on channel index, then you must provide the index here.
  match?: string[] | string | number;

  // 6 digit hex
  color?: string;
  // default to false? (TODO)
  enabled?: boolean;
  // default to false
  surfaceEnabled?: boolean;
  // min and max. these are shorthand expressions.
  // a plain number (intensity), or a "p##", or a "m##" for percentile or median
  lut?: [string, string];
  // valid when surfaceEnabled = true. default 128 or 0.5
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

export function findFirstChannelMatchOfGroup(
  channel: string,
  channelIndex: number,
  g: ViewerChannelGroup
): ViewerChannelSetting | undefined {
  for (const c of g.channels) {
    // if match exists then test match.
    // if match was missing, then test for equality with name.
    if (c.match !== undefined) {
      // c could be a number, an array of strings or a single regex?
      if (typeof c.match === "number") {
        if (c.match === channelIndex) {
          return c;
        }
      } else if (Array.isArray(c.match)) {
        for (const r of c.match) {
          const re = new RegExp(r);
          if (re.test(channel)) {
            return c;
          }
        }
      } else {
        const re = new RegExp(c.match);
        if (re.test(channel)) {
          return c;
        }
      }
    } else {
      // no match field, so test against "name" field. this will not be treated as regex.
      if (c.name === channel) {
        return c;
      }
      // TODO is this ok??? we would have to check c.name later on too.
      if (c.name === "*") {
        return c;
      }
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

export function groupHasChannel(g: ViewerChannelGroup, channel: string, channelIndex: number): boolean {
  const c = findFirstChannelMatchOfGroup(channel, channelIndex, g);
  return c !== undefined;
}

export function getDisplayName(name: string, index: number, settings?: ViewerChannelSettings): string {
  if (settings) {
    const c = findFirstChannelMatch(name, index, settings);
    if (c && c.name) {
      return c.name;
    }
  }
  return name;
}
