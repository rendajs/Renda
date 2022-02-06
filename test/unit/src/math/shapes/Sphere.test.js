import {assertEquals, assertNotStrictEquals} from "asserts";
import {Sphere, Vec2, Vec3, Vec4} from "../../../../../src/mod.js";

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
