export const IS_DEV_BUILD = true;
/**
 * - `"dev"` the engine has not been built, all modules are loaded in separate files.
 * - `"production"` modules have been bundled in as few files as possible.
 * @type {"dev" | "production"}
 */
export const EDITOR_ENV = "dev";
/**
 * The path to the main entry point of the engine. In development this points
 * to `/src/mod.js`, which is an unbundled entrypoint of the engine.
 * In production builds this points to a bundled version of the engine, which
 * has its hash in the filename to invalidate cache.
 * Note that in production this is not an absolute path, it starts with ./ and
 * is relative to the build directory.
 */
export const ENGINE_SOURCE_PATH = "/src/mod.js";

export const BUILD_GIT_BRANCH = "dev";
/** @type {string} */
export const BUILD_GIT_COMMIT = "-";
export const BUILD_DATE = Date.now();
