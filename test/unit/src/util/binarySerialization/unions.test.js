import {assertThrows} from "std/testing/asserts.ts";
import {StorageType, createObjectToBinaryOptions, createObjectToBinaryStructure, objectToBinary} from "../../../../../src/util/binarySerialization.js";
import {basicObjectToBinaryToObjectTest} from "./shared.js";

Deno.test({
	name: "Union type",
	fn() {
		const opts = createObjectToBinaryOptions({
			structure: [
				StorageType.UNION_ARRAY,
				{
					num1: StorageType.INT32,
					num2: StorageType.INT32,
				},
				{
					str1: StorageType.STRING,
					str2: StorageType.STRING,
				},
			],
			nameIds: {
				num1: 1,
				num2: 2,
				str1: 3,
				str2: 4,
			},
		});

		basicObjectToBinaryToObjectTest({
			num1: 1,
			num2: 2,
		}, opts);

		basicObjectToBinaryToObjectTest({
			str1: "str1",
			str2: "str2",
		}, opts);
	},
});

Deno.test({
	name: "Union type inside an object",
	fn() {
		const opts = createObjectToBinaryOptions({
			structure: {
				union: [
					StorageType.UNION_ARRAY,
					{
						num1: StorageType.INT32,
						num2: StorageType.INT32,
					},
					{
						str1: StorageType.STRING,
						str2: StorageType.STRING,
					},
				],
			},
			nameIds: {
				union: 1,
				type: 2,
				num1: 3,
				num2: 4,
				str1: 5,
				str2: 6,
			},
		});

		basicObjectToBinaryToObjectTest({
			union: {
				num1: 1,
				num2: 2,
			},
		}, opts);

		basicObjectToBinaryToObjectTest({
			union: {
				str1: "str1",
				str2: "str2",
			},
		}, opts);
	},
});

Deno.test({
	name: "Union that contains an array",
	fn() {
		const opts = createObjectToBinaryOptions({
			structure: [
				StorageType.UNION_ARRAY,
				{
					num: StorageType.INT32,
					numArr: [StorageType.INT32],
				},
				{
					str: StorageType.STRING,
					strArr: [StorageType.STRING],
				},
			],
			nameIds: {
				num: 1,
				numArr: 2,
				str: 3,
				strArr: 4,
			},
		});

		basicObjectToBinaryToObjectTest({
			num: 1,
			numArr: [2, 3, 4],
		}, opts);

		basicObjectToBinaryToObjectTest({
			str: "str1",
			strArr: ["str2", "str3", "str4"],
		}, opts);
	},
});

Deno.test({
	name: "Union without any matching union type",
	fn() {
		assertThrows(() => {
			objectToBinary(/** @type {any} */ ({
				num: 1,
				str: "str",
			}), {
				structure: [
					StorageType.UNION_ARRAY,
					{
						notNum: StorageType.INT32,
						notStr: StorageType.STRING,
					},
					{
						alsoNotNum: StorageType.INT32,
						alsoNotStr: StorageType.STRING,
					},
				],
				nameIds: {
					num: 1,
					str: 2,
					notNum: 3,
					notStr: 4,
					alsoNotNum: 5,
					alsoNotStr: 6,
				},
			});
		}, Error, "No structures matched the provided object, make sure your list of union structures contains exactly one structure that matches the provided object.");
	},
});

Deno.test({
	name: "Union with only partially matching union type",
	fn() {
		objectToBinary({
			num: 1,
			// str is purposefully omitted
		}, {
			structure: [
				StorageType.UNION_ARRAY,
				{
					num: StorageType.INT32,
					str: StorageType.STRING,
				},
				{
					anotherNum: StorageType.INT32,
					anotherStr: StorageType.STRING,
				},
			],
			nameIds: {
				num: 1,
				str: 2,
			},
		});
	},
});

Deno.test({
	name: "Union with too many matching union types",
	fn() {
		assertThrows(() => {
			objectToBinary({
				num: 1,
				str: "str",
			}, {
				structure: [
					StorageType.UNION_ARRAY,
					{
						num: StorageType.INT32,
						str: StorageType.STRING,
					},
					{
						num: StorageType.INT32,
						str: StorageType.STRING,
					},
				],
				nameIds: {
					num: 1,
					str: 2,
				},
			});
		}, Error, "Multiple structures matched the provided object, make sure your list of union structures contains at least some different properties so that the object can be matched to a single structure.");
	},
});

Deno.test({
	name: "Array of union objects",
	fn() {
		const opts = createObjectToBinaryOptions({
			structure: {
				arr: [
					[
						StorageType.UNION_ARRAY,
						{
							num: StorageType.INT32,
						},
						{
							str: StorageType.STRING,
						},
					],
				],
			},
			nameIds: {
				arr: 1,
				num: 2,
				str: 3,
			},
		});
		basicObjectToBinaryToObjectTest({
			arr: [
				{
					num: 1,
				},
				{
					str: "some string",
				},
				{
					num: 2,
				},
				{
					str: "another string",
				},
			],
		}, opts);
	},
});

Deno.test({
	name: "The same union type reference used twice",
	fn() {
		const unionStructure = createObjectToBinaryStructure([
			StorageType.UNION_ARRAY,
			{
				num: StorageType.INT32,
			},
			{
				str: StorageType.STRING,
			},
		]);

		const opts = createObjectToBinaryOptions({
			structure: {
				union1: unionStructure,
				union2: unionStructure,
			},
			nameIds: {
				union1: 1,
				union2: 2,
				num: 3,
				str: 4,
			},
		});

		basicObjectToBinaryToObjectTest({
			union1: {
				num: 1,
			},
			union2: {
				str: "str",
			},
		}, opts);
	},
});

Deno.test({
	name: "a string followed by a union",
	fn() {
		basicObjectToBinaryToObjectTest({
			str: "hello",
			union: {
				type1: true,
				value: "yes",
			},
		}, {
			structure: {
				str: StorageType.STRING,
				union: [
					StorageType.UNION_ARRAY,
					{
						type1: StorageType.BOOL,
						value: StorageType.STRING,
					},
					{
						type2: StorageType.BOOL,
						value: StorageType.INT32,
					},
				],
			},
			nameIds: {
				str: 1,
				union: 2,
				type1: 3,
				type2: 4,
				value: 5,
			},
		});
	},
});

Deno.test({
	name: "Union of primitive types",
	// TODO: #275
	ignore: true,
	fn() {
		const opts = createObjectToBinaryOptions({
			structure: {
				union: [
					StorageType.UNION_ARRAY,
					StorageType.INT32,
					StorageType.STRING,
				],
			},
			nameIds: {
				union: 1,
			},
		});

		basicObjectToBinaryToObjectTest({
			union: 1,
		}, opts);

		basicObjectToBinaryToObjectTest({
			union: "hello",
		}, opts);
	},
});

Deno.test({
	name: "Union of an object and null",
	ignore: true,
	fn() {
		const opts = createObjectToBinaryOptions({
			structure: {
				union: [
					StorageType.UNION_ARRAY,
					StorageType.NULL,
					{
						foo: StorageType.UINT8,
						bar: StorageType.UINT8,
					},
				],
			},
			nameIds: {
				union: 1,
				foo: 2,
				bar: 3,
			},
		});

		basicObjectToBinaryToObjectTest({
			union: null,
		}, opts);

		basicObjectToBinaryToObjectTest({
			union: {
				foo: 42,
				bar: 123,
			},
		}, opts);
	},
});
