import {assertThrows} from "asserts";
import {Vec3} from "../../../src/mod.js";
import {assertAlmostEquals, assertVecAlmostEquals} from "./asserts.js";

Deno.test({
	name: "assertAlmostEquals() don't throw",
	fn() {
		assertAlmostEquals(1.0, 1.09);
		assertAlmostEquals(1.0, 1.09, 0.1, "message");
		assertAlmostEquals(5.6, 5.51);
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
			assertAlmostEquals(1.0, 1.01, 0.0001);
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
	name: "assertVecAlmostEquals() don't throw",
	fn() {
		// TODO: Add tests for vec2 and vec4
		assertVecAlmostEquals(new Vec3(1, 2, 3), new Vec3(1.09, 2.01, 3));
		assertVecAlmostEquals(new Vec3(1, 2, 3), [1.09, 2.01, 3]);
		assertVecAlmostEquals([1, 2, 3], [1.09, 2.01, 3]);
		assertVecAlmostEquals([1, 2, 3], [10, 10, 10], 30);
	},
});

Deno.test({
	name: "assertVecAlmostEquals() throw",
	fn() {
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
