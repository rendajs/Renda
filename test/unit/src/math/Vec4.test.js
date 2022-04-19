import {assertEquals, assertNotStrictEquals} from "std/testing/asserts";
import {Mat4, Vec2, Vec3, Vec4} from "../../../../src/mod.js";
import {assertAlmostEquals, assertVecAlmostEquals} from "../../shared/asserts.js";

Deno.test({
	name: "Should be 0,0,0,1 by default",
	fn() {
		const vec = new Vec4();

		assertEquals(vec.toArray(), [0, 0, 0, 1]);
	},
});

Deno.test({
	name: "Create with Vec2",
	fn() {
		const vec2 = new Vec2([1, 2]);
		const vec = new Vec4(vec2);

		assertEquals(vec.toArray(), [1, 2, 0, 1]);
	},
});

Deno.test({
	name: "Create with Vec3",
	fn() {
		const vec3 = new Vec3([1, 2, 3]);
		const vec = new Vec4(vec3);

		assertEquals(vec.toArray(), [1, 2, 3, 1]);
	},
});

Deno.test({
	name: "Create with Vec4",
	fn() {
		const vec4 = new Vec4([1, 2, 3, 4]);
		const vec = new Vec4(vec4);

		assertEquals(vec.toArray(), [1, 2, 3, 4]);
	},
});

Deno.test({
	name: "Create with one number",
	fn() {
		const vec = new Vec4(1);

		assertEquals(vec.toArray(), [1, 0, 0, 1]);
	},
});

Deno.test({
	name: "Create with two numbers",
	fn() {
		const vec = new Vec4(1, 2);

		assertEquals(vec.toArray(), [1, 2, 0, 1]);
	},
});

Deno.test({
	name: "Create with three numbers",
	fn() {
		const vec = new Vec4(1, 2, 3);

		assertEquals(vec.toArray(), [1, 2, 3, 1]);
	},
});

Deno.test({
	name: "Create with four numbers",
	fn() {
		const vec = new Vec4(1, 2, 3, 4);

		assertEquals(vec.toArray(), [1, 2, 3, 4]);
	},
});

Deno.test({
	name: "Create with empty array",
	fn() {
		const vec = new Vec4([]);

		assertEquals(vec.toArray(), [0, 0, 0, 1]);
	},
});

Deno.test({
	name: "Create with array of one number",
	fn() {
		const vec = new Vec4([1]);

		assertEquals(vec.toArray(), [1, 0, 0, 1]);
	},
});

Deno.test({
	name: "Create with array of two numbers",
	fn() {
		const vec = new Vec4([1, 2]);

		assertEquals(vec.toArray(), [1, 2, 0, 1]);
	},
});

Deno.test({
	name: "Create with array of three number",
	fn() {
		const vec = new Vec4([1, 2, 3]);

		assertEquals(vec.toArray(), [1, 2, 3, 1]);
	},
});

Deno.test({
	name: "Create with array of three number",
	fn() {
		const vec = new Vec4([1, 2, 3, 4]);

		assertEquals(vec.toArray(), [1, 2, 3, 4]);
	},
});

Deno.test({
	name: "Set with Vec2",
	fn() {
		const vec2 = new Vec2([1, 2]);
		const vec = new Vec4();
		vec.set(vec2);

		assertEquals(vec.toArray(), [1, 2, 0, 1]);
	},
});

Deno.test({
	name: "Set with Vec3",
	fn() {
		const vec3 = new Vec3([1, 2, 3]);
		const vec = new Vec4();
		vec.set(vec3);

		assertEquals(vec.toArray(), [1, 2, 3, 1]);
	},
});

Deno.test({
	name: "Set with Vec4",
	fn() {
		const vec4 = new Vec4([1, 2, 3, 4]);
		const vec = new Vec4();
		vec.set(vec4);

		assertEquals(vec.toArray(), [1, 2, 3, 4]);
	},
});

Deno.test({
	name: "Set with two numbers",
	fn() {
		const vec = new Vec4();
		vec.set(1, 2);

		assertEquals(vec.toArray(), [1, 2, 0, 1]);
	},
});

Deno.test({
	name: "Set with empty array",
	fn() {
		const vec = new Vec4();
		vec.set([]);

		assertEquals(vec.toArray(), [0, 0, 0, 1]);
	},
});

Deno.test({
	name: "Set with array of one number",
	fn() {
		const vec = new Vec4();
		vec.set([1]);

		assertEquals(vec.toArray(), [1, 0, 0, 1]);
	},
});

Deno.test({
	name: "Set with array of two numbers",
	fn() {
		const vec = new Vec4();
		vec.set([1, 2]);

		assertEquals(vec.toArray(), [1, 2, 0, 1]);
	},
});

Deno.test({
	name: "Set with array of three numbers",
	fn() {
		const vec = new Vec4();
		vec.set([1, 2, 3]);

		assertEquals(vec.toArray(), [1, 2, 3, 1]);
	},
});

Deno.test({
	name: "Set with array of four numbers",
	fn() {
		const vec = new Vec4();
		vec.set([1, 2, 3, 4]);

		assertEquals(vec.toArray(), [1, 2, 3, 4]);
	},
});

Deno.test({
	name: "clone",
	fn() {
		const vec = new Vec4(1, 2, 3, 4);
		const vec2 = vec.clone();

		assertEquals(vec2.toArray(), [1, 2, 3, 4]);
		assertNotStrictEquals(vec, vec2);
	},
});

Deno.test({
	name: "toVec2()",
	fn() {
		const vec4 = new Vec4(1, 2, 3, 4);
		const vec2 = vec4.toVec2();

		assertVecAlmostEquals(vec2, [1, 2]);
	},
});

Deno.test({
	name: "toVec3()",
	fn() {
		const vec4 = new Vec4(1, 2, 3, 4);
		const vec3 = vec4.toVec3();

		assertVecAlmostEquals(vec3, [1, 2, 3]);
	},
});

Deno.test({
	name: "get magnitude",
	fn() {
		const tests = [
			{vec: [0, 0, 0, 0], expected: 0},
			{vec: [1, 0, 0, 0], expected: 1},
			{vec: [0, 5, 0, 0], expected: 5},
			{vec: [0, 0, -6, 0], expected: 6},
			{vec: [0, 0, -6, -5], expected: 7.81},
			{vec: [1, 2, 3, 4], expected: 5.48},
		];

		for (const {vec, expected} of tests) {
			const vec4 = new Vec4(vec);
			assertAlmostEquals(vec4.magnitude, expected, 0.1);
		}
	},
});

Deno.test({
	name: "set magnitude",
	fn() {
		const tests = [
			{vec: [0, 0, 0, 0], magnitude: 1, expected: [0, 0, 0, 0]},
			{vec: [1, 0, 0, 0], magnitude: 5, expected: [5, 0, 0, 0]},
			{vec: [0, 5, 0, 0], magnitude: 1, expected: [0, 1, 0, 0]},
			{vec: [1, 1, 1, 1], magnitude: 0, expected: [0, 0, 0, 0]},
			{vec: [5, 0, 0, 0], magnitude: 5, expected: [5, 0, 0, 0]},
			{vec: [1, 1, 1, 1], magnitude: 5, expected: [2.5, 2.5, 2.5, 2.5]},
			{vec: [1, 2, 3, 4], magnitude: 10, expected: [1.8, 3.7, 5.5, 7.3]},
		];

		for (const {vec, magnitude, expected} of tests) {
			const vec4 = new Vec4(vec);
			vec4.magnitude = magnitude;
			const vecArr = vec4.toArray();
			for (let i = 0; i < 4; i++) {
				assertAlmostEquals(vecArr[i], expected[i], 0.1);
			}
		}
	},
});

Deno.test({
	name: "normalize()",
	fn() {
		const tests = [
			{vec: [0, 0, 0, 0], expected: [0, 0, 0, 0]},
			{vec: [1, 0, 0, 0], expected: [1, 0, 0, 0]},
			{vec: [5, 0, 0, 0], expected: [1, 0, 0, 0]},
			{vec: [5, 5, 5, 5], expected: [0.5, 0.5, 0.5, 0.5]},
			{vec: [0, -5, 0, 0], expected: [0, -1, 0, 0]},
		];

		for (const {vec, expected} of tests) {
			const vec4 = new Vec4(vec);
			vec4.normalize();
			assertVecAlmostEquals(vec4, expected, 0.1);
		}
	},
});

Deno.test({
	name: "distanceTo()",
	fn() {
		const tests = [
			{a: [0, 0, 0, 0], b: [0, 0, 0, 0], expected: 0},
			{a: [1, 0, 0, 0], b: [0, 0, 0, 0], expected: 1},
			{a: [0, 5, 0, 0], b: [0, 0, 0, 0], expected: 5},
			{a: [-5, 0, 0, 0], b: [5, 0, 0, 0], expected: 10},
			{a: [1, 0, 2, 1], b: [0, -2, -1, 3], expected: 4.24},
		];

		for (const {a, b, expected} of tests) {
			const vec = new Vec4(a);
			const dist = vec.distanceTo(b);
			assertAlmostEquals(dist, expected, 0.1);
		}
	},
});

Deno.test({
	name: "multiply() with single number",
	fn() {
		const vec = new Vec4(2, 3, 4, 5);
		vec.multiply(2);

		assertEquals(vec.toArray(), [4, 6, 8, 10]);
	},
});

Deno.test({
	name: "multiply() with two numbers",
	fn() {
		const vec = new Vec4(2, 3, 4, 5);
		vec.multiply(4, 5);

		assertEquals(vec.toArray(), [8, 15, 0, 5]);
	},
});

Deno.test({
	name: "multiply() with three numbers",
	fn() {
		const vec = new Vec4(2, 3, 4, 5);
		vec.multiply(4, 5, 6);

		assertEquals(vec.toArray(), [8, 15, 24, 5]);
	},
});

Deno.test({
	name: "multiply() with four numbers",
	fn() {
		const vec = new Vec4(2, 3, 4, 5);
		vec.multiply(4, 5, 6, 7);

		assertEquals(vec.toArray(), [8, 15, 24, 35]);
	},
});

Deno.test({
	name: "multiply() with Vec2",
	fn() {
		const vec = new Vec4(2, 3, 4, 5);
		vec.multiply(new Vec2(4, 5));

		assertEquals(vec.toArray(), [8, 15, 0, 5]);
	},
});

Deno.test({
	name: "multiply() with Vec3",
	fn() {
		const vec = new Vec4(2, 3, 4, 5);
		vec.multiply(new Vec3(4, 5, 6));

		assertEquals(vec.toArray(), [8, 15, 24, 5]);
	},
});

Deno.test({
	name: "multiply() with Vec4",
	fn() {
		const vec = new Vec4(2, 3, 4, 5);
		vec.multiply(new Vec4(4, 5, 6, 7));

		assertEquals(vec.toArray(), [8, 15, 24, 35]);
	},
});

Deno.test({
	name: "multiply() with array",
	fn() {
		const vec = new Vec4(2, 3, 4, 5);
		vec.multiply([4, 5, 6, 7]);

		assertEquals(vec.toArray(), [8, 15, 24, 35]);
	},
});

Deno.test({
	name: "multiplyScalar()",
	fn() {
		const vec = new Vec4(2, 3, 4, 5);
		vec.multiplyScalar(2);

		assertEquals(vec.toArray(), [4, 6, 8, 10]);
	},
});

Deno.test({
	name: "multiplyVector()",
	fn() {
		const vec = new Vec4(2, 3, 4, 5);
		vec.multiplyVector(new Vec4(4, 5, 6, 7));

		assertEquals(vec.toArray(), [8, 15, 24, 35]);
	},
});

Deno.test({
	name: "add() with single number",
	fn() {
		const vec = new Vec4(2, 3, 4, 5);
		vec.add(2);

		assertEquals(vec.toArray(), [4, 5, 6, 7]);
	},
});

Deno.test({
	name: "add() with Vec2",
	fn() {
		const vec = new Vec4(2, 3, 4, 5);
		vec.add(new Vec2(4, 5));

		assertEquals(vec.toArray(), [6, 8, 4, 6]);
	},
});

Deno.test({
	name: "add() with Vec3",
	fn() {
		const vec = new Vec4(2, 3, 4, 5);
		vec.add(new Vec3(4, 5, 6));

		assertEquals(vec.toArray(), [6, 8, 10, 6]);
	},
});

Deno.test({
	name: "add() with Vec4",
	fn() {
		const vec = new Vec4(2, 3, 4, 5);
		vec.add(new Vec4(4, 5, 6, 7));

		assertEquals(vec.toArray(), [6, 8, 10, 12]);
	},
});

Deno.test({
	name: "add() with array",
	fn() {
		const vec = new Vec4(2, 3, 4, 5);
		vec.add([4, 5, 6, 7]);

		assertEquals(vec.toArray(), [6, 8, 10, 12]);
	},
});

Deno.test({
	name: "addScalar()",
	fn() {
		const vec = new Vec4(2, 3, 4, 5);
		vec.addScalar(2);

		assertEquals(vec.toArray(), [4, 5, 6, 7]);
	},
});

Deno.test({
	name: "addVector()",
	fn() {
		const vec = new Vec4(2, 3, 4, 5);
		vec.addVector(new Vec4(4, 5, 6, 7));

		assertEquals(vec.toArray(), [6, 8, 10, 12]);
	},
});

Deno.test({
	name: "sub() with single number",
	fn() {
		const vec = new Vec4(3, 4, 5, 6);
		vec.sub(2);

		assertEquals(vec.toArray(), [1, 2, 3, 4]);
	},
});

Deno.test({
	name: "sub() with Vec2",
	fn() {
		const vec = new Vec4(3, 4, 5, 6);
		vec.sub(new Vec2(1, 2));

		assertEquals(vec.toArray(), [2, 2, 5, 5]);
	},
});

Deno.test({
	name: "sub() with Vec3",
	fn() {
		const vec = new Vec4(3, 4, 5, 6);
		vec.sub(new Vec3(1, 2, 3));

		assertEquals(vec.toArray(), [2, 2, 2, 5]);
	},
});

Deno.test({
	name: "sub() with Vec4",
	fn() {
		const vec = new Vec4(3, 4, 5, 6);
		vec.sub(new Vec4(1, 2, 3, 4));

		assertEquals(vec.toArray(), [2, 2, 2, 2]);
	},
});

Deno.test({
	name: "sub() with array",
	fn() {
		const vec = new Vec4(2, 3, 4, 5);
		vec.sub([1, 2, 3, 4]);

		assertEquals(vec.toArray(), [1, 1, 1, 1]);
	},
});

Deno.test({
	name: "subScalar()",
	fn() {
		const vec = new Vec4(4, 5, 6, 7);
		vec.subScalar(2);

		assertEquals(vec.toArray(), [2, 3, 4, 5]);
	},
});

Deno.test({
	name: "subVector()",
	fn() {
		const vec = new Vec4(4, 5, 6, 7);
		vec.subVector(new Vec4(2, 3, 4, 5));

		assertEquals(vec.toArray(), [2, 2, 2, 2]);
	},
});

Deno.test({
	name: "dot()",
	fn() {
		const tests = [
			{a: [0, 0, 0, 0], b: [0, 0, 0, 0], result: 0},
			{a: [1, 2, 3, 4], b: [5, 6, 7, 8], result: 70},
			{a: [-5, 3, 2, 4], b: [8, 3, 5, 6], result: 3},
			{a: [1, 1, 1, 1], b: [1, 1, 1, 1], result: 4},
		];

		for (const {a, b, result} of tests) {
			const vec = new Vec4(a);
			const dot = vec.dot(b);

			assertEquals(dot, result, `${a} dot ${b} should be ${result} but was ${dot}`);
		}
	},
});

Deno.test({
	name: "projectOnVector()",
	fn() {
		const tests = [
			{a: [2, 2, 0, 0], b: [1, 0, 0, 0], result: [2, 0, 0, 0]},
			{a: [2, 2, 0, 0], b: [-1, 0, 0, 0], result: [2, 0, 0, 0]},
			{a: [-2, -2, 0, 0], b: [1, 0, 0, 0], result: [-2, 0, 0, 0]},
			{a: [0, 2, 0, 0], b: [2, 2, 0, 0], result: [1, 1, 0, 0]},
			{a: [0, 4, 0, 0], b: [2, 2, 0, 0], result: [2, 2, 0, 0]},
			{a: [0, 4, 0, 0], b: [4, 4, 4, 4], result: [1, 1, 1, 1]},
		];

		for (const {a, b, result} of tests) {
			const vec = new Vec4(a);
			vec.projectOnVector(b);

			const rounded = vec.toArray();
			for (let i = 0; i < rounded.length; i++) {
				rounded[i] = Math.round(rounded[i] * 100) / 100;
				// if the value is -0, convert it to 0
				if (rounded[i] == 0) rounded[i] = 0;
			}
			assertEquals(rounded, result, `${a} projected on ${b} should be ${result} but was ${rounded}`);
		}
	},
});

// ======== onChange Callbacks ========

Deno.test({
	name: "onChange fires once when added multiple times",
	fn() {
		let fireCount = 0;
		const cb = () => fireCount++;

		const vec = new Vec4();
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
		const vec = new Vec4();
		vec.onChange(cb);

		vec.removeOnChange(cb);
		vec.set(1, 1, 1, 1);

		assertEquals(fireCount, 0);
	},
});

Deno.test({
	name: "onChange fires when components are changed",
	fn() {
		/** @type {number[]} */
		const fireResults = [];
		/** @type {number[]} */
		const expectedResult = [];
		const vec = new Vec4();
		vec.onChange(component => {
			fireResults.push(component);
		});

		vec.x = 2;
		expectedResult.push(0x1000);

		vec.y = 3;
		expectedResult.push(0x0100);

		vec.z = 4;
		expectedResult.push(0x0010);

		vec.w = 5;
		expectedResult.push(0x0001);

		vec.set(1, 2, 3, 4);
		expectedResult.push(0x1111);

		vec.set(3, 4, 5, 6);
		expectedResult.push(0x1111);

		vec.set(3, 4, 6, 6);
		expectedResult.push(0x0010);

		vec.clone();
		// clone doesn't fire change event
		// We'll push -1 to both arrays in case this part and the previous
		// part of the test have a swapped result.
		fireResults.push(-1);
		expectedResult.push(-1);

		vec.multiply(1);
		// multiplying with 1 doesn't fire the callback
		fireResults.push(-1);
		expectedResult.push(-1);

		vec.magnitude = 2;
		expectedResult.push(0x1111);

		vec.set(1, 0, 0, 0);
		expectedResult.push(0x1111);

		vec.magnitude = 2;
		expectedResult.push(0x1000);

		vec.normalize();
		expectedResult.push(0x1000);

		vec.set(1, 2, 3, 4);
		vec.multiply(2);
		expectedResult.push(0x0111);
		expectedResult.push(0x1111);

		vec.multiply([1, 2, 1, 1]);
		expectedResult.push(0x0100);

		vec.multiplyScalar(2);
		expectedResult.push(0x1111);

		vec.multiplyVector(new Vec4(1, 2, 1, 1));
		expectedResult.push(0x0100);

		const mat = new Mat4();
		vec.multiply(mat);
		vec.multiplyMatrix(mat);
		// multiplying with identity matrix doesn't fire the callback
		fireResults.push(-1);
		expectedResult.push(-1);

		const mat2 = Mat4.createTranslation(1, 2, 3);
		vec.multiplyMatrix(mat2);
		expectedResult.push(0x1110);

		vec.divide(1);
		// divide by 1 doesn't fire the callback
		fireResults.push(-1);
		expectedResult.push(-1);

		vec.divide([1, 2, 1, 1]);
		expectedResult.push(0x0100);

		vec.divideScalar(2);
		expectedResult.push(0x1111);

		vec.add(new Vec2(1, 2));
		expectedResult.push(0x1101);

		vec.add([0, 0, 1]);
		expectedResult.push(0x0011);

		vec.addScalar(1);
		expectedResult.push(0x1111);

		vec.addVector(new Vec4(0, 0, 1, 0));
		expectedResult.push(0x0010);

		vec.sub(1);
		expectedResult.push(0x1111);

		vec.subScalar(1);
		expectedResult.push(0x1111);

		vec.subVector(new Vec4(0, 1, 0, 0));
		expectedResult.push(0x0100);

		// vec.cross(1, 2, 3, 4);
		// expectedResult.push(0x1111);

		vec.set(1, 2, 3, 4);
		vec.projectOnVector(4, 3, 2, 1);
		expectedResult.push(0x1111);
		expectedResult.push(0x1111);

		// vec.set(1, 2, 3);
		// vec.rejectFromVector(3, 2, 1);
		// expectedResult.push(0x1111);
		// expectedResult.push(0x1111);

		// Vec4.cross(vec, vec);
		// // static cross() shouldn't fire the callback
		// fireResults.push(-1);
		// expectedResult.push(-1);

		assertEquals(fireResults, expectedResult);
	},
});

