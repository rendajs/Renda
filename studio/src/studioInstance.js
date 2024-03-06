import "./styles/studioStyles.js";
import { Studio } from "./Studio.js";

/** @type {Studio?} */
let studioInstance = null;

/**
 * Initializes studio. This should only be called once by whatever created
 * the application. This sets a lot of things in motion, and therefore this
 * shouldn't be called from unit tests.
 */
export function initStudio() {
	studioInstance = new Studio();
	studioInstance.init();
}

/**
 * Gets the studio instance. This should be used sparingly, as it difficult to
 * deal with in unit tests. You should always use dependency injection where
 * possible. This will throw if {@linkcode initStudio} hasn't been called yet.
 * So you shouldn't use this in code that runs from the `Studio` constructor.
 * If you do wish to use this, make sure to mock the studio instance using
 * {@linkcode injectMockStudioInstance} in unit tests.
 * Optionally you can use {@linkcode getMaybeStudioInstance} if you wish to
 * simply ommit certain functionality in unit tests.
 */
export function getStudioInstance() {
	if (!studioInstance) throw new Error("Studio instance not initialized.");
	return studioInstance;
}

/**
 * Same as {@linkcode getStudioInstance}, but returns null when studio
 * hasn't been initialized and no mock instance has been injected.
 * Make sure to check if the returned value is null before using it to make
 * your code work in unit tests where studio possibly isn't initialized.
 */
export function getMaybeStudioInstance() {
	return studioInstance;
}

/**
 * Use this for unit tests to mock the studio instance.
 * @param {Studio?} studio
 */
export function injectMockStudioInstance(studio) {
	studioInstance = studio;
}
