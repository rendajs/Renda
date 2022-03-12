class MockDateNow {
	constructor() {
		this.currentNowValue = 0;
	}

	/**
	 * @param {number} value
	 */
	setNowValue(value) {
		this.currentNowValue = value;
	}
}

const oldDateNow = Date.now;

/** @type {MockDateNow?} */
let currentMock = null;

export function installMockDateNow() {
	if (currentMock) {
		throw new Error("An existing mock Date.now() is already installed.");
	}
	const mock = new MockDateNow();
	currentMock = mock;
	Date.now = () => mock.currentNowValue;
	return mock;
}

export function uninstallMockDateNow() {
	if (!currentMock) {
		throw new Error("No mock Date.now() is currently installed.");
	}
	currentMock = null;
	Date.now = oldDateNow;
}
