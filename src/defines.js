//These are variables used across the engine
//Changing these defines will cause certain parts of code
//to get stripped, making the build size smaller



/* ==== Generic Defines ==== */

export const ENABLE_WEBGPU_CLUSTERED_LIGHTS = true;



/* ======== Editor Defines ======== */
//These are defines that are generally only needed for the
//editor. Most builds can set all of these to false.

//enables support for adding handlers to EngineAssetsManager
export const ENABLE_ENGINE_ASSETS_HANDLERS = true;
