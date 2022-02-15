import {assertThrows} from "asserts";
import {Vec2, Vec3, Vec4} from "../../../src/mod.js";
import {assertAlmostEquals, assertVecAlmostEquals} from "./asserts.js";

Deno.test({
	name: "assertAlmostEquals() doesn't throw",
	fn() {
		assertAlmostEquals(1.0, 1.000009);
		assertAlmostEquals(1.0, 1.09, 0.1, "message");
		assertAlmostEquals(5.6, 5.599999);
		assertAlmostEquals(-10.0, -11, 2);
		assertAlmostEquals(10, 10);
	},
});

Deno.test({
	name: "assertAlmostEquals() throws",
	fn() {
		assertThrows(() => {
			assertAlmostEquals(1.0, 1.1);
		});
		assertThrows(() => {
			assertAlmostEquals(1.0, 1.00002);
		});
		assertThrows(() => {
			assertAlmostEquals(-10.0, 100);
		});
		assertThrows(() => {
			assertAlmostEquals(NaN, 0);
		});
	},
});

Deno.test({
	name: "assertVecAlmostEquals() doesn't throw",
	fn() {
		// Vec2
		assertVecAlmostEquals(new Vec2(1, 2), new Vec2(1.000001, 1.999999));
		assertVecAlmostEquals(new Vec2(1, 2), [1.000001, 1.999999]);
		assertVecAlmostEquals([1, 2], [1.000001, 1.999999]);
		assertVecAlmostEquals([1, 2], [10, 10], 30);

		// Vec3
		assertVecAlmostEquals(new Vec3(1, 2, 3), new Vec3(1.000001, 1.999999, 3));
		assertVecAlmostEquals(new Vec3(1, 2, 3), [1.000001, 1.999999, 3]);
		assertVecAlmostEquals([1, 2, 3], [1.000001, 1.999999, 3]);
		assertVecAlmostEquals([1, 2, 3], [10, 10, 10], 30);

		// TODO: Add tests for vec4
	},
});

Deno.test({
	name: "assertVecAlmostEquals() throw when the type is different (Vec2)",
	fn() {
		assertThrows(() => {
			assertVecAlmostEquals(new Vec2(1, 2), new Vec3(1, 2));
		});
		assertThrows(() => {
			assertVecAlmostEquals(new Vec2(1, 2), new Vec4(1, 2));
		});
		assertThrows(() => {
			assertVecAlmostEquals(new Vec2(1, 2), [1, 2, 0]);
		});
		assertThrows(() => {
			assertVecAlmostEquals(new Vec2(1, 2), [1, 2, 0, 0]);
		});
	},
});

Deno.test({
	name: "assertVecAlmostEquals() throw when the type is different (Vec3)",
	fn() {
		assertThrows(() => {
			assertVecAlmostEquals(new Vec3(1, 2, 0), new Vec2(1, 2));
		});
		assertThrows(() => {
			assertVecAlmostEquals(new Vec3(1, 2, 3), new Vec4(1, 2, 3));
		});
		assertThrows(() => {
			assertVecAlmostEquals(new Vec3(1, 2), [1, 2]);
		});
		assertThrows(() => {
			assertVecAlmostEquals(new Vec3(1, 2, 3), [1, 2, 3, 0]);
		});
	},
});

// TODO: Add tests for Vec4

Deno.test({
	name: "assertVecAlmostEquals() throw when the values are incorrect",
	fn() {
		// Different values
		assertThrows(() => {
			assertVecAlmostEquals(new Vec3(1, 2, 3), new Vec3(1.1, 2, 3));
		});
		assertThrows(() => {
			assertVecAlmostEquals([0, 0, 0], [1, 2, 3]);
		});
		assertThrows(() => {
			assertVecAlmostEquals([0, 0, 0], [11, 0, 0], 10);
		});
		assertThrows(() => {
			assertVecAlmostEquals([NaN, 0, 0], [0, 0, 0]);
		});
		assertThrows(() => {
			assertVecAlmostEquals([NaN, 0, 0], [NaN, 0, 0]);
		});
	},
});
