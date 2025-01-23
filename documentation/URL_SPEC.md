# Vol-E App URL Specification

When used as a standalone app, Vol-E allows you to specify view settings via
query parameters in the URL. This document provides an overview of the allowed
URL values.

For example, the following query parameters enable the volume on the first and
third channels (`c0=ven:1` and `c2=ven:1`), and sets the initial view to show an XY
slice along the Z axis (`view=Z`).

`https://volumeviewer.allencell.org/viewer?url={some-data}&c0=ven:1&c2=ven:1&view=Z`

If you are using our public build, set
[`https://volumeviewer.allencell.org/viewer`](https://volumeviewer.allencell.org/viewer)
as the base address. If you are running Vol-E locally, you can substitute this
for a `localhost` address.

## Common Examples

| Query Parameters                            | Description                                                                                              |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `?url={url}&c0=ven:1&c2=ven:1,clz:1&view=Z` | Enable the first and third channel volumes and apply colorizing to the third. View in XY / Z-slice mode. |

## Data parameters

Specifies the volume(s) to be loaded.

| Query parameter | Description                                                                                                                                                                                                                                               | Example                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `url`           | One or more volume URLs to load, optionally escaped using [`encodeURIComponent`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent). If multiple URLs are provided, they should be separated by commas. | Two urls: `?url=https%3A%2F%2Fallencell.s3.amazonaws.com%2Faics%2Fnuc-morph-dataset%2Fhipsc_fov_nuclei_timelapse_dataset%2Fhipsc_fov_nuclei_timelapse_data_used_for_analysis%2Fbaseline_colonies_fov_timelapse_dataset%2F20200323_05_large%2Fraw.ome.zarr,https%3A%2F%2Fallencell.s3.amazonaws.com%2Faics%2Fnuc-morph-dataset%2Fhipsc_fov_nuclei_timelapse_dataset%2Fhipsc_fov_nuclei_timelapse_data_used_for_analysis%2Fbaseline_colonies_fov_timelapse_dataset%2F20200323_05_large%2Fseg.ome.zarr` |
| `dataset`       | The name of a dataset to load. Only valid in Cell Feature Explorer, and must be used with `id`.                                                                                                                                                           |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `id`            | The ID of a cell within the loaded dataset. Only valid in Cell Feature Explorer, and must be used with `dataset`.                                                                                                                                         |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

## View settings

General global settings for the viewer.

| Query parameter | Description                                                                                                     | Default        | Example                    |
| --------------- | --------------------------------------------------------------------------------------------------------------- | -------------- | -------------------------- |
| `view`          | Initial view axis. Valid values are "3D", "X", "Y", and "Z".                                                    | `"3D"`         | `?view=Z`                  |
| `mode`          | Rendering mode to use. Valid values are "volumetric", "maxproject", and "pathtrace".                            | `"volumetric"` | `?mode=maxproject`         |
| `mask`          | The opacity of the mask channel, an integer in the range `[0, 100]`. Used to fade areas outside a segmentation. | `50`           | `?mask=75`                 |
| `image`         | The type of image to display. Valid values are "cell" and "fov".                                                | `"cell"`       | `?image=fov`               |
| `axes`          | Whether to show the axes helper. `1` is enabled, `0` is disabled.                                               | `0`            | `?axes=1`                  |
| `bb`            | Whether to show the bounding box. `1` is enabled, `0` is disabled.                                              | `0`            | `?bb=1`                    |
| `bbcol`         | The color of the bounding box, as a 6-digit hex color.                                                          | `ffffff`       | `?bbcol=ff0000`            |
| `bgcol`         | The background color, as a 6-digit hex color.                                                                   | `000000`       | `?bgcol=ababab`            |
| `rot`           | Whether to autorotate the view. `1` is enabled, `0` is disabled.                                                | `0`            | `?rot=1`                   |
| `bright`        | The brightness of the image, a float in the range `[0, 100]`.                                                   | `70`           | `?bright=80`               |
| `dens`          | Density modifier for the volume, a float in the range `[0, 100]`.                                               | `50`           | `?dens=60`                 |
| `lvl`           | Levels for image intensity adjustment as three numeric values separated by commas.                              | `"0,128,255"`  | `?lvl=0,128,255`           |
| `interp`        | Whether to enable interpolation. `1` is enabled, `0` is disabled.                                               | `1`            | `?interp=0`                |
| `reg`           | Subregions per axis, as `min:max` pairs separated by commas.                                                    | `0:1,0:1,0:1`  | `?reg=0:0.5,0:0.5,0:0.5`   |
| `slice`         | Slice position per X, Y, and Z axes, as a list of comma-separated floats.                                       | `0.5,0.5,0.5`  | `?slice=0.5,0.5,0.5`       |
| `t`             | Frame number, for time-series volumes.                                                                          | `0`            | `?t=10`                    |
| `cam`           | Camera transform settings, with one or more properties separated by commas. See below for details.              |                | `?cam=pos:1:2:3,tar:4:5:6` |
| `c{n}`          | Channel settings for channel index `n`, with one or more properties separated by commas. See below for details. |                | `?c0=iso:1&c2=ven:1`       |

## Camera transform settings (`cam`)

The `cam` query parameter is used to set one or more properties of the initial camera
transform. Each property is a `key:value` property pair separated by **commas**.

For example, to set the camera position to `(1,2,3)` and the target position to `(4,5,6)`, the following query
parameter could be added to the URL: `cam=pos:1:2:3,tar:4:5:6`

Note that the `pos`, `tar`, and `up` properties have different defaults depending on the `view` setting.

| Property | Description                                           | Default (3D) | Default (Z / XY) | Default (Y / XZ) | Default (X / YZ) | Example          |
| -------- | ----------------------------------------------------- | ------------ | ---------------- | ---------------- | ---------------- | ---------------- |
| `pos`    | Camera position as three floats separated by colons.  | `0:0:5`      | `0:0:2`          | `0:2:0`          | `2:0:0`          | `?cam=pos:1:2:3` |
| `tar`    | Camera target as three floats separated by colons.    | `0:0:0`      | `0:0:0`          | `0:0:0`          | `0:0:0`          | `?cam=tar:4:5:6` |
| `up`     | Camera up vector as three floats separated by colons. | `0:1:0`      | `0:1:0`          | `0:0:1`          | `0:0:1`          | `?cam=up:0:0:1`  |

| Property | Description                                                                    | Default | Example           |
| -------- | ------------------------------------------------------------------------------ | ------- | ----------------- |
| `ort`    | Scale factor for orthographic cameras.                                         | 0.5     | `?cam=ortho:0.25` |
| `fov`    | Vertical field of view for perspective cameras, in degrees from top to bottom. | 20      | `?cam=fov:60`     |

## Channel Settings (`c{n}`)

Channel settings are specified per channel index, starting at 0. To set
properties for channel `n`, the query parameter is `c{n}`, with each `key:value`
property pair being separated by **commas**.

For example, to override settings on channel index 2, the following query
parameter would be added to the URL.

```text
?c2=ven:1,clz:1,col:8da3c0,cps:0:0:1:163:0.5:1:255:1:1
```

The above example enables the volume and the colorize mode, sets the color to
`#8da3c0`, and sets the control points for the transfer function.

| Property | Description                                                                                                                                        | Default                                | Example                             |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------- |
| `ven`    | Volume enabled, set to `1` to enable or `0` to disable.                                                                                            | `0` (`1` for the first three channels) | `?c0=ven:1`                         |
| `iso`    | Isosurface enabled, set to `1` to enable or `0` to disable.                                                                                        | `0`                                    | `?c0=iso:1`                         |
| `isv`    | Isosurface value, the intensity value at which to generate the isosurface. A float in the range `[0, 255]`.                                        | `128`                                  | `?c0=isv:195`                       |
| `col`    | Color, for volumes and isosurfaces. Must be a 6-digit hex color.                                                                                   |                                        | `?c0=col:af38c0`                    |
| `clz`    | Colorize, used for segmentations where each ID should be a different color. Set to `1` to enable or `0` to disable.                                | `0`                                    | `?c0=clz:1`                         |
| `cza`    | Colorize alpha, the opacity of the colorize effect. A float in the range `[0, 1]`.                                                                 | `1.0`                                  | `?c0=cza:1.0`                       |
| `isa`    | Isosurface alpha, the opacity of the isosurface. A float in the range `[0, 1]`.                                                                    | `1.0`                                  | `?c0=isa:1.0`                       |
| `cpe`    | Use and show the control points instead of the ramp on load. Set to `1` to enable or `0` to disable (shows ramp values instead).                   | `0`                                    | `?c0=cpe:1`                         |
| `cps`    | Control points for the transfer function, as a list of `x:opacity:color` triplets separated by a colon. If provided, overrides the `lut` field.    | `0:0:ffffff:255:1:ffffff`              | `?c0=cps:0:0:ff0000:150:0.5:ffff00` |
| `rmp`    | Raw ramp values, which should be two numeric values separated by a colon. If provided, overrides the `lut` field when calculating the ramp values. | `0:255`                                | `?c0=rmp:0:255`                     |
| `lut`    | Lookup table (LUT) to map from volume intensity values to opacity, as a pair of alphanumeric values separated by a colon. See below for details.   | `0:255`                                | `?c0=lut:0:255`                     |

The `lut` property maps from volume intensity values to opacity. The first value
is the minimum intensity, and the second value is the maximum intensity. Values
between the `min` and `max` ramp linearly from an opacity of `0` to `1`. Values
can match any of the following:

- Numbers are treated as direct intensity values.
- `p{n}` represents a percentile, where `n` is a percentile in the [0, 100] range.
- `m{n}` represents the median multiplied by `n / 100`.
- `autoij` in either the min or max fields will use the "auto" algorithm
  from ImageJ to select the min and max.

Examples:

| `lut` value | Description                                             |
| ----------- | ------------------------------------------------------- |
| `0:255`     | Linear mapping from intensity 0 to intensity 255.       |
| `0:p90`     | Linear mapping from intensity 0 to the 90th percentile. |
| `p10:p95`   | Linear mapping from the 10th percentile to the 95th.    |
| `m100:m150` | Linear mapping from the median to 1.5 times the median. |
| `autoij:0`  | Uses the "auto" algorithm from ImageJ.                  |
