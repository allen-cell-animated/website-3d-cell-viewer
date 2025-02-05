import {
  CreateLoaderOptions,
  IVolumeLoader,
  LoadSpec,
  PerChannelCallback,
  RawArrayLoaderOptions,
  Volume,
  VolumeLoaderContext,
} from "@aics/vole-core";

export default class SceneStore {
  context: VolumeLoaderContext;
  loaders: (IVolumeLoader | undefined)[];
  paths: (string | string[] | RawArrayLoaderOptions)[];
  currentScene: number = 0;

  constructor(context: VolumeLoaderContext, paths: (string | string[] | RawArrayLoaderOptions)[]) {
    this.paths = paths;
    this.context = context;
    this.loaders = new Array(paths.length).fill(undefined);
  }

  /** Get the loader associated with the given scene index, or create it if it doesn't exist */
  private async getLoader(scene: number): Promise<IVolumeLoader> {
    this.currentScene = scene;
    let loader = this.loaders[scene];

    if (!loader) {
      let path = this.paths[scene];
      let options: Partial<CreateLoaderOptions> = {};
      if (typeof path === "object" && !Array.isArray(path)) {
        options.rawArrayOptions = path;
        path = "";
      }

      await this.context.onOpen();
      loader = await this.context.createLoader(path, options);
      this.loaders[scene] = loader;
    }

    return loader;
  }

  public async loadScene(
    scene: number,
    image: Volume,
    loadSpec?: LoadSpec,
    onChannelLoaded?: PerChannelCallback
  ): Promise<void> {
    const loader = await this.getLoader(scene);
    const spec = loadSpec ?? image.loadSpecRequired;

    image.loader = loader;
    // TODO this will have to reset the image info too
    loader.loadVolumeData(image, spec, onChannelLoaded);
  }

  public async createVolume(scene: number, loadSpec: LoadSpec, onChannelLoaded?: PerChannelCallback): Promise<Volume> {
    const loader = await this.getLoader(scene);
    return loader.createVolume(loadSpec, onChannelLoaded);
  }
}
