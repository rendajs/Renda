import { assertEquals, assertExists, assertNotStrictEquals } from "std/testing/asserts.ts";
import { Sphere, Vec2, Vec3, Vec4 } from "../../../../../src/mod.js";
import { assertAlmostEquals, assertVecAlmostEquals } from "../../../shared/asserts.js";

Deno.test({
	name: "Should be radius 1, pos 0,0,0 by default",
	fn() {
		const sphere = new Sphere();

		assertEquals(sphere.radius, 1);
		assertEquals(sphere.pos.toArray(), [0, 0, 0]);
	},
});

Deno.test({
	name: "Create with radius only",
	fn() {
		const sphere = new Sphere(5);

		assertEquals(sphere.radius, 5);
		assertEquals(sphere.pos.toArray(), [0, 0, 0]);
	},
});

Deno.test({
	name: "Create with radius and Vec2",
	fn() {
		const sphere = new Sphere(5, new Vec2(1, 2));

		assertEquals(sphere.radius, 5);
		assertEquals(sphere.pos.toArray(), [1, 2, 0]);
	},
});

Deno.test({
	name: "Create with radius and Vec3",
	fn() {
		const sphere = new Sphere(5, new Vec3(1, 2, 3));

		assertEquals(sphere.radius, 5);
		assertEquals(sphere.pos.toArray(), [1, 2, 3]);
	},
});

Deno.test({
	name: "Create with radius and Vec4",
	fn() {
		const sphere = new Sphere(5, new Vec4(1, 2, 3, 4));

		assertEquals(sphere.radius, 5);
		assertEquals(sphere.pos.toArray(), [1, 2, 3]);
	},
});

Deno.test({
	name: "Create with radius and array",
	fn() {
		const sphere = new Sphere(5, [1, 2, 3]);

		assertEquals(sphere.radius, 5);
		assertEquals(sphere.pos.toArray(), [1, 2, 3]);
	},
});

Deno.test({
	name: "Create with radius and empty array",
	fn() {
		const sphere = new Sphere(5, []);

		assertEquals(sphere.radius, 5);
		assertEquals(sphere.pos.toArray(), [0, 0, 0]);
	},
});

Deno.test({
	name: "Create with radius and numbers",
	fn() {
		const sphere = new Sphere(5, 1, 2, 3);

		assertEquals(sphere.radius, 5);
		assertEquals(sphere.pos.toArray(), [1, 2, 3]);
	},
});

Deno.test({
	name: "Create with other sphere",
	fn() {
		const sphere = new Sphere(5, 1, 2, 3);
		const sphere2 = new Sphere(sphere);

		assertEquals(sphere2.radius, 5);
		assertEquals(sphere2.pos.toArray(), [1, 2, 3]);
		assertNotStrictEquals(sphere, sphere2);
	},
});

Deno.test({
	name: "Set with radius only",
	fn() {
		const sphere = new Sphere();

		sphere.set(5);

		assertEquals(sphere.radius, 5);
		assertEquals(sphere.pos.toArray(), [0, 0, 0]);
	},
});

Deno.test({
	name: "Set with and Vec3",
	fn() {
		const sphere = new Sphere();

		sphere.set(5, new Vec3(1, 2, 3));

		assertEquals(sphere.radius, 5);
		assertEquals(sphere.pos.toArray(), [1, 2, 3]);
	},
});

Deno.test({
	name: "Set with and array",
	fn() {
		const sphere = new Sphere();

		sphere.set(5, [1, 2, 3]);

		assertEquals(sphere.radius, 5);
		assertEquals(sphere.pos.toArray(), [1, 2, 3]);
	},
});

Deno.test({
	name: "Set with other sphere",
	fn() {
		const sphere = new Sphere(5, 1, 2, 3);
		const sphere2 = new Sphere();

		sphere2.set(sphere);

		assertEquals(sphere2.radius, 5);
		assertEquals(sphere2.pos.toArray(), [1, 2, 3]);
		assertNotStrictEquals(sphere, sphere2);
	},
});

Deno.test({
	name: "clone",
	fn() {
		const sphere = new Sphere(5, [1, 2, 3]);
		const clonedSphere = sphere.clone();

		assertEquals(clonedSphere.radius, 5);
		assertEquals(clonedSphere.pos.toArray(), [1, 2, 3]);
		assertNotStrictEquals(sphere, clonedSphere);
	},
});

Deno.test({
	name: "raycast() hit",
	fn() {
		const sphere = new Sphere();
		const start = new Vec3(-5, 0, 0);
		const dir = new Vec3(1, 0, 0);

		const result = sphere.raycast(start, dir);

		assertExists(result);
		assertEquals(result.dist, 4);
		assertEquals(result.pos.toArray(), [-1, 0, 0]);
	},
});

Deno.test({
	name: "raycast() miss",
	fn() {
		const sphere = new Sphere();
		const start = new Vec3(-5, 10, 0);
		const dir = new Vec3(1, 0, 0);

		const result = sphere.raycast(start, dir);

		assertEquals(result, null);
	},
});

Deno.test({
	name: "raycast() away from sphere",
	fn() {
		const sphere = new Sphere();
		const start = new Vec3(-5, 0, 0);
		const dir = new Vec3(-1, 0, 0);

		const restult = sphere.raycast(start, dir);

		assertEquals(restult, null);
	},
});

Deno.test({
	name: "raycast() more complex",
	fn() {
		const sphere = new Sphere(5, [0, 10, 0]);
		const start = new Vec3(-5, 9, 0);
		const dir = new Vec3(1, 0, 0);

		const result = sphere.raycast(start, dir);

		assertExists(result);
		assertAlmostEquals(result.dist, 0.1, 0.1);
		assertVecAlmostEquals(result.pos, [-4.9, 9, 0], 0.1);
	},
});

Deno.test({
	name: "raycast() start inside sphere",
	fn() {
		const sphere = new Sphere(5, [0, 10, 0]);
		const start = new Vec3(-1, 10, 0);
		const dir = new Vec3(1, 0, 0);

		const result = sphere.raycast(start, dir);

		assertExists(result);
		assertEquals(result.dist, 0);
		assertVecAlmostEquals(result.pos, [-1, 10, 0]);
	},
});

// ======== onChange Callbacks ========

Deno.test({
	name: "onChange fires once when added multiple times",
	fn() {
		let fireCount = 0;
		const cb = () => fireCount++;

		const sphere = new Sphere();
		sphere.onChange(cb);
		sphere.onChange(cb);
		sphere.set(1, 1, 1);

		assertEquals(fireCount, 1);
	},
});

Deno.test({
	name: "onChange doesn't fire when removed",
	fn() {
		let fireCount = 0;
		const cb = () => fireCount++;

		const sphere = new Sphere();
		sphere.onChange(cb);
		sphere.removeOnChange(cb);
		sphere.set(1, 1, 1);

		assertEquals(fireCount, 0);
	},
});

Deno.test({
	name: "onChange fires when the radius changes",
	fn() {
		let fireCount = 0;
		const cb = () => fireCount++;
		const sphere = new Sphere();
		sphere.onChange(cb);

		sphere.radius = 5;

		assertEquals(fireCount, 1);
	},
});

Deno.test({
	name: "onChange fires when the position changes",
	fn() {
		let fireCount = 0;
		const cb = () => fireCount++;
		const sphere = new Sphere();
		sphere.onChange(cb);

		sphere.pos = [1, 2, 3];

		assertEquals(fireCount, 1);
	},
});

Deno.test({
	name: "onChange fires when a single component of the position changes",
	fn() {
		let fireCount = 0;
		const cb = () => fireCount++;
		const sphere = new Sphere();
		sphere.onChange(cb);

		sphere.pos.x = 1;

		assertEquals(fireCount, 1);
	},
});

Deno.test({
	name: "onChange keeps working when changing the position",
	fn() {
		let fireCount = 0;
		const cb = () => fireCount++;
		const sphere = new Sphere();
		sphere.onChange(cb);

		sphere.pos = new Vec3(1, 2, 3);
		sphere.pos.x = 2;
		sphere.pos = new Vec3(3, 2, 3);
		sphere.pos.x = 4;

		assertEquals(fireCount, 4);
	},
});

Deno.test({
	name: "onChange fires when set() is called",
	fn() {
		let fireCount = 0;
		const cb = () => fireCount++;
		const sphere = new Sphere();
		sphere.onChange(cb);

		sphere.set(1, [1, 2, 3]);

		assertEquals(fireCount, 1);
	},
});
