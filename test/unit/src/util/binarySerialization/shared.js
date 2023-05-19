import {assertEquals} from "std/testing/asserts.ts";
import {binaryToObject, objectToBinary} from "../../../../../src/util/binarySerialization.js";

/**
 * @template {import("../../../../../src/util/binarySerializationTypes.ts").AllowedStructureFormat} T
 * @param {import("../../../../../src/util/binarySerializationTypes.ts").StructureToObject<T, true>} object
 * @param {import("../../../../../src/mod.js").ObjectToBinaryOptions<T>} options
 */
export function basicObjectToBinaryToObjectTest(object, options, {
	makeAssertion = true,
} = {}) {
	const buffer = objectToBinary(object, options);
	const object2 = binaryToObject(buffer, options);

	if (makeAssertion) assertEquals(object2, /** @type {unknown} */(object));

	return {
		result: object2,
	};
}
