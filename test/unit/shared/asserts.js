import {AssertionError, assert} from "std/testing/asserts.ts";
import {Mat4, Quat, Vec2, Vec3, Vec4} from "../../../src/mod.js";
import {waitForMicrotasks as waitForMicrotasksFn} from "./waitForMicroTasks.js";

/**
 * Make an assertion that `actual` and `expected` are almost numbers.
 * If not, then throw.
 *
 * @param {number} actual
 * @param {number} expected
 */
export function assertAlmostEquals(actual, expected, tolerance = 0.00001, msg = "") {
	if (typeof actual != "number") {
		if (msg) throw new AssertionError(msg);
		throw new AssertionError(`${actual} is not a number`);
	}
	if (typeof expected != "number") {
		if (msg) throw new AssertionError(msg);
		throw new AssertionError(`${expected} is not a number`);
	}
	const hasNaN = isNaN(actual) || isNaN(expected);
	if (Math.abs(actual - expected) > tolerance || hasNaN) {
		let message = msg;
		if (!message) {
			message = `Expected value to be close to ${expected} but got ${actual}`;
		}
		throw new AssertionError(message);
	}
}

/**
 * @param {Vec2 | Vec3 | Vec4 | number[]} arrayOrVector
 * @param {string} msg
 */
function arrayToVector(arrayOrVector, msg) {
	if (!Array.isArray(arrayOrVector)) {
		return arrayOrVector;
	}
	if (arrayOrVector.length == 2) {
		return new Vec2(arrayOrVector[0], arrayOrVector[1]);
	} else if (arrayOrVector.length == 3) {
		return new Vec3(arrayOrVector[0], arrayOrVector[1], arrayOrVector[2]);
	} else if (arrayOrVector.length == 4) {
		return new Vec4(arrayOrVector[0], arrayOrVector[1], arrayOrVector[2], arrayOrVector[3]);
	}
	if (msg) throw new AssertionError(msg);
	throw new AssertionError(`${arrayOrVector} is not a vector`);
}

/**
 * @param {unknown} vec
 * @param {string} msg
 * @returns {asserts vec is Vec2 | Vec3 | Vec4 | number[]}
 */
function assertIsVector(vec, msg) {
	if (!(vec instanceof Vec2) && !(vec instanceof Vec3) && !(vec instanceof Vec4) && !Array.isArray(vec)) {
		if (msg) throw new AssertionError(msg);
		throw new AssertionError(`${vec} is not a vector`);
	}
}

/**
 * @param {unknown} actual
 * @param {Vec2 | Vec3 | Vec4 | Quat | number[]} expected
 */
export function assertVecAlmostEquals(actual, expected, tolerance = 0.00001, msg = "") {
	assertIsVector(actual, msg);
	assertIsVector(expected, msg);
	const actualVec = arrayToVector(actual, msg);
	const expectedVec = arrayToVector(expected, msg);
	let dist;
	let hasNaN = false;
	if (actualVec instanceof Vec2 && expectedVec instanceof Vec2) {
		dist = actualVec.distanceTo(expectedVec);
		if (isNaN(actualVec.x) || isNaN(actualVec.y) || isNaN(expectedVec.x) || isNaN(expectedVec.y)) {
			hasNaN = true;
		}
	} else if (actualVec instanceof Vec3 && expectedVec instanceof Vec3) {
		dist = actualVec.distanceTo(expectedVec);
		if (isNaN(actualVec.x) || isNaN(actualVec.y) || isNaN(actualVec.z) || isNaN(expectedVec.x) || isNaN(expectedVec.y) || isNaN(expectedVec.z)) {
			hasNaN = true;
		}
	} else if (actualVec instanceof Vec4 && expectedVec instanceof Vec4) {
		dist = actualVec.distanceTo(expectedVec);
		if (isNaN(actualVec.x) || isNaN(actualVec.y) || isNaN(actualVec.z) || isNaN(actualVec.w) || isNaN(expectedVec.x) || isNaN(expectedVec.y) || isNaN(expectedVec.z) || isNaN(expectedVec.w)) {
			hasNaN = true;
		}
	} else {
		if (msg) {
			throw new AssertionError(msg);
		}
		if (!expected) {
			throw new AssertionError(`Expected ${expectedVec} but got ${expected}`);
		}
		throw new AssertionError(`Two vectors are not of the same type: ${actual.constructor.name} and ${expected.constructor.name}`);
	}
	if (dist > tolerance || hasNaN) {
		let message = msg;
		if (!message) {
			message = `Expected value to be close to ${expectedVec} but got ${actualVec}`;
		}
		throw new AssertionError(message);
	}
}

/**
 * @param {Quat | number[]} arrayOrQuat
 * @param {string} msg
 */
function arrayToQuat(arrayOrQuat, msg) {
	if (!Array.isArray(arrayOrQuat)) {
		return arrayOrQuat;
	}
	return new Quat(arrayOrQuat);
}

/**
 * @param {unknown} quat
 * @param {string} msg
 * @returns {asserts quat is Quat | number[]}
 */
function assertIsQuaternion(quat, msg) {
	if (!(quat instanceof Quat) && !Array.isArray(quat)) {
		if (msg) throw new AssertionError(msg);
		throw new AssertionError(`${quat} is not a quaternion`);
	}
}

/**
 * @param {unknown} actual
 * @param {Quat | number[]} expected
 */
export function assertQuatAlmostEquals(actual, expected, tolerance = 0.00001, msg = "") {
	assertIsQuaternion(actual, msg);
	assertIsQuaternion(expected, msg);
	const actualQuat = arrayToQuat(actual, msg);
	const expectedQuat = arrayToQuat(expected, msg);
	if (!msg) msg = `Expected Quaternion to be close to ${expectedQuat} but got ${actualQuat}`;
	assertAlmostEquals(actualQuat.x, expectedQuat.x, tolerance, msg);
	assertAlmostEquals(actualQuat.y, expectedQuat.y, tolerance, msg);
	assertAlmostEquals(actualQuat.z, expectedQuat.z, tolerance, msg);
	assertAlmostEquals(actualQuat.w, expectedQuat.w, tolerance, msg);
}

/**
 * @param {Mat4} mat
 */
function matrixToString(mat) {
	if (mat instanceof Mat4) {
		return "[" + mat.toArray().join(", ") + "]";
	} else {
		return `"${mat}"`;
	}
}

/**
 * @param {Mat4 | number[]} actual
 * @param {Mat4 | number[]} expected
 */
export function assertMatAlmostEquals(actual, expected, tolerance = 0.00001, msg = "") {
	if (!actual) {
		throw new TypeError(`Actual does not have the correct type: ${matrixToString(actual)}`);
	}
	if (!expected) {
		throw new TypeError(`Expected does not have the correct type: ${matrixToString(expected)}`);
	}
	const mat1 = new Mat4(actual);
	const mat2 = new Mat4(expected);
	const array1 = mat1.toArray();
	const array2 = mat2.toArray();
	if (array1.length != array2.length) {
		throw new Error(`Matrices are not of the same size: ${matrixToString(mat1)} and ${matrixToString(mat2)}`);
	}
	for (let i = 0; i < array1.length; i++) {
		let message = msg;
		if (!message) {
			message = `Expected matrix to be close to ${matrixToString(mat2)} but got ${matrixToString(mat1)}. Item with index ${i} doesn't match. (tolerance = ${tolerance})`;
		}
		assertAlmostEquals(array1[i], array2[i], tolerance, message);
	}
}

/**
 * Asserts whether a promise is currently resolved or not. By default, the check is made asynchronously. The call waits
 * for the next event loops and gives the promise a chance to resolve in the current event loop.
 * The reason for this is that there is no way to synchronously check the resolved state of
 * promises in JavaScript.
 * @param {Promise<any>} promise
 * @param {boolean} expected
 */
export async function assertPromiseResolved(promise, expected) {
	let resolved = false;
	(async () => {
		await promise;
		resolved = true;
	})();
	await waitForMicrotasksFn();
	const msg = expected ? "Expected the promise to be resolved" : "Expected the promise to not be resolved";
	assert(resolved == expected, msg);
}
