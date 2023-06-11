import {assert, assertEquals, assertThrows} from "std/testing/asserts.ts";
import {Mat4, Quat, Vec3} from "../../../../src/mod.js";
import {assertQuatAlmostEquals, assertVecAlmostEquals} from "../../shared/asserts.js";
import {assertSpyCalls, spy} from "std/testing/mock.ts";

const oneTo16Array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

Deno.test({
	name: "Has identity matrix by default",
	fn() {
		const mat = new Mat4();
		assertEquals(mat.getFlatArray(), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
	},
});

Deno.test({
	name: "Constructor with Float32Array",
	fn() {
		const mat = new Mat4(new Float32Array(oneTo16Array));
		assertEquals(mat.getFlatArray(), oneTo16Array);
	},
});

Deno.test({
	name: "Constructor with flat array",
	fn() {
		const mat = new Mat4(oneTo16Array);
		assertEquals(mat.getFlatArray(), oneTo16Array);
	},
});

Deno.test({
	name: "Constructor with another matrix",
	fn() {
		const mat1 = new Mat4(oneTo16Array);
		const mat2 = new Mat4(mat1);
		assertEquals(mat2.getFlatArray(), oneTo16Array);
	},
});

Deno.test({
	name: "Constructor with 2d array",
	fn() {
		const mat = new Mat4([
			[1, 2, 3, 4],
			[5, 6, 7, 8],
			[9, 10, 11, 12],
			[13, 14, 15, 16],
		]);
		assertEquals(mat.getFlatArray(), oneTo16Array);
	},
});

Deno.test({
	name: "Constructor with invalid array",
	fn() {
		assertThrows(() => {
			new Mat4([1, 2, 3]);
		}, TypeError, "Invalid Matrix constructor argument, array must be a 16 element array or a 4x4 array.");
	},
});

Deno.test({
	name: "equals() true",
	fn() {
		const equalsTests = [
			[new Mat4(), new Mat4()],
			[Mat4.createTranslation(1, 2, 3), Mat4.createTranslation(1, 2, 3)],
			[Mat4.createRotationX(0.123), Mat4.createRotationX(0.123)],
		];

		for (const [mat1, mat2] of equalsTests) {
			assert(mat1.equals(mat2), `Expected matrices to be equal: ${mat1.toArray()} and ${mat2.toArray()}`);
		}
	},
});

Deno.test({
	name: "equals() false",
	fn() {
		const equalsTests = [
			[new Mat4(), Mat4.createTranslation(1, 2, 3)],
			[Mat4.createTranslation(1, 2, 3), Mat4.createTranslation(1, 2, 4)],
			[Mat4.createRotationX(0.123), Mat4.createRotationX(0.124)],
		];

		for (const [mat1, mat2] of equalsTests) {
			assert(!mat1.equals(mat2), `Expected matrices to not be equal: ${mat1.toArray()} and ${mat2.toArray()}`);
		}
	},
});

Deno.test({
	name: "isIdentity()",
	fn() {
		/** @type {[Mat4, boolean][]} */
		const identityTests = [
			[new Mat4(), true],
			[Mat4.createTranslation(1, 2, 3), false],
			[Mat4.createRotationX(0.123), false],
		];

		for (const [mat, expected] of identityTests) {
			assert(mat.isIdentity() === expected, `Expected ${mat.toArray()} to be ${expected}`);
		}
	},
});

Deno.test({
	name: "getRotation()",
	fn() {
		const scaleMatrix = Mat4.createPosRotScale(Vec3.zero, new Quat(), new Vec3(0.1, 1.1, 1.1));
		const rotMatrix = Mat4.createRotationZ(Math.PI * 0.5);
		const multiplied = Mat4.multiplyMatrices(scaleMatrix, rotMatrix);
		const rot = multiplied.getRotation();
		assertQuatAlmostEquals(rot, new Quat(0, 0, 0.70710678, 0.70710678));
	},
});

Deno.test({
	name: "multiplyMatrices",
	fn() {
		// Assert that the description in the jsdoc is correct:
		const matrixA = Mat4.createTranslation(0, 1, 0);
		const matrixB = Mat4.createRotationZ(Math.PI * -0.5);
		const result = Mat4.multiplyMatrices(matrixA, matrixB);

		const point = new Vec3().multiplyMatrix(result);
		assertVecAlmostEquals(point, [1, 0, 0]);
	},
});

Deno.test({
	name: "set() updates the matrix and fires events",
	fn() {
		const mat = new Mat4();

		const changeSpy = spy();
		mat.onChange(changeSpy);

		mat.set(oneTo16Array);

		assertSpyCalls(changeSpy, 1);
		assertEquals(mat.getFlatArray(), oneTo16Array);

		mat.set(oneTo16Array);
		assertSpyCalls(changeSpy, 2);

		mat.removeOnChange(changeSpy);

		mat.set(oneTo16Array);
		assertSpyCalls(changeSpy, 2);
	},
});
