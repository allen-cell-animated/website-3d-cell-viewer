import React from 'react';
import ReactDOM from 'react-dom';

import './App.scss';
import ImageViewerApp from '../src/aics-image-viewer/components/ImageViewerApp';

ReactDOM.render(
  <ImageViewerApp/>,
  document.getElementById('cell-viewer')
);
