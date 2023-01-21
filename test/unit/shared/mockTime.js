/**
 * @fileoverview Utilities for mocking Date.now() and performance.now()
 */

const oldDateNow = Date.now;
const oldPerformanceNow = performance.now;

let mockedDateNowValue = 0;
let mockedPerformanceNowValue = 0;

let currentlyInstalled = false;
function assertCurrentlyInstalled() {
	if (!currentlyInstalled) {
		throw new Error("No mock Date.now() is currently installed.");
	}
}

/**
 * Installs a mock for `Date.now()`. Throws when an existing mock has already been installed.
 */
export function installMockTime() {
	if (currentlyInstalled) {
		throw new Error("An existing mock Date.now() is already installed.");
	}
	currentlyInstalled = true;
	// By default we use a value somewhat higher than zero because we don't live in 1970 anymore
	mockedDateNowValue = 60_000;
	// performance.now() is zero on page load though, so we keep that at zero.
	mockedPerformanceNowValue = 0;
	Date.now = () => mockedDateNowValue;
	performance.now = () => mockedPerformanceNowValue;
}

/**
 * Uninstalls the `Date.now()` mock, throws if no mock is installed.
 */
export function uninstallMockTime() {
	assertCurrentlyInstalled();
	currentlyInstalled = false;
	Date.now = oldDateNow;
	performance.now = oldPerformanceNow;
}

/**
 * Sets the return value for `Date.now()`, throws when no mock is installed.
 * @param {number} value
 */
export function setMockDateNowValue(value) {
	assertCurrentlyInstalled();
	mockedDateNowValue = value;
}

/**
 * Sets the return value for `performance.now()`, throws when no mock is installed.
 * @param {number} value
 */
export function setMockPerformanceNowValue(value) {
	assertCurrentlyInstalled();
	mockedDateNowValue = value;
}

/**
 * Increments time for `Date.now()` and `performance.now()`, throws when no mock is installed.
 * @param {number} value
 */
export function incrementTime(value) {
	assertCurrentlyInstalled();
	mockedDateNowValue += value;
	mockedPerformanceNowValue += value;
}
