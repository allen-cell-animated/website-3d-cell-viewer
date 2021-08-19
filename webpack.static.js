const {merge} = require('webpack-merge');
const prod = require('./webpack.prod');
const stage = require('./webpack.stage');
const dev = require('./webpack.dev');

const staticconfig = {
    devtool: 'cheap-module-source-map',
    output: {
        publicPath: ''
    }
};

module.exports = () => {
    const DEPLOYMENT_ENV = (process.env.DEPLOYMENT_ENV || 'dev').toLowerCase();
    console.log(`Deployment environment is: ${DEPLOYMENT_ENV}`);
    switch(DEPLOYMENT_ENV) {
        case 'production':
        case 'prod':
            return merge(prod, staticconfig);
        case 'staging':
        case 'stage':
            return merge(stage, staticconfig);
        case 'development':
        case 'dev':
        default:
            return merge(dev, staticconfig);
   } 
}; 
    
    
    
