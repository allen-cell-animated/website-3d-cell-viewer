# AICS Image Viewer

This is a browser based volume viewer built with React and WebGL (Three.js).
Volume data is provided to the core 3d viewer via a json file containing dimensions and other metadata, and texture atlases (png files containing volume slices tiled across the 2d image).
Therefore the texture atlases must be prepared in advance before loading into this viewer.
There is a server component (aics-image-viewer-service) that can open OME-TIFF, TIFF, and CZI files and generate texture atlases for viewing.  Currently the server component is required.  The viewer sends Allen Institute file paths to the server component, which opens the files and caches the texture atlases, returning the server path to that data.

The volume shader itself is a heavily modified version of one that has its origins in [Bisque](http://bioimage.ucsb.edu/bisque).

