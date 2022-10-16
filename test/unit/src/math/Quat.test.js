import {Quat} from "../../../../src/mod.js";
import {assertVecAlmostEquals} from "../../shared/asserts.js";

Deno.test({
	name: "rotateVector()",
	fn() {
		/** @type {[Quat, number[], number[]][]} */
		const tests = [
			[new Quat(), [1, 0, 0], [1, 0, 0]],
			[Quat.fromAxisAngle(0, 0, 1, Math.PI * 0.5), [1, 0, 0], [0, 1, 0]],
			[Quat.fromAxisAngle(0, 0, 1, Math.PI * 0.5), [5, 0, 0], [0, 5, 0]],
			[Quat.fromAxisAngle(0, 1, 0, Math.PI), [5, 3, -1], [-5, 3, 1]],
			[Quat.fromAxisAngle(0, 1, 0, -Math.PI), [5, 3, -1], [-5, 3, 1]],
			[Quat.fromAxisAngle(0, 1, 0, Math.PI * 0.5), [5, 3, -1], [-1, 3, -5]],
		];

		for (const [quat, vec, expected] of tests) {
			const rotated = quat.rotateVector(vec);
			assertVecAlmostEquals(rotated, expected);
		}
	},
});
