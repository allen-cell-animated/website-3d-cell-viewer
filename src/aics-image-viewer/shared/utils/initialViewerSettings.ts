export interface ViewerChannelSetting {
  name: string;
  // regex or string or array of regexes or strings
  match?: string[] | string;
  color?: string; // 6 digit hex
  enabled?: boolean;
  surfaceEnabled?: boolean; // false
  lut?: [string, string]; // min and max. these are shorthand expressions.  a plain number (intensity), or a "p##", or a "m##" for percentile or median
  isovalue?: number; // valid when surfaceEnabled = true. default 128 or 0.5
  surfaceOpacity?: number; // valid when surfaceEnabled = true. default 1.0 fully opaque
}

export interface ViewerChannelGroup {
  name: string;
  channels: ViewerChannelSetting[];
}

export interface ViewerChannelSettings {
  maskChannelName: string;
  groups: ViewerChannelGroup[];
}

export const VIEWER_3D_SETTINGS: {
  [key: string]: ViewerChannelSettings;
} = {
  aics_hipsc: {
    groups: [
      {
        name: "Observed channels",
        channels: [
          { name: "Membrane", match: ["(CMDRP)"], color: "E2CDB3", enabled: true, lut: ["p50", "p98"] },
          {
            name: "Labeled structure",
            match: ["(EGFP)|(RFPT)"],
            color: "6FBA11",
            enabled: true,
            lut: ["p50", "p98"],
          },
          { name: "DNA", match: ["(H3342)"], color: "8DA3C0", enabled: true, lut: ["p50", "p98"] },
          { name: "Bright field", match: ["(100)|(Bright)"], color: "F5F1CB", enabled: false, lut: ["p50", "p98"] },
        ],
      },
      {
        name: "Segmentation channels",
        channels: [
          {
            name: "Labeled structure",
            match: ["(SEG_STRUCT)"],
            color: "E0E3D1",
            enabled: false,
            lut: ["p50", "p98"],
          },
          { name: "Membrane", match: ["(SEG_Memb)"], color: "DD9BF5", enabled: false, lut: ["p50", "p98"] },
          { name: "DNA", match: ["(SEG_DNA)"], color: "E3F4F5", enabled: false, lut: ["p50", "p98"] },
        ],
      },
      {
        name: "Contour channels",
        channels: [
          { name: "Membrane", match: ["(CON_Memb)"], color: "FF6200", enabled: false, lut: ["p50", "p98"] },
          { name: "DNA", match: ["(CON_DNA)"], color: "F7DB78", enabled: false, lut: ["p50", "p98"] },
        ],
      },
      // TODO how to handle others / unspecified?
      {
        name: "Others",
        channels: [],
      },
    ],
    // must be the true channel name in the volume data
    maskChannelName: "SEG_Memb",
  },
};

export function findFirstChannelMatchOfGroup(channel: string, g: ViewerChannelGroup): ViewerChannelSetting | undefined {
  for (const c of g.channels) {
    // if match exists then test match.
    // if match was missing, then test for equality with name.
    if (c.match !== undefined) {
      // c could be array of strings or a single regex?
      if (Array.isArray(c.match)) {
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
  settings: ViewerChannelSettings
): ViewerChannelSetting | undefined {
  for (const g of settings.groups) {
    const c = findFirstChannelMatchOfGroup(channel, g);
    if (c !== undefined) {
      return c;
    }
  }
  return undefined;
}

export function groupHasChannel(g: ViewerChannelGroup, channel: string): boolean {
  const c = findFirstChannelMatchOfGroup(channel, g);
  return c !== undefined;
}

export function getDisplayName(name: string, settings?: ViewerChannelSettings): string {
  if (settings) {
    const c = findFirstChannelMatch(name, settings);
    if (c) {
      return c.name;
    }
  }
  return name;
}
