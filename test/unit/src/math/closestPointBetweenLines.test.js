import {Vec3, closestPointBetweenLines} from "../../../../src/mod.js";
import {assertVecAlmostEquals} from "../../shared/asserts.js";

Deno.test({
	name: "overlapping lines",
	fn() {
		const pos1 = new Vec3(0, 0, 0);
		const dir1 = Vec3.right;
		const pos2 = new Vec3(1, 0, 0);
		const dir2 = Vec3.right;

		const result = closestPointBetweenLines(pos1, dir1, pos2, dir2);

		assertVecAlmostEquals(result, [0, 0, 0]);
	},
});

Deno.test({
	name: "parallel lines",
	fn() {
		const pos1 = new Vec3(0, 0, 0);
		const dir1 = Vec3.right;
		const pos2 = new Vec3(0, 1, 0);
		const dir2 = Vec3.right;

		const result = closestPointBetweenLines(pos1, dir1, pos2, dir2);

		assertVecAlmostEquals(result, [0, 0, 0]);
	},
});

Deno.test({
	name: "intersecting lines",
	fn() {
		const tests = [
			{pos1: [0, 0, 0], dir1: [1, 0, 0], pos2: [0, 0, 0], dir2: [0, 1, 0], result: [0, 0, 0]},
			{pos1: [0, 0, 0], dir1: [1, 0, 0], pos2: [1, 0, 0], dir2: [0, 1, 0], result: [1, 0, 0]},
			{pos1: [0, 0, 0], dir1: [1, 0, 0], pos2: [1, 0, 0], dir2: [0, 2, 1], result: [1, 0, 0]},
			{pos1: [-3, 2, 1], dir1: [4, 0, 0], pos2: [1, 0, 0], dir2: [0, 2, 1], result: [1, 2, 1]},
			{pos1: [-2, 2, -2], dir1: [3, -1, 2], pos2: [1, -2, 3], dir2: [0, 1, -1], result: [1, 1, 0]},
		];

		for (const test of tests) {
			const pos1 = new Vec3(test.pos1);
			const dir1 = new Vec3(test.dir1);
			const pos2 = new Vec3(test.pos2);
			const dir2 = new Vec3(test.dir2);

			const result = closestPointBetweenLines(pos1, dir1, pos2, dir2);

			assertVecAlmostEquals(result, test.result);
		}
	},
});

Deno.test({
	name: "non-intersecting lines",
	fn() {
		const tests = [
			{pos1: [1, 1, 1], dir1: [0, 1, 0], pos2: [0, 0, 0], dir2: [1, 0, 0], result: [1, 0, 1]},
			{pos1: [3, 3, 3], dir1: [0, 1, 0], pos2: [2, 2, 2], dir2: [1, 0, 0], result: [3, 2, 3]},
			{pos1: [1, 1, 2], dir1: [1, 1, 0], pos2: [-2, 2, 1], dir2: [0, 1, 0], result: [-2, -2, 2]},
			{pos1: [3, -1, 1], dir1: [0, 1, 1], pos2: [3, 4, -1], dir2: [1, 1, 1], result: [3, 0.5, 2.5]},
			{pos1: [3, -1, 1], dir1: [0, 1, 1], pos2: [2, 3, -2], dir2: [1, 1, 1], result: [3, 0.5, 2.5]},
			{pos1: [3, -1, 1], dir1: [0, 1, 1], pos2: [0, 1, -4], dir2: [1, 1, 1], result: [3, 0.5, 2.5]},

			// TODO:
			// Rejection perpendicular to dir1, causing dot to be 0, causing a possible division by 0
			// {pos1: [1, 1, 0], dir1: [0, 0, 1], pos2: [0, 0, 0], dir2: [1, 0, 0], result: [3, 0.5, 2.5]},
		];

		for (const test of tests) {
			const pos1 = new Vec3(test.pos1);
			const dir1 = new Vec3(test.dir1);
			const pos2 = new Vec3(test.pos2);
			const dir2 = new Vec3(test.dir2);

			const result = closestPointBetweenLines(pos1, dir1, pos2, dir2);

			assertVecAlmostEquals(result, test.result);
		}
	},
});
