/**
 * @fileoverview These are variables used across the engine.
 * Changing these defines will cause certain parts of code
 * to get stripped, making the build size smaller.
 */

/* ==== Generic Defines ==== */
// These are the defines that are usually needed so they're all true by default.

export const ENABLE_WEBGPU_CLUSTERED_LIGHTS = true;

/* ======== Studio Defines ======== */
// These are defines that are generally only needed for studio. Most release builds can set all of these to false.

/**
 * Enables listening for asset changes for assets that are used by the engine.
 */
export const ENGINE_ASSETS_LIVE_UPDATES_SUPPORT = true;

/**
 * Enables support for exporting child Entity assets as a single uuid when
 * exporting an Entity with Entity.toJson().
 */
export const ENTITY_ASSETS_IN_ENTITY_JSON_EXPORT = true;

/**
 * Support for storing default asset link uuids as metadata in entities.
 * This is only needed in studio since only studio can handle default asset links.
 */
export const DEFAULT_ASSET_LINKS_IN_ENTITY_JSON_EXPORT = true;

/**
 * Apply built-in default asset link uuids to the default values for components.
 * These uuids are only available in studio, asset bundles remove default asset links when bundling.
 */
export const STUDIO_DEFAULTS_IN_COMPONENTS = true;

/* ========== Debug Defines ========== */
// These are defines that are usually only needed for debug builds.

export const ENABLE_INSPECTOR_SUPPORT = true;

/**
 * When false, strips out the strings and Error object of thrown errors and will throw `null` instead.
 */
export const DEBUG_INCLUDE_ERROR_MESSAGES = true;

/**
 * When false, strips out thrown errors entirely.
 */
export const DEBUG_INCLUDE_ERROR_THROWS = true;
