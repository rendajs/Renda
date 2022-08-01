import {assertEquals, assertStrictEquals} from "std/testing/asserts.ts";
import {StorageType, createObjectToBinaryStructure} from "../../../../../src/util/binarySerialization.js";
import {basicObjectToBinaryToObjectTest} from "./shared.js";

Deno.test({
	name: "primitive types",
	fn() {
		basicObjectToBinaryToObjectTest({
			int8: -123,
			int16: -12345,
			int32: -123456789,
			uint8: 123,
			uint16: 12345,
			uint32: 123456789,
			float32: 123.45600128173828,
			float64: 123.456,
			string: "string",
			bool: true,
			uuid: "01234567-89ab-cdef-0123-456789abcdef",
			arrayBuffer: new ArrayBuffer(10),
		}, {
			nameIds: {
				int8: 1,
				int16: 2,
				int32: 3,
				uint8: 4,
				uint16: 5,
				uint32: 6,
				float32: 7,
				float64: 8,
				string: 11,
				bool: 12,
				uuid: 13,
				arrayBuffer: 15,
			},
			structure: {
				int8: StorageType.INT8,
				int16: StorageType.INT16,
				int32: StorageType.INT32,
				uint8: StorageType.UINT8,
				uint16: StorageType.UINT16,
				uint32: StorageType.UINT32,
				float32: StorageType.FLOAT32,
				float64: StorageType.FLOAT64,
				string: StorageType.STRING,
				bool: StorageType.BOOL,
				uuid: StorageType.UUID,
				arrayBuffer: StorageType.ARRAY_BUFFER,
			},
		});
	},
});

Deno.test({
	name: "object in an object",
	fn() {
		basicObjectToBinaryToObjectTest({
			obj1: {
				obj2: {
					num: 10,
				},
			},
		}, {
			nameIds: {
				obj1: 1,
				obj2: 2,
				num: 3,
			},
			structure: {
				obj1: {
					obj2: {
						num: StorageType.UINT8,
					},
				},
			},
		});
	},
});

Deno.test({
	name: "one enum",
	fn() {
		basicObjectToBinaryToObjectTest({
			enum1: "value2",
		}, {
			nameIds: {
				enum1: 1,
			},
			structure: {
				enum1: /** @type {const} */ (["value1", "value2", "value3", "value4"]),
			},
		});
	},
});

Deno.test({
	name: "multiple enums with the same array reference",
	fn() {
		const enums = /** @type {const} */ (["value1", "value2", "value3", "value4"]);
		basicObjectToBinaryToObjectTest({
			enum1: "value2",
			enum2: "value2",
			enum3: "value4",
		}, {
			nameIds: {
				enum1: 1,
				enum2: 2,
				enum3: 3,
			},
			structure: {
				enum1: enums,
				enum2: enums,
				enum3: enums,
			},
		});
	},
});

Deno.test({
	name: "little endian false",
	fn() {
		basicObjectToBinaryToObjectTest({
			int8: -123,
			int16: -12345,
			uint32: 123456789,
			float64: 123.456,
		}, {
			nameIds: {
				int8: 1,
				int16: 2,
				uint32: 3,
				float64: 4,
			},
			structure: {
				int8: StorageType.INT8,
				int16: StorageType.INT16,
				uint32: StorageType.UINT32,
				float64: StorageType.FLOAT64,
			},
			littleEndian: false,
		});
	},
});

Deno.test({
	name: "array of numbers",
	fn() {
		basicObjectToBinaryToObjectTest({
			array: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
		}, {
			nameIds: {
				array: 1,
			},
			structure: {
				array: [StorageType.UINT8],
			},
		});
	},
});

Deno.test({
	name: "array of strings",
	fn() {
		basicObjectToBinaryToObjectTest({
			array: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
		}, {
			nameIds: {
				array: 1,
			},
			structure: {
				array: [StorageType.STRING],
			},
		});
	},
});

Deno.test({
	name: "empty array",
	fn() {
		basicObjectToBinaryToObjectTest({
			array: [],
		}, {
			nameIds: {
				array: 1,
			},
			structure: {
				array: [StorageType.UINT8],
			},
		});
	},
});

Deno.test({
	name: "one empty array, one non empty array",
	fn() {
		// If all arrays are empty, the header bit containing the max variable
		// array length will be StorageType.NULL, so we add a second test case
		// for when this header bit is not null.
		basicObjectToBinaryToObjectTest({
			array1: [],
			array2: [1, 2, 3],
		}, {
			nameIds: {
				array1: 1,
				array2: 2,
			},
			structure: {
				array1: [StorageType.UINT8],
				array2: [StorageType.UINT8],
			},
		});
	},
});

Deno.test({
	name: "array of objects",
	fn() {
		basicObjectToBinaryToObjectTest({
			array: [
				{name: "obj1"},
				{name: "obj2"},
				{name: "obj3"},
			],
		}, {
			nameIds: {
				array: 1,
				name: 2,
			},
			structure: {
				array: [{name: StorageType.STRING}],
			},
		});
	},
});

Deno.test({
	name: "array of enums",
	fn() {
		const enums = ["value1", "value2", "value3", "value4"];
		basicObjectToBinaryToObjectTest({
			array: ["value2", "value2", "value4"],
		}, {
			nameIds: {
				array: 1,
			},
			structure: {
				array: [enums],
			},
		});
	},
});

Deno.test({
	name: "two objects that are the same reference",
	fn() {
		const theObject = {name: "obj"};
		const theStructure = {name: StorageType.STRING};
		const {result} = basicObjectToBinaryToObjectTest({
			obj1: theObject,
			obj2: theObject,
		}, {
			nameIds: {
				obj1: 1,
				obj2: 2,
				name: 3,
			},
			structure: {
				obj1: theStructure,
				obj2: theStructure,
			},
		});

		assertStrictEquals(result.obj1, result.obj2);
	},
});

Deno.test({
	name: "A reused reference and a non reused reference, but all structures are the same reference",
	fn() {
		const referenceStructure = createObjectToBinaryStructure({
			label: StorageType.STRING,
		});

		const referenceObject = {
			label: "reference",
		};

		basicObjectToBinaryToObjectTest({
			obj1: referenceObject,
			obj2: referenceObject,
			obj3: {
				label: "non reference",
			},
		}, {
			structure: {
				obj1: referenceStructure,
				obj2: referenceStructure,
				obj3: referenceStructure,
			},
			nameIds: {
				obj1: 1,
				obj2: 2,
				obj3: 3,
				label: 4,
			},
		});
	},
});

Deno.test({
	name: "A an array of reused references and some reused object references, the to be serialized data is all non reused references",
	fn() {
		const referenceStructure = createObjectToBinaryStructure({
			label: StorageType.STRING,
		});

		basicObjectToBinaryToObjectTest({
			obj1: {label: "object 1"},
			obj2: {label: "object 2"},
			arr: [
				{label: "object 3"},
				{label: "object 4"},
			],
		}, {
			structure: {
				obj1: referenceStructure,
				obj2: referenceStructure,
				arr: [referenceStructure],
			},
			nameIds: {
				obj1: 1,
				obj2: 2,
				arr: 3,
				label: 4,
			},
		});
	},
});

Deno.test({
	name: "infinite reference recursion",
	fn() {
		/**
		 * @typedef FooObject
		 * @property {string} name
		 * @property {BarObject} child
		 */

		/**
		 * @typedef BarObject
		 * @property {string} name
		 * @property {FooObject} child
		 */

		const foo = /** @type {FooObject} */ ({name: "foo"});
		/** @type {BarObject} */
		const bar = {name: "bar", child: foo};
		foo.child = bar;

		/**
		 * @typedef FooStructure
		 * @property {import("../../../../../src/util/binarySerialization.js").StorageTypeEnum["STRING"]} name
		 * @property {BarStructure} child
		 */

		/**
		 * @typedef BarStructure
		 * @property {import("../../../../../src/util/binarySerialization.js").StorageTypeEnum["STRING"]} name
		 * @property {FooStructure} child
		 */

		const structureFoo = /** @type {FooStructure} */ ({name: StorageType.STRING});
		const structureBar = {name: StorageType.STRING, child: structureFoo};
		structureFoo.child = structureBar;

		const {result} = basicObjectToBinaryToObjectTest(foo, {
			nameIds: {
				name: 1,
				child: 2,
			},
			structure: structureFoo,
		});

		assertStrictEquals(result.child.child.child.child, result);
		assertStrictEquals(result.child.child.child.child.child, result.child);
	},
});

Deno.test({
	name: "structure contains an array, but object contains null",
	fn() {
		const {result} = basicObjectToBinaryToObjectTest({
			array: /** @type {any} */ (null),
		}, {
			nameIds: {
				array: 1,
			},
			structure: {
				array: [StorageType.UINT8],
			},
		}, {
			makeAssertion: false,
		});

		assertEquals(result, {
			array: [],
		});
	},
});
