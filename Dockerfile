FROM node:22-alpine3.18 AS build

WORKDIR /usr/src/website-3d-cell-viewer/

# Install dependencies
COPY ./ ./
RUN npm ci


# Build the project to ./imageviewer
RUN npm run s3-build

# # Serve the static imageviewer files over nginx
FROM nginx:alpine

COPY --from=build /usr/src/website-3d-cell-viewer/imageviewer/ /usr/share/nginx/html