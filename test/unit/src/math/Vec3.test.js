import {assertEquals, assertNotStrictEquals} from "asserts";
import {Vec2, Vec3, Vec4} from "../../../../src/mod.js";

Deno.test({
	name: "Should be 0,0,3 by default",
	fn() {
		const vec = new Vec3();

		assertEquals(vec.toArray(), [0, 0, 0]);
	},
});

Deno.test({
	name: "Create with Vec2",
	fn() {
		const vec2 = new Vec2([1, 2]);
		const vec = new Vec3(vec2);

		assertEquals(vec.toArray(), [1, 2, 0]);
	},
});

Deno.test({
	name: "Create with Vec3",
	fn() {
		const vec3 = new Vec3([1, 2, 3]);
		const vec = new Vec3(vec3);

		assertEquals(vec.toArray(), [1, 2, 3]);
	},
});

Deno.test({
	name: "Create with Vec4",
	fn() {
		const vec4 = new Vec4([1, 2, 3, 4]);
		const vec = new Vec3(vec4);

		assertEquals(vec.toArray(), [1, 2, 3]);
	},
});

Deno.test({
	name: "Create with one number",
	fn() {
		const vec = new Vec3(1);

		assertEquals(vec.toArray(), [1, 0, 0]);
	},
});

Deno.test({
	name: "Create with two numbers",
	fn() {
		const vec = new Vec3(1, 2);

		assertEquals(vec.toArray(), [1, 2, 0]);
	},
});

Deno.test({
	name: "Create with three numbers",
	fn() {
		const vec = new Vec3(1, 2, 3);

		assertEquals(vec.toArray(), [1, 2, 3]);
	},
});

Deno.test({
	name: "Create with empty array",
	fn() {
		const vec = new Vec3([]);

		assertEquals(vec.toArray(), [0, 0, 0]);
	},
});

Deno.test({
	name: "Create with array of one number",
	fn() {
		const vec = new Vec3([1]);

		assertEquals(vec.toArray(), [1, 0, 0]);
	},
});

Deno.test({
	name: "Create with array of two numbers",
	fn() {
		const vec = new Vec3([1, 2]);

		assertEquals(vec.toArray(), [1, 2, 0]);
	},
});

Deno.test({
	name: "Create with array of three number",
	fn() {
		const vec = new Vec3([1, 2, 3]);

		assertEquals(vec.toArray(), [1, 2, 3]);
	},
});

Deno.test({
	name: "Set with Vec2",
	fn() {
		const vec2 = new Vec2([1, 2]);
		const vec = new Vec3();
		vec.set(vec2);

		assertEquals(vec.toArray(), [1, 2, 0]);
	},
});

Deno.test({
	name: "Set with Vec3",
	fn() {
		const vec3 = new Vec3([1, 2, 3]);
		const vec = new Vec3();
		vec.set(vec3);

		assertEquals(vec.toArray(), [1, 2, 3]);
	},
});

Deno.test({
	name: "Set with Vec4",
	fn() {
		const vec4 = new Vec4([1, 2, 3, 4]);
		const vec = new Vec3();
		vec.set(vec4);

		assertEquals(vec.toArray(), [1, 2, 3]);
	},
});

Deno.test({
	name: "Set with two numbers",
	fn() {
		const vec = new Vec3();
		vec.set(1, 2);

		assertEquals(vec.toArray(), [1, 2, 0]);
	},
});

Deno.test({
	name: "Set with empty array",
	fn() {
		const vec = new Vec3();
		vec.set([]);

		assertEquals(vec.toArray(), [0, 0, 0]);
	},
});

Deno.test({
	name: "Set with array of one number",
	fn() {
		const vec = new Vec3();
		vec.set([1]);

		assertEquals(vec.toArray(), [1, 0, 0]);
	},
});

Deno.test({
	name: "Set with array of two numbers",
	fn() {
		const vec = new Vec3();
		vec.set([1, 2]);

		assertEquals(vec.toArray(), [1, 2, 0]);
	},
});

Deno.test({
	name: "Set with array of three numbers",
	fn() {
		const vec = new Vec3();
		vec.set([1, 2, 3]);

		assertEquals(vec.toArray(), [1, 2, 3]);
	},
});

Deno.test({
	name: "clone",
	fn() {
		const vec = new Vec3(1, 2, 3);
		const vec2 = vec.clone();

		assertEquals(vec2.toArray(), [1, 2, 3]);
		assertNotStrictEquals(vec, vec2);
	},
});

Deno.test({
	name: "multiply() with single number",
	fn() {
		const vec = new Vec3(2, 3, 4);
		vec.multiply(2);

		assertEquals(vec.toArray(), [4, 6, 8]);
	},
});

Deno.test({
	name: "multiply() with two numbers",
	fn() {
		const vec = new Vec3(2, 3, 4);
		vec.multiply(4, 5);

		assertEquals(vec.toArray(), [8, 15, 0]);
	},
});

Deno.test({
	name: "multiply() with three numbers",
	fn() {
		const vec = new Vec3(2, 3, 4);
		vec.multiply(4, 5, 6);

		assertEquals(vec.toArray(), [8, 15, 24]);
	},
});

Deno.test({
	name: "multiply() with Vec2",
	fn() {
		const vec = new Vec3(2, 3, 4);
		vec.multiply(new Vec2(4, 5));

		assertEquals(vec.toArray(), [8, 15, 0]);
	},
});

Deno.test({
	name: "multiply() with Vec3",
	fn() {
		const vec = new Vec3(2, 3, 4);
		vec.multiply(new Vec3(4, 5, 6));

		assertEquals(vec.toArray(), [8, 15, 24]);
	},
});

Deno.test({
	name: "multiply() with Vec4",
	fn() {
		const vec = new Vec3(2, 3, 4);
		vec.multiply(new Vec4(4, 5, 6, 7));

		assertEquals(vec.toArray(), [8, 15, 24]);
	},
});

Deno.test({
	name: "multiply() with array",
	fn() {
		const vec = new Vec3(2, 3, 4);
		vec.multiply([4, 5, 6]);

		assertEquals(vec.toArray(), [8, 15, 24]);
	},
});

Deno.test({
	name: "multiplyScalar()",
	fn() {
		const vec = new Vec3(2, 3, 4);
		vec.multiplyScalar(2);

		assertEquals(vec.toArray(), [4, 6, 8]);
	},
});

Deno.test({
	name: "multiplyVector()",
	fn() {
		const vec = new Vec3(2, 3, 4);
		vec.multiplyVector(new Vec3(4, 5, 6));

		assertEquals(vec.toArray(), [8, 15, 24]);
	},
});

Deno.test({
	name: "add() with single number",
	fn() {
		const vec = new Vec3(2, 3, 4);
		vec.add(2);

		assertEquals(vec.toArray(), [4, 5, 6]);
	},
});

Deno.test({
	name: "add() with Vec2",
	fn() {
		const vec = new Vec3(2, 3, 4);
		vec.add(new Vec2(4, 5));

		assertEquals(vec.toArray(), [6, 8, 4]);
	},
});

Deno.test({
	name: "add() with Vec3",
	fn() {
		const vec = new Vec3(2, 3, 4);
		vec.add(new Vec3(4, 5, 6));

		assertEquals(vec.toArray(), [6, 8, 10]);
	},
});

Deno.test({
	name: "add() with Vec4",
	fn() {
		const vec = new Vec3(2, 3, 4);
		vec.add(new Vec4(4, 5, 6, 7));

		assertEquals(vec.toArray(), [6, 8, 10]);
	},
});

Deno.test({
	name: "add() with array",
	fn() {
		const vec = new Vec3(2, 3, 4);
		vec.add([4, 5, 6]);

		assertEquals(vec.toArray(), [6, 8, 10]);
	},
});

Deno.test({
	name: "addScalar()",
	fn() {
		const vec = new Vec3(2, 3, 4);
		vec.addScalar(2);

		assertEquals(vec.toArray(), [4, 5, 6]);
	},
});

Deno.test({
	name: "addVector()",
	fn() {
		const vec = new Vec3(2, 3, 4);
		vec.addVector(new Vec3(4, 5, 6));

		assertEquals(vec.toArray(), [6, 8, 10]);
	},
});

Deno.test({
	name: "sub() with single number",
	fn() {
		const vec = new Vec3(3, 4, 5);
		vec.sub(2);

		assertEquals(vec.toArray(), [1, 2, 3]);
	},
});

Deno.test({
	name: "sub() with Vec2",
	fn() {
		const vec = new Vec3(3, 4, 5);
		vec.sub(new Vec2(1, 2));

		assertEquals(vec.toArray(), [2, 2, 5]);
	},
});

Deno.test({
	name: "sub() with Vec3",
	fn() {
		const vec = new Vec3(3, 4, 5);
		vec.sub(new Vec3(1, 2, 3));

		assertEquals(vec.toArray(), [2, 2, 2]);
	},
});

Deno.test({
	name: "sub() with Vec4",
	fn() {
		const vec = new Vec3(3, 4, 5);
		vec.sub(new Vec4(1, 2, 3, 4));

		assertEquals(vec.toArray(), [2, 2, 2]);
	},
});

Deno.test({
	name: "sub() with array",
	fn() {
		const vec = new Vec3(2, 3, 4);
		vec.sub([1, 2, 3]);

		assertEquals(vec.toArray(), [1, 1, 1]);
	},
});

Deno.test({
	name: "subScalar()",
	fn() {
		const vec = new Vec3(4, 5, 6);
		vec.subScalar(2);

		assertEquals(vec.toArray(), [2, 3, 4]);
	},
});

Deno.test({
	name: "subVector()",
	fn() {
		const vec = new Vec3(4, 5, 6);
		vec.subVector(new Vec3(2, 3, 4));

		assertEquals(vec.toArray(), [2, 2, 2]);
	},
});

// ======== onChange Callbacks ========

Deno.test({
	name: "onChange fires once when added multiple times",
	fn() {
		let fireCount = 0;
		const cb = () => fireCount++;

		const vec = new Vec3();
		vec.onChange(cb);
		vec.onChange(cb);
		vec.set(1, 1, 1);

		assertEquals(fireCount, 1);
	},
});

Deno.test({
	name: "onChange doesn't fire when removed",
	fn() {
		let fireCount = 0;
		const cb = () => fireCount++;

		const vec = new Vec3();
		vec.onChange(cb);
		vec.removeOnChange(cb);
		vec.set(1, 1, 1);

		assertEquals(fireCount, 0);
	},
});

Deno.test({
	name: "onChange fires when x changes",
	fn() {
		let fireCount = 0;
		const cb = () => fireCount++;

		const vec = new Vec3();
		vec.onChange(cb);
		vec.x = 1;

		assertEquals(fireCount, 1);
	},
});

Deno.test({
	name: "onChange fires when y changes",
	fn() {
		let fireCount = 0;
		const cb = () => fireCount++;

		const vec = new Vec3();
		vec.onChange(cb);
		vec.y = 1;

		assertEquals(fireCount, 1);
	},
});

Deno.test({
	name: "onChange fires when z changes",
	fn() {
		let fireCount = 0;
		const cb = () => fireCount++;

		const vec = new Vec3();
		vec.onChange(cb);
		vec.z = 1;

		assertEquals(fireCount, 1);
	},
});

Deno.test({
	name: "onChange fires when set() is called",
	fn() {
		let fireCount = 0;
		const cb = () => fireCount++;

		const vec = new Vec3();
		vec.onChange(cb);
		vec.set(1, 1, 1);

		assertEquals(fireCount, 1);
	},
});

Deno.test({
	name: "onChange fires when multiply() is called",
	fn() {
		let fireCount = 0;
		const cb = () => fireCount++;

		const vec = new Vec3();
		vec.onChange(cb);
		vec.multiply(2, 2, 2);

		assertEquals(fireCount, 1);
	},
});

Deno.test({
	name: "onChange fires when multiplyScalar() is called",
	fn() {
		let fireCount = 0;
		const cb = () => fireCount++;

		const vec = new Vec3();
		vec.onChange(cb);
		vec.multiplyScalar(2);

		assertEquals(fireCount, 1);
	},
});

Deno.test({
	name: "onChange fires when multiplyVector() is called",
	fn() {
		let fireCount = 0;
		const cb = () => fireCount++;

		const vec = new Vec3();
		vec.onChange(cb);
		vec.multiplyVector(new Vec3(2, 2));

		assertEquals(fireCount, 1);
	},
});

Deno.test({
	name: "onChange fires when add() is called",
	fn() {
		let fireCount = 0;
		const cb = () => fireCount++;

		const vec = new Vec3();
		vec.onChange(cb);
		vec.add([2, 2, 2]);

		assertEquals(fireCount, 1);
	},
});

Deno.test({
	name: "onChange fires when addScalar() is called",
	fn() {
		let fireCount = 0;
		const cb = () => fireCount++;

		const vec = new Vec3();
		vec.onChange(cb);
		vec.addScalar(2);

		assertEquals(fireCount, 1);
	},
});

Deno.test({
	name: "onChange fires when addVector() is called",
	fn() {
		let fireCount = 0;
		const cb = () => fireCount++;

		const vec = new Vec3();
		vec.onChange(cb);
		vec.addVector(new Vec3(2, 2, 2));

		assertEquals(fireCount, 1);
	},
});

Deno.test({
	name: "onChange fires when sub() is called",
	fn() {
		let fireCount = 0;
		const cb = () => fireCount++;

		const vec = new Vec3();
		vec.onChange(cb);
		vec.sub([2, 2, 2]);

		assertEquals(fireCount, 1);
	},
});

Deno.test({
	name: "onChange fires when subScalar() is called",
	fn() {
		let fireCount = 0;
		const cb = () => fireCount++;

		const vec = new Vec3();
		vec.onChange(cb);
		vec.subScalar(2);

		assertEquals(fireCount, 1);
	},
});

Deno.test({
	name: "onChange fires when subVector() is called",
	fn() {
		let fireCount = 0;
		const cb = () => fireCount++;

		const vec = new Vec3();
		vec.onChange(cb);
		vec.subVector(new Vec3(2, 2, 2));

		assertEquals(fireCount, 1);
	},
});
