import {assert} from "std/testing/asserts";
import {Mat4} from "../../../../src/mod.js";

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
