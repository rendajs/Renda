import { assertEquals, assertNotStrictEquals } from "std/testing/asserts.ts";
import { Vec2, Vec3, Vec4 } from "../../../../src/mod.js";
import { assertAlmostEquals, assertVecAlmostEquals } from "../../../../src/util/asserts.js";

Deno.test({
	name: "Should be 0,0 by default",
	fn() {
		const vec = new Vec2();

		assertEquals(vec.toArray(), [0, 0]);
	},
});

Deno.test({
	name: "Create with Vec2",
	fn() {
		const vec2 = new Vec2([1, 2]);
		const vec = new Vec2(vec2);

		assertEquals(vec.toArray(), [1, 2]);
	},
});

Deno.test({
	name: "Create with Vec3",
	fn() {
		const vec3 = new Vec3([1, 2, 3]);
		const vec = new Vec2(vec3);

		assertEquals(vec.toArray(), [1, 2]);
	},
});

Deno.test({
	name: "Create with Vec4",
	fn() {
		const vec4 = new Vec4([1, 2, 3, 4]);
		const vec = new Vec2(vec4);

		assertEquals(vec.toArray(), [1, 2]);
	},
});

Deno.test({
	name: "Create with two numbers",
	fn() {
		const vec = new Vec2(1, 2);

		assertEquals(vec.toArray(), [1, 2]);
	},
});

Deno.test({
	name: "Create with array",
	fn() {
		const vec = new Vec2([1, 2]);

		assertEquals(vec.toArray(), [1, 2]);
	},
});

Deno.test({
	name: "Set with Vec2",
	fn() {
		const vec2 = new Vec2([1, 2]);
		const vec = new Vec2();
		vec.set(vec2);

		assertEquals(vec.toArray(), [1, 2]);
	},
});

Deno.test({
	name: "Set with Vec3",
	fn() {
		const vec3 = new Vec3([1, 2, 3]);
		const vec = new Vec2();
		vec.set(vec3);

		assertEquals(vec.toArray(), [1, 2]);
	},
});

Deno.test({
	name: "Set with Vec4",
	fn() {
		const vec4 = new Vec4([1, 2, 3, 4]);
		const vec = new Vec2();
		vec.set(vec4);

		assertEquals(vec.toArray(), [1, 2]);
	},
});

Deno.test({
	name: "Set with two numbers",
	fn() {
		const vec = new Vec2();
		vec.set(1, 2);

		assertEquals(vec.toArray(), [1, 2]);
	},
});

Deno.test({
	name: "Set with array",
	fn() {
		const vec = new Vec2();
		vec.set([1, 2]);

		assertEquals(vec.toArray(), [1, 2]);
	},
});

Deno.test({
	name: "clone",
	fn() {
		const vec = new Vec2(1, 2);
		const vec2 = vec.clone();

		assertEquals(vec2.toArray(), [1, 2]);
		assertNotStrictEquals(vec, vec2);
	},
});

Deno.test({
	name: "toVec3()",
	fn() {
		const vec2 = new Vec2(1, 2);
		const vec3 = vec2.toVec3();

		assertVecAlmostEquals(vec3, [1, 2, 0]);
	},
});

Deno.test({
	name: "toVec4()",
	fn() {
		const vec2 = new Vec2(1, 2);
		const vec4 = vec2.toVec4();

		assertVecAlmostEquals(vec4, [1, 2, 0, 1]);
	},
});

Deno.test({
	name: "toString()",
	fn() {
		const vec = new Vec2(1, 2);
		const result = vec.toString();

		assertEquals(result, "Vec2<1, 2>");
	},
});

Deno.test({
	name: "get magnitude",
	fn() {
		const tests = [
			{ vec: [0, 0], expected: 0 },
			{ vec: [1, 0], expected: 1 },
			{ vec: [0, 5], expected: 5 },
			{ vec: [0, -6], expected: 6 },
			{ vec: [1, 2], expected: 2.23 },
		];

		for (const { vec, expected } of tests) {
			const vec2 = new Vec2(vec);
			assertAlmostEquals(vec2.magnitude, expected, 0.1);
		}
	},
});

Deno.test({
	name: "set magnitude",
	fn() {
		const tests = [
			{ vec: [0, 0], magnitude: 1, expected: [0, 0] },
			{ vec: [1, 0], magnitude: 5, expected: [5, 0] },
			{ vec: [0, 5], magnitude: 1, expected: [0, 1] },
			{ vec: [1, 1], magnitude: 0, expected: [0, 0] },
			{ vec: [5, 0], magnitude: 5, expected: [5, 0] },
			{ vec: [1, 1], magnitude: 5, expected: [3.5, 3.5] },
			{ vec: [1, 2], magnitude: 10, expected: [4.5, 8.9] },
		];

		for (const { vec, magnitude, expected } of tests) {
			const vec2 = new Vec2(vec);
			vec2.magnitude = magnitude;
			const vecArr = vec2.toArray();
			for (let i = 0; i < 2; i++) {
				assertAlmostEquals(vecArr[i], expected[i], 0.1);
			}
		}
	},
});

Deno.test({
	name: "normalize()",
	fn() {
		const tests = [
			{ vec: [0, 0], expected: [0, 0] },
			{ vec: [1, 0], expected: [1, 0] },
			{ vec: [5, 0], expected: [1, 0] },
			{ vec: [5, 5], expected: [0.7, 0.7] },
			{ vec: [0, -5], expected: [0, -1] },
		];

		for (const { vec, expected } of tests) {
			const vec2 = new Vec2(vec);
			vec2.normalize();
			assertVecAlmostEquals(vec2, expected, 0.1);
		}
	},
});

Deno.test({
	name: "distanceTo()",
	fn() {
		const tests = [
			{ a: [0, 0], b: [0, 0], expected: 0 },
			{ a: [1, 0], b: [0, 0], expected: 1 },
			{ a: [0, 5], b: [0, 0], expected: 5 },
			{ a: [-5, 0], b: [5, 0], expected: 10 },
			{ a: [1, 0], b: [0, -2], expected: 2.23 },
		];

		for (const { a, b, expected } of tests) {
			const vec = new Vec2(a);
			const dist = vec.distanceTo(b);
			assertAlmostEquals(dist, expected, 0.1);
		}
	},
});

Deno.test({
	name: "multiply() with single number",
	fn() {
		const vec = new Vec2(2, 3);
		vec.multiply(2);

		assertEquals(vec.toArray(), [4, 6]);
	},
});

Deno.test({
	name: "multiply() with two numbers",
	fn() {
		const vec = new Vec2(2, 3);
		vec.multiply(4, 5);

		assertEquals(vec.toArray(), [8, 15]);
	},
});

Deno.test({
	name: "multiply() with Vec2",
	fn() {
		const vec = new Vec2(2, 3);
		vec.multiply(new Vec2(4, 5));

		assertEquals(vec.toArray(), [8, 15]);
	},
});

Deno.test({
	name: "multiply() with Vec3",
	fn() {
		const vec = new Vec2(2, 3);
		vec.multiply(new Vec3(4, 5, 6));

		assertEquals(vec.toArray(), [8, 15]);
	},
});

Deno.test({
	name: "multiply() with Vec4",
	fn() {
		const vec = new Vec2(2, 3);
		vec.multiply(new Vec4(4, 5, 6, 7));

		assertEquals(vec.toArray(), [8, 15]);
	},
});

Deno.test({
	name: "multiply() with array",
	fn() {
		const vec = new Vec2(2, 3);
		vec.multiply([4, 5]);

		assertEquals(vec.toArray(), [8, 15]);
	},
});

Deno.test({
	name: "multiplyScalar()",
	fn() {
		const vec = new Vec2(2, 3);
		vec.multiplyScalar(2);

		assertEquals(vec.toArray(), [4, 6]);
	},
});

Deno.test({
	name: "multiplyVector()",
	fn() {
		const vec = new Vec2(2, 3);
		vec.multiplyVector(new Vec2(4, 5));

		assertEquals(vec.toArray(), [8, 15]);
	},
});

Deno.test({
	name: "static multiply()",
	fn() {
		const result1 = Vec2.multiply([1, 2], [3, 4]);
		assertEquals(result1.toArray(), [3, 8]);
	},
});

Deno.test({
	name: "divide() with single number",
	fn() {
		const vec = new Vec2(2, 3);
		vec.divide(2);

		assertEquals(vec.toArray(), [1, 1.5]);
	},
});

Deno.test({
	name: "divide() with two numbers",
	fn() {
		const vec = new Vec2(2, 4);
		vec.divide(4, 2);

		assertEquals(vec.toArray(), [0.5, 2]);
	},
});

Deno.test({
	name: "divide() with three numbers",
	fn() {
		const vec = new Vec2(2, 4);
		vec.divide(4, 4);

		assertEquals(vec.toArray(), [0.5, 1]);
	},
});

Deno.test({
	name: "divide() with Vec2",
	fn() {
		const vec = new Vec2(8, 10);
		vec.divide(new Vec2(4, 2));

		assertEquals(vec.toArray(), [2, 5]);
	},
});

Deno.test({
	name: "divide() with Vec3",
	fn() {
		const vec = new Vec2(10, 16);
		vec.divide(new Vec3(5, 2, 3));

		assertEquals(vec.toArray(), [2, 8]);
	},
});

Deno.test({
	name: "divide() with Vec4",
	fn() {
		const vec = new Vec2(8, 2);
		vec.divide(new Vec4(4, 4, 3));

		assertEquals(vec.toArray(), [2, 0.5]);
	},
});

Deno.test({
	name: "divide() with array",
	fn() {
		const vec = new Vec2(27, 30);
		vec.divide([3, 2]);

		assertEquals(vec.toArray(), [9, 15]);
	},
});

Deno.test({
	name: "divideScalar()",
	fn() {
		const vec = new Vec2(2, 4);
		vec.divideScalar(2);

		assertEquals(vec.toArray(), [1, 2]);
	},
});

Deno.test({
	name: "divideVector()",
	fn() {
		const vec = new Vec2(10, 12);
		vec.divideVector(new Vec2(2, 6));

		assertEquals(vec.toArray(), [5, 2]);
	},
});

Deno.test({
	name: "static divide()",
	fn() {
		const result1 = Vec2.divide([4, 2], [2, 4]);
		assertEquals(result1.toArray(), [2, 0.5]);
	},
});

Deno.test({
	name: "add() with single number",
	fn() {
		const vec = new Vec2(2, 3);
		vec.add(2);

		assertEquals(vec.toArray(), [4, 5]);
	},
});

Deno.test({
	name: "add() with Vec2",
	fn() {
		const vec = new Vec2(2, 3);
		vec.add(new Vec2(4, 5));

		assertEquals(vec.toArray(), [6, 8]);
	},
});

Deno.test({
	name: "add() with Vec3",
	fn() {
		const vec = new Vec2(2, 3);
		vec.add(new Vec3(4, 5, 6));

		assertEquals(vec.toArray(), [6, 8]);
	},
});

Deno.test({
	name: "add() with Vec4",
	fn() {
		const vec = new Vec2(2, 3);
		vec.add(new Vec4(4, 5, 6, 7));

		assertEquals(vec.toArray(), [6, 8]);
	},
});

Deno.test({
	name: "add() with array",
	fn() {
		const vec = new Vec2(2, 3);
		vec.add([4, 5]);

		assertEquals(vec.toArray(), [6, 8]);
	},
});

Deno.test({
	name: "addScalar()",
	fn() {
		const vec = new Vec2(2, 3);
		vec.addScalar(2);

		assertEquals(vec.toArray(), [4, 5]);
	},
});

Deno.test({
	name: "addVector()",
	fn() {
		const vec = new Vec2(2, 3);
		vec.addVector(new Vec2(4, 5));

		assertEquals(vec.toArray(), [6, 8]);
	},
});

Deno.test({
	name: "static add()",
	fn() {
		const result1 = Vec2.add([1, 2], [3, 4]);
		assertEquals(result1.toArray(), [4, 6]);
	},
});

Deno.test({
	name: "sub() with single number",
	fn() {
		const vec = new Vec2(3, 4);
		vec.sub(2);

		assertEquals(vec.toArray(), [1, 2]);
	},
});

Deno.test({
	name: "sub() with Vec2",
	fn() {
		const vec = new Vec2(3, 4);
		vec.sub(new Vec2(1, 2));

		assertEquals(vec.toArray(), [2, 2]);
	},
});

Deno.test({
	name: "sub() with Vec3",
	fn() {
		const vec = new Vec2(3, 4);
		vec.sub(new Vec3(1, 2, 3));

		assertEquals(vec.toArray(), [2, 2]);
	},
});

Deno.test({
	name: "sub() with Vec4",
	fn() {
		const vec = new Vec2(3, 4);
		vec.sub(new Vec4(1, 2, 3, 4));

		assertEquals(vec.toArray(), [2, 2]);
	},
});

Deno.test({
	name: "sub() with array",
	fn() {
		const vec = new Vec2(2, 3);
		vec.sub([1, 2]);

		assertEquals(vec.toArray(), [1, 1]);
	},
});

Deno.test({
	name: "subScalar()",
	fn() {
		const vec = new Vec2(4, 5);
		vec.subScalar(2);

		assertEquals(vec.toArray(), [2, 3]);
	},
});

Deno.test({
	name: "subVector()",
	fn() {
		const vec = new Vec2(4, 5);
		vec.subVector(new Vec2(2, 3));

		assertEquals(vec.toArray(), [2, 2]);
	},
});

Deno.test({
	name: "static sub()",
	fn() {
		const result1 = Vec2.sub([1, 2], [3, 4]);
		assertEquals(result1.toArray(), [-2, -2]);
	},
});

Deno.test({
	name: "min()",
	fn() {
		const tests = [
			{ a: [1, 1], b: [1, 1], result: [1, 1] },
			{ a: [2, 2], b: [1, 1], result: [1, 1] },
			{ a: [1, 1], b: [2, 2], result: [1, 1] },
			{ a: [1, 5], b: [2, 1], result: [1, 1] },
		];

		for (const { a, b, result } of tests) {
			const vec = new Vec2(a);
			vec.min(b);

			assertVecAlmostEquals(vec, result);
		}
	},
});

Deno.test({
	name: "max()",
	fn() {
		const tests = [
			{ a: [1, 1], b: [1, 1], result: [1, 1] },
			{ a: [2, 2], b: [1, 1], result: [2, 2] },
			{ a: [1, 1], b: [2, 2], result: [2, 2] },
			{ a: [1, 5], b: [2, 1], result: [2, 5] },
		];

		for (const { a, b, result } of tests) {
			const vec = new Vec2(a);
			vec.max(b);

			assertVecAlmostEquals(vec, result);
		}
	},
});

Deno.test({
	name: "angleTo()",
	fn() {
		/** @type {[Vec2, Vec2, number][]} */
		const tests = [
			[new Vec2(1, 0), new Vec2(1, 0), 0],
			[new Vec2(1, 0), new Vec2(0, 1), Math.PI * 0.5],
			[new Vec2(0, 1), new Vec2(1, 0), Math.PI * 0.5],
			[new Vec2(0, 1), new Vec2(-1, 0), Math.PI * 0.5],
			[new Vec2(1, 0), new Vec2(-1, 0), Math.PI],
			[new Vec2(-1, 0), new Vec2(1, 0), Math.PI],
			[new Vec2(0, -1), new Vec2(0, 1), Math.PI],
			[new Vec2(123, 0), new Vec2(0, 456), Math.PI * 0.5],
			[new Vec2(10, 0), new Vec2(5, 5), Math.PI * 0.25],
			[new Vec2(0, 0), new Vec2(0, 0), 0],
			[new Vec2(0, 0), new Vec2(1, 0), 0],
			[new Vec2(123, 456), new Vec2(123, 456), 0],
			[new Vec2(0.08945095445971063, -0.08240613339399705), new Vec2(0.08945095445971063, -0.08240613339399705), 0],
		];

		for (const [a, b, expected] of tests) {
			const actual = a.angleTo(b);
			assertAlmostEquals(actual, expected, 0.00001, `${a} angleTo ${b} should be ${expected} but was ${actual}`);
		}
	},
});

Deno.test({
	name: "clockwiseAngleTo()",
	fn() {
		/** @type {[Vec2, Vec2, number][]} */
		const tests = [
			[new Vec2(1, 0), new Vec2(1, 0), 0],
			[new Vec2(1, 0), new Vec2(0, 1), Math.PI * 0.5],
			[new Vec2(0, 1), new Vec2(1, 0), Math.PI * -0.5],
			[new Vec2(0, 1), new Vec2(-1, 0), Math.PI * 0.5],
			[new Vec2(1, 0), new Vec2(-1, 0), Math.PI],
			[new Vec2(-1, 0), new Vec2(1, 0), Math.PI],
			[new Vec2(0, -1), new Vec2(0, 1), Math.PI],
			[new Vec2(0, 1), new Vec2(0, -1), Math.PI],
			[new Vec2(123, 0), new Vec2(0, 456), Math.PI * 0.5],
			[new Vec2(0, 123), new Vec2(456, 0), Math.PI * -0.5],
			[new Vec2(10, 0), new Vec2(5, 5), Math.PI * 0.25],
			[new Vec2(5, 5), new Vec2(10, 0), Math.PI * -0.25],
			[new Vec2(0, 0), new Vec2(0, 0), 0],
			[new Vec2(0, 0), new Vec2(1, 0), 0],
			[new Vec2(123, 456), new Vec2(123, 456), 0],
			[new Vec2(0.08945095445971063, -0.08240613339399705), new Vec2(0.08945095445971063, -0.08240613339399705), 0],
		];

		for (const [a, b, expected] of tests) {
			const actual = a.clockwiseAngleTo(b);
			assertAlmostEquals(actual, expected, 0.00001, `${a} clockwiseAngleTo ${b} should be ${expected} but was ${actual}`);
		}
	},
});

Deno.test({
	name: "dot()",
	fn() {
		const tests = [
			{ a: [0, 0], b: [0, 0], result: 0 },
			{ a: [1, 2], b: [4, 5], result: 14 },
			{ a: [-5, 3], b: [8, 3], result: -31 },
			{ a: [1, 1], b: [1, 1], result: 2 },
		];

		for (const { a, b, result } of tests) {
			const vec = new Vec2(a);
			const dot = vec.dot(b);

			assertEquals(dot, result, `${a} dot ${b} should be ${result} but was ${dot}`);
		}
	},
});

Deno.test({
	name: "cross()",
	fn() {
		const tests = [
			{ a: [4, 3], b: [1, 2], result: 5 },
			{ a: [1, 2], b: [4, 3], result: -5 },
			{ a: [1, 0], b: [0, 1], result: 1 },
			{ a: [0, 1], b: [0, 1], result: 0 },
			{ a: [0, 1], b: [0, -1], result: 0 },
			{ a: [0, 0], b: [123, 456], result: 0 },
		];

		for (const { a, b, result } of tests) {
			const vec = new Vec2(a);
			const cross = vec.cross(b);

			assertEquals(cross, result, `${a} cross ${b} should be ${result} but was ${cross}`);
		}
	},
});

Deno.test({
	name: "projectOnVector()",
	fn() {
		const tests = [
			{ a: [2, 2], b: [1, 0], result: [2, 0] },
			{ a: [2, 2], b: [-1, 0], result: [2, 0] },
			{ a: [-2, -2], b: [1, 0], result: [-2, 0] },
			{ a: [0, 2], b: [2, 2], result: [1, 1] },
			{ a: [0, 4], b: [2, 2], result: [2, 2] },
		];

		for (const { a, b, result } of tests) {
			const vec = new Vec2(a);
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

		const vec = new Vec2();
		vec.onChange(cb);
		vec.onChange(cb);
		vec.set(1, 1);

		assertEquals(fireCount, 1);
	},
});

Deno.test({
	name: "onChange doesn't fire when removed",
	fn() {
		let fireCount = 0;
		const cb = () => fireCount++;
		const vec = new Vec2();
		vec.onChange(cb);

		vec.removeOnChange(cb);
		vec.set(1, 1);

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
		const vec = new Vec2();
		vec.onChange((component) => {
			fireResults.push(component);
		});

		vec.x = 2;
		expectedResult.push(0x10);

		vec.y = 3;
		expectedResult.push(0x01);

		vec.set(1, 2);
		expectedResult.push(0x11);

		vec.set(3, 4);
		expectedResult.push(0x11);

		vec.set(3, 5);
		expectedResult.push(0x01);

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
		expectedResult.push(0x11);

		vec.set(1, 0);
		expectedResult.push(0x11);

		vec.magnitude = 2;
		expectedResult.push(0x10);

		vec.normalize();
		expectedResult.push(0x10);

		vec.set(1, 2);
		vec.multiply(2);
		expectedResult.push(0x01);
		expectedResult.push(0x11);

		vec.multiply([1, 2]);
		expectedResult.push(0x01);

		vec.multiplyScalar(2);
		expectedResult.push(0x11);

		vec.multiplyVector(new Vec2(1, 2));
		expectedResult.push(0x01);

		// const mat = new Mat4();
		// vec.multiply(mat);
		// vec.multiplyMatrix(mat);
		// // multiplying with identity matrix doesn't fire the callback
		// fireResults.push(-1);
		// expectedResult.push(-1);

		// const mat2 = Mat4.createTranslation(1, 2, 3);
		// vec.multiplyMatrix(mat2);
		// expectedResult.push(0x11);

		vec.divide(1);
		// divide by 1 doesn't fire the callback
		fireResults.push(-1);
		expectedResult.push(-1);

		vec.divide([1, 2, 1]);
		expectedResult.push(0x01);

		vec.divideScalar(2);
		expectedResult.push(0x11);

		vec.add(new Vec2(1, 0));
		expectedResult.push(0x10);

		vec.add([0, 1]);
		expectedResult.push(0x01);

		vec.addScalar(1);
		expectedResult.push(0x11);

		vec.addVector(new Vec2(0, 1));
		expectedResult.push(0x01);

		vec.sub(1);
		expectedResult.push(0x11);

		vec.subScalar(1);
		expectedResult.push(0x11);

		vec.subVector(new Vec2(0, 1));
		expectedResult.push(0x01);

		// vec.cross(1, 2, 3);
		// expectedResult.push(0x11);

		vec.set(1, 2);
		vec.projectOnVector(3, 2);
		expectedResult.push(0x11);
		expectedResult.push(0x11);

		// vec.set(1, 2);
		// vec.rejectFromVector(3, 2);
		// expectedResult.push(0x11);
		// expectedResult.push(0x11);

		Vec3.cross(vec, vec);
		// static cross() shouldn't fire the callback
		fireResults.push(-1);
		expectedResult.push(-1);

		assertEquals(fireResults, expectedResult);
	},
});
