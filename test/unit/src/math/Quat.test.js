import { assertEquals } from "std/testing/asserts.ts";
import { Quat, Vec3 } from "../../../../src/mod.js";
import { assertQuatAlmostEquals, assertVecAlmostEquals } from "../../../../src/util/asserts.js";

Deno.test({
	name: "rotateAxisAngle()",
	fn() {
		const quat = new Quat();

		quat.rotateAxisAngle(0, 1, 0, Math.PI * 0.5);
		const result1 = Vec3.right.rotate(quat);
		assertVecAlmostEquals(result1, Vec3.back);

		quat.rotateAxisAngle(1, 0, 0, -Math.PI * 0.5);
		const result2 = Vec3.right.rotate(quat);
		assertVecAlmostEquals(result2, Vec3.down);
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

/**
 * @param {Quat} a
 * @param {Quat} b
 * @param {number} t
 * @param {Quat} expected
 */
function basicSlerpTest(a, b, t, expected) {
	const result = Quat.slerpQuaternions(a, b, t);
	assertQuatAlmostEquals(result, expected);
}

Deno.test({
	name: "slerp two identity quaternions",
	fn() {
		basicSlerpTest(new Quat(), new Quat(), 0, new Quat());
		basicSlerpTest(new Quat(), new Quat(), 0.123, new Quat());
		basicSlerpTest(new Quat(), new Quat(), 0.2, new Quat());
		basicSlerpTest(new Quat(), new Quat(), 0.5, new Quat());
		basicSlerpTest(new Quat(), new Quat(), 1, new Quat());
	},
});

Deno.test({
	name: "basic 180 degree slerp",
	fn() {
		const a = new Quat();
		const b = Quat.fromAxisAngle(0, 1, 0, Math.PI);
		basicSlerpTest(a, b, 0, a);
		basicSlerpTest(a, b, 0.1, Quat.fromAxisAngle(0, 1, 0, Math.PI * 0.1));
		basicSlerpTest(a, b, 0.25, Quat.fromAxisAngle(0, 1, 0, Math.PI * 0.25));
		basicSlerpTest(a, b, 0.5, Quat.fromAxisAngle(0, 1, 0, Math.PI * 0.5));
		basicSlerpTest(a, b, 0.75, Quat.fromAxisAngle(0, 1, 0, Math.PI * 0.75));
		basicSlerpTest(a, b, 0.9, Quat.fromAxisAngle(0, 1, 0, Math.PI * 0.9));
		basicSlerpTest(a, b, 1, b);
	},
});

Deno.test({
	name: "slerp that results in a negative cosHalfTheta",
	fn() {
		const a = Quat.fromAxisAngle(0, 1, 0, 2);
		const b = Quat.fromAxisAngle(0, 1, 0, -2);
		basicSlerpTest(a, b, 0.219, Quat.fromAxisAngle(0, 1, 0, 2.5));
		basicSlerpTest(a, b, 0.5, Quat.fromAxisAngle(0, 1, 0, Math.PI));
	},
});

Deno.test({
	name: "slerp two quaternions that are the same",
	fn() {
		const a = new Quat(0, 0.2, 20, 1);
		basicSlerpTest(a, a, 0.5, a);
		const b = new Quat(12, 34, 56, 78);
		basicSlerpTest(b, b, 0.5, b);
	},
});
