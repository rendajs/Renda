export const IS_DEV_BUILD = true;
/**
 * - `"dev"` the engine has not been built, all modules are loaded in separate files.
 * - `"production"` modules have been bundled in as few files as possible.
 * @type {"dev" | "production"}
 */
export const STUDIO_ENV = "dev";
/**
 * The path to the main entry point of the engine. In development this points
 * to `/src/mod.js`, which is an unbundled entrypoint of the engine.
 * In production builds this points to a bundled version of the engine, which
 * has its hash in the filename to invalidate cache.
 *
 * This should only be used to build projects from the user.
 * Studio itself should import things like Vec3 from the relative path to the engine instead.
 * This is because in production `ENGINE_SOURCE_PATH` points to a full build of the engine.
 * Therefore no tree shaking is performed here.
 * We only want to download the full engine bundle when it's needed, not on first page load.
 * Furthermore, importing things like Vec3 from two different paths will inevitably lead to `instanceof` issues.
 *
 * Note that in production this is not an absolute path, it starts with ./ and
 * is relative to the build directory.
 */
export const ENGINE_SOURCE_PATH = "/src/mod.js";

export const BUILD_VERSION_STRING = "v0.1.0";
export const BUILD_GIT_BRANCH = "dev";
/** @type {string} */
export const BUILD_GIT_COMMIT = "-";
export const BUILD_DATE = Date.now();
