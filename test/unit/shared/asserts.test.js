import {assertRejects, assertThrows} from "std/testing/asserts.ts";
import {Mat4, Quat, Vec2, Vec3, Vec4} from "../../../src/mod.js";
import {assertAlmostEquals, assertMatAlmostEquals, assertPromiseResolved, assertQuatAlmostEquals, assertVecAlmostEquals} from "./asserts.js";

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

		// Vec4
		assertVecAlmostEquals(new Vec4(1, 2, 3), new Vec4(1.000001, 1.999999, 3, 1.000001));
		assertVecAlmostEquals(new Vec4(1, 2, 3), [1.000001, 1.999999, 3, 0.999999]);
		assertVecAlmostEquals([1, 2, 3, 4], [1.000001, 1.999999, 3, 4.000001]);
		assertVecAlmostEquals([1, 2, 3, 4], [10, 10, 10, 10], 30);
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

Deno.test({
	name: "assertVecAlmostEquals() throw when the type is different (Vec4)",
	fn() {
		assertThrows(() => {
			assertVecAlmostEquals(new Vec4(1, 2, 0, -1), new Vec2(1, 2));
		});
		assertThrows(() => {
			assertVecAlmostEquals(new Vec4(1, 2, 3, 4), new Vec3(1, 2, 3));
		});
		assertThrows(() => {
			assertVecAlmostEquals(new Vec4(1, 2, 3, 4), [1, 2, 1]);
		});
		assertThrows(() => {
			assertVecAlmostEquals(new Vec4(1, 2, 3, 4), [1, 2]);
		});
	},
});

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

Deno.test({
	name: "assertQuatAlmostEquals() doesn't throw",
	fn() {
		assertQuatAlmostEquals(new Quat(1, 2, 3), new Quat(1.000001, 1.999999, 3, 1.000001));
		assertQuatAlmostEquals(new Quat(1, 2, 3, 10), new Quat(), 10);
	},
});

Deno.test({
	name: "assertQuatAlmostEquals() throws",
	fn() {
		assertThrows(() => {
			assertQuatAlmostEquals(new Quat(1, 2, 3), new Quat(1, 2, 3, 1.1));
		});
		assertThrows(() => {
			assertQuatAlmostEquals(new Quat(1, 2, 3, 10), new Quat());
		});
	},
});

Deno.test({
	name: "assertMatAlmostEquals doesn't throw",
	fn() {
		const mat1 = new Mat4();
		assertMatAlmostEquals(mat1, mat1);

		const mat2a = new Mat4([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
		const mat2b = mat2a.clone();
		assertMatAlmostEquals(mat2a, mat2a);
		assertMatAlmostEquals(mat2a, mat2b);

		const mat3a = new Mat4([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
		const mat3bValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
		for (let i = 0; i < mat3bValues.length; i++) {
			mat3bValues[i] += 1e-10;
		}
		const mat3b = new Mat4(mat3bValues);
		assertMatAlmostEquals(mat3a, mat3b);

		const mat4a = new Mat4([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
		const mat4b = new Mat4([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
		assertMatAlmostEquals(mat4a, mat4b, 2);

		const mat5a = new Mat4([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
		const mat5b = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
		assertMatAlmostEquals(mat5a, mat5b);
	},
});

Deno.test({
	name: "assertMatAlmostEquals throws when the values are incorrect",
	fn() {
		assertThrows(() => {
			assertMatAlmostEquals(new Mat4(), new Mat4([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]));
		});
		assertThrows(() => {
			assertMatAlmostEquals(new Mat4([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]), new Mat4());
		});
		assertThrows(() => {
			assertMatAlmostEquals(new Mat4([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]), new Mat4([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17]));
		});
		assertThrows(() => {
			const mat1 = new Mat4([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
			const mat2Values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
			for (let i = 0; i < mat2Values.length; i++) {
				mat2Values[i] += 1e-10;
			}
			const mat2 = new Mat4(mat2Values);
			assertMatAlmostEquals(mat1, mat2, 0);
		});
		assertThrows(() => {
			const values1 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
			const values2 = [1, null, null, null, null, 1, null, null, null, null, 1, null, null, null, null, 1];
			assertMatAlmostEquals(new Mat4(values1), new Mat4(/** @type {any} */(values2)));
		});
	},
});
Deno.test({
	name: "assertMatAlmostEquals throws when the parameters are not a matrix",
	fn() {
		const values = [
			new Vec4(),
			[1, 2, 3, 4],
			[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
			null,
			undefined,
			{},
			[],
			"",
			0,
		];
		for (const value of values) {
			assertThrows(() => {
				assertMatAlmostEquals(new Mat4(), /** @type {any} */(value));
			});
		}
		assertThrows(() => {
			assertMatAlmostEquals(/** @type {any} */(null), new Mat4());
		});
	},
});

Deno.test({
	name: "assertPromise resolved true",
	async fn() {
		const promise = new Promise(r => {
			setTimeout(r, 0);
		});
		await promise;
		await assertPromiseResolved(promise, true);

		await assertRejects(async () => {
			await assertPromiseResolved(promise, false);
		}, Error, "Expected the promise to not be resolved");
	},
});

Deno.test({
	name: "assertPromise resolved false",
	async fn() {
		const promise = new Promise(r => {});
		await assertPromiseResolved(promise, false);

		await assertRejects(async () => {
			await assertPromiseResolved(promise, true);
		}, Error, "Expected the promise to be resolved");
	},
});
