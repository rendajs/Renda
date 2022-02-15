import {AssertionError} from "asserts";
import {Vec2, Vec3, Vec4} from "../../../src/mod.js";

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
 * @param {Vec2 | Vec3 | Vec4 | number[]} expected
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
		// @ts-expect-error
		dist = actualVec.distanceTo(expectedVec);
		if (isNaN(actualVec.x) || isNaN(actualVec.y) || isNaN(actualVec.z) || isNaN(actualVec.w) || isNaN(expectedVec.x) || isNaN(expectedVec.y) || isNaN(expectedVec.z) || isNaN(expectedVec.w)) {
			hasNaN = true;
		}
	} else {
		if (msg) {
			throw new AssertionError(msg);
		}
		if (!expected) {
			throw new AssertionError(`Expected ${expectedVec.toArray()} but got ${expected}`);
		}
		throw new AssertionError(`Two vectors are not of the same type: ${actual.constructor.name} and ${expected.constructor.name}`);
	}
	if (dist > tolerance || hasNaN) {
		let message = msg;
		if (!message) {
			message = `Expected value to be close to ${expectedVec.toArray()} but got ${actualVec.toArray()}`;
		}
		throw new AssertionError(message);
	}
}
