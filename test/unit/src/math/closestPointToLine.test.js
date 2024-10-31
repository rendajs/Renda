import { assertEquals } from "std/testing/asserts.ts";
import { Vec3, closestPointToLine, closestPointToLineParameter } from "../../../../src/mod.js";
import { assertVecAlmostEquals } from "../../../../src/util/asserts.js";

Deno.test({
	name: "point halfway on line",
	fn() {
		const start = new Vec3(0, 0, 0);
		const end = new Vec3(1, 0, 0);
		const pos = new Vec3(0.5, 0, 0);

		const result = closestPointToLine(start, end, pos);

		assertVecAlmostEquals(result, [0.5, 0, 0]);
	},
});

Deno.test({
	name: "point outside on line",
	fn() {
		const start = new Vec3(0, 0, 0);
		const end = new Vec3(1, 0, 0);
		const pos = new Vec3(2, 0, 0);

		const result = closestPointToLine(start, end, pos);

		assertVecAlmostEquals(result, [1, 0, 0]);
	},
});

Deno.test({
	name: "point next to line",
	fn() {
		const start = new Vec3(0, 0, 0);
		const end = new Vec3(1, 0, 0);
		const pos = new Vec3(0.5, 1, 1);

		const result = closestPointToLine(start, end, pos);

		assertVecAlmostEquals(result, [0.5, 0, 0]);
	},
});

Deno.test({
	name: "paramater outside on line",
	fn() {
		const start = new Vec3(0, 0, 0);
		const end = new Vec3(1, 0, 0);
		const pos = new Vec3(2, 0, 0);

		const result = closestPointToLineParameter(start, end, pos);

		assertEquals(result, 2);
	},
});
