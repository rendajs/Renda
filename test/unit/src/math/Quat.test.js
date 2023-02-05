import {assertEquals} from "std/testing/asserts.ts";
import {Quat, Vec3} from "../../../../src/mod.js";
import {assertVecAlmostEquals} from "../../shared/asserts.js";

Deno.test({
	name: "rotateAxisAngle()",
	fn() {
		const quat = new Quat();

		quat.rotateAxisAngle(0, 1, 0, Math.PI * 0.5);
		const result1 = quat.rotateVector(Vec3.right);
		assertVecAlmostEquals(result1, Vec3.back);

		quat.rotateAxisAngle(1, 0, 0, -Math.PI * 0.5);
		const result2 = quat.rotateVector(Vec3.right);
		assertVecAlmostEquals(result2, Vec3.down);
	},
});

Deno.test({
	name: "toMat4()",
	fn() {
		const quat = Quat.fromAxisAngle(0, 1, 0, Math.PI * 0.5);
		const v1 = quat.rotateVector(0, 0, 1);

		const mat = quat.toMat4();
		const v2 = new Vec3(0, 0, 1).multiply(mat);

		assertVecAlmostEquals(v1, v2);
	},
});

Deno.test({
	name: "toString()",
	fn() {
		const vec = new Quat(1, 2, 3, 4);
		const result = vec.toString();

		assertEquals(result, "Quat<1, 2, 3, 4>");
	},
});
