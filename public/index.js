import React from 'react';
import ReactDOM from 'react-dom';

import './App.scss';
import { ImageViewerApp } from '../dist';

ReactDOM.render(
  <ImageViewerApp
    cellId="23618"
    fovId="4187"
    cellLine="AICS-17"
  />,
  document.getElementById('cell-viewer')
);
