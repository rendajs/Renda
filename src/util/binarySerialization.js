import { clamp, isUuid } from "./util.js";

/** @typedef {Object<string, number>} BinarySerializationNameIds */

/**
 * @template {import("./binarySerializationTypes.ts").AllowedStructureFormat} T
 * @typedef {object} ObjectToBinaryOptions
 * @property {T} structure
 * @property {BinarySerializationNameIds} nameIds
 * @property {boolean} [littleEndian = true]
 * @property {boolean} [useHeaderByte = true]
 * @property {BinarySerializationVariableLengthStorageTypes?} [variableLengthStorageTypes = true]
 * @property {ObjectToBinaryTransformValueHook?} [transformValueHook = null]
 * @property {import("../../studio/src/assets/AssetManager.js").AssetManager?} [studioAssetManager = null]
 */

/**
 * @template {import("./binarySerializationTypes.ts").AllowedStructureFormat} T
 * @typedef {Omit<ObjectToBinaryOptions<T>,"transformValueHook"> & {transformValueHook?: BinaryToObjectTransformValueHook?}} BinaryToObjectOptions
 */

/**
 * @typedef {object} BinarySerializationVariableLengthStorageTypes
 * @property {AllStorageTypes} [refId = StorageType.NULL]
 * @property {AllStorageTypes} [array = StorageType.UINT8]
 * @property {AllStorageTypes} [string = StorageType.UINT16]
 * @property {AllStorageTypes} [arrayBuffer = StorageType.UINT16]
 */

/**
 * @typedef {object} BinaryToObjectTransformValueHookArgs
 * @property {unknown} value The value of the property before the transformation.
 * @property {StorageType} type The type of the property before the transformation.
 * @property {Object<string | number, unknown>} placedOnObject The object the property will be placed on, use this with `placedOnKey` if you want to place it yourself in a promise.
 * @property {string | number} placedOnKey The key of the property.
 */

/** @typedef {(opts: BinaryToObjectTransformValueHookArgs) => unknown?} BinaryToObjectTransformValueHook */

/**
 * @typedef {object} ObjectToBinaryTransformValueHookArgs
 * @property {unknown} value The value of the property before the transformation.
 * @property {StorageType} type The type of the property before the transformation.
 */

/** @typedef {(opts: ObjectToBinaryTransformValueHookArgs) => unknown} ObjectToBinaryTransformValueHook */

/**
 * @typedef {object} BinarySerializationBinaryDigestible
 * @property {*} value
 * @property {StorageType} type
 * @property {boolean} [variableArrayLength = false]
 */

/** @typedef {{id: number, type: StorageType}} TraversedLocationData */

/**
 * @typedef CollectedReferenceLink
 * @property {number} refId
 * @property {TraversedLocationData[]} location
 * @property {number} injectIntoRefId
 */

/**
 * @typedef StructureRefData
 * @property {import("./binarySerializationTypes.ts").AllowedStructureFormat} structureRef
 * @property {object | null} [reconstructedData]
 */

/** @typedef {Map<string, number>} NameIdsMap */

/**
 * @readonly
 * @enum {number}
 */
export const StorageType = /** @type {const} */ ({
	INT8: 1,
	INT16: 2,
	INT32: 3,
	UINT8: 4,
	UINT16: 5,
	UINT32: 6,
	FLOAT32: 7,
	FLOAT64: 8,
	ARRAY: 9,
	OBJECT: 10,
	STRING: 11,
	BOOL: 12,
	UUID: 13,
	ASSET_UUID: 14, // same as UUID but will load the asset when binaryToObjectWithAssetLoader() is used
	ARRAY_BUFFER: 15,
	NULL: 16,
	/**
	 * If the first item of a structure array contains this value, the object is expected to have
	 * the type of one of the items in the array.
	 */
	UNION_ARRAY: 17,
});

/**
 * Use this to access the const values of the `StorageType` enum from TypeScript.
 * @typedef {typeof StorageType} StorageTypeEnum
 */
/**
 * A union of all the possible storage types.
 * @typedef {StorageTypeEnum[keyof StorageTypeEnum]} AllStorageTypes
 */

/** @type {Required<BinarySerializationVariableLengthStorageTypes>} */
const defaultVariableLengthStorageTypes = {
	refId: StorageType.NULL,
	array: StorageType.UINT8,
	string: StorageType.UINT16,
	arrayBuffer: StorageType.UINT16,
};

const HeaderBits = {
	hasCustomVariableLengthStorageTypes: 0b00000001,
};

/**
 * @param {import("./util.js").UuidString?} uuidStr
 */
export function uuidToBinary(uuidStr) {
	const buffer = new ArrayBuffer(16);
	if (!uuidStr) return buffer;
	if (!isUuid(uuidStr)) {
		throw new Error(`Failed to serialize uuid, string is not a valid uuid: "${uuidStr}"`);
	}
	let i = 0; let j = 0;
	const view = new DataView(buffer);
	while (i < uuidStr.length) {
		if (uuidStr[i] == "-") i++;
		const hex = uuidStr.slice(i, i + 2);
		const int = parseInt(hex, 16);
		view.setUint8(j++, int);
		i += 2;
	}
	return buffer;
}

/**
 * Converts binary data to a uuid string. The provided buffer must be at least
 * 16 bytes long. If an offset is provided, the buffer must be at least
 * offset + 16 bytes long. Otherwise the function will throw.
 * @param {ArrayBufferLike & {buffer?: undefined}} buffer
 */
export function binaryToUuid(buffer, offset = 0) {
	offset = clamp(offset, 0, buffer.byteLength);
	const viewByteLength = clamp(buffer.byteLength - offset, 0, 16);
	const bufferView = new Uint8Array(buffer, offset, viewByteLength);
	if (bufferView.byteLength != 16) {
		throw new Error(`Failed to deserialize uuid, buffer is ${bufferView.byteLength} bytes long, uuid buffers need to be at least 16 bytes long.`);
	}
	let allZeros = true;
	let str = "";
	for (let i = 0; i < 16; i++) {
		const intValue = bufferView[i];
		if (intValue != 0) allZeros = false;
		str += intValue.toString(16).padStart(2, "0");
		if (i == 3 || i == 5 || i == 7 || i == 9) str += "-";
	}
	if (allZeros) return null;
	return /** @type {import("./util.js").UuidString} */ (str);
}

/**
 * Helper function to create an ObjectToBinaryOptions object.
 * In JavaScript, this simply returns the object you pass in.
 * But in TypeScript the returned type will be one that you can use for
 * {@linkcode objectToBinary} or {@linkcode binaryToObject}.
 * The benefit of this function is that you'll get autocomplete when composing
 * the options object, while still getting a meaningful return type.
 *
 * @template {import("./binarySerializationTypes.ts").AllowedStructureFormat} T
 * @param {ObjectToBinaryOptions<T>} options
 * @returns {ObjectToBinaryOptions<T>}
 */
export function createObjectToBinaryOptions(options) {
	return options;
}

/**
 * Helper function to create a AllowedStructureFormat object.
 * In JavaScript, this simply returns the object you pass in.
 * But in TypeScript the returned type will be one that you can use for
 * {@linkcode objectToBinary} or {@linkcode binaryToObject}.
 * The benefit of this function is that you'll get autocomplete when composing
 * the options object, while still getting a meaningful return type.
 * Creating a structure without this function would cause the type to be
 * simplified. For example [number, string] would become (number | string)[].
 * This type data is crucial for the binaryToObject return type to be inferred
 * correctly.
 * A workaround could be to cast your structure as `const`, but this would
 * cause some types to become readonly.
 *
 * @template {import("./binarySerializationTypes.ts").AllowedStructureFormat} T
 * @param {T} structure
 * @returns {T}
 */
export function createObjectToBinaryStructure(structure) {
	return structure;
}

/**
 * @template {import("./binarySerializationTypes.ts").AllowedStructureFormat} T
 * @param {ObjectToBinaryOptions<T>} options
 * @returns {(data: import("./binarySerializationTypes.ts").StructureToObject<T, true>) => ArrayBuffer}
 */
export function createBinarySerializer({
	structure,
	nameIds,
	littleEndian = true,
	useHeaderByte = true,
	variableLengthStorageTypes = null,
	transformValueHook = null,
	studioAssetManager = null,
}) {
	assertNonDuplicateNameIds(nameIds);
	const nameIdsMap = new Map(Object.entries(nameIds));

	const reoccurringStructureReferences = collectReoccurringReferences(structure, nameIdsMap, true);

	return (data) => {
		const castData = /** @type {object} */ (data);
		const reoccurringObjectReferences = collectReoccurringReferences(castData, nameIdsMap, false);

		/** @type {Map<object, import("./binarySerializationTypes.ts").AllowedStructureFormat>} */
		let referencesAndStructures;
		if (reoccurringObjectReferences.size > 0) {
			referencesAndStructures = getStoreAsReferenceItems(reoccurringObjectReferences, reoccurringStructureReferences, castData, structure, nameIdsMap);
		} else {
			// Normally getStoreAsReferenceItems will return all objects or structures that are referenced multiple times,
			// even if the object isn't referenced multiple times. However, if none of the objects are referenced,
			// there's no point in storing objects as reference id and everything can be inlined.
			// So we might as well set `referencesAndStructures` to a map with only the root, that
			// way we both skip some unnecessary cycles that would otherwise collect all referenced items,
			// and this is actually necessary to ensure none of the object references are stored as reference id later.
			referencesAndStructures = new Map();
			referencesAndStructures.set(castData, structure);
		}

		/** @type {Map<object, number>} */
		const referenceIds = new Map();
		const sortedReferences = [];
		for (const [ref, structure] of referencesAndStructures) {
			const id = sortedReferences.length;
			referenceIds.set(ref, id);
			sortedReferences.push({ ref, structure });
		}

		// Only if objects are referenced more than once, will we set the
		// refIdStorageType to something other than NULL.
		// That way the deserializer knows it can safely parse data as inline
		// rather than as ref id when the header bit is set to NULL.
		// We'll check the size of reoccurringObjectReferences rather than
		// length of sortedReferences, because the latter will include the root
		// object regardless of whether it is referenced more than once or not.
		/** @type {AllStorageTypes} */
		let refIdStorageType = StorageType.NULL;
		if (reoccurringObjectReferences.size > 0) {
			const highestReferenceId = sortedReferences.length;
			const { type } = requiredStorageTypeForUint(highestReferenceId);
			refIdStorageType = type;
		}

		/** @type {BinarySerializationBinaryDigestible[]} */
		const binaryDigestable = [];
		for (const { ref, structure } of sortedReferences) {
			const digestable = generateBinaryDigestable(ref, structure, { referenceIds, nameIdsMap, isInitialItem: true });
			binaryDigestable.push(digestable);
		}

		const biggestVariableArrayLength = findBiggestVariableArrayLength(binaryDigestable);
		const dataContainsVariableLengthArrays = biggestVariableArrayLength >= 0;
		const { type: arrayLengthStorageType } = requiredStorageTypeForUint(biggestVariableArrayLength);

		const biggestStringLength = 600; // todo
		const { type: stringLengthStorageType, bytes: stringLengthByteLength } = requiredStorageTypeForUint(biggestStringLength);

		const biggestArrayBufferLength = 600; // todo
		const { type: arrayBufferLengthStorageType, bytes: arrayBufferLengthByteLength } = requiredStorageTypeForUint(biggestArrayBufferLength);

		const flattened = Array.from(flattenBinaryDigestable(binaryDigestable, arrayLengthStorageType));
		// console.log(flattened);

		for (const item of flattened) {
			if (item.type == StorageType.OBJECT || item.type == StorageType.ARRAY) {
				item.type = refIdStorageType;
			}
		}

		const textEncoder = new TextEncoder();
		let totalByteLength = 0;
		let hasCustomVariableLengthStorageTypes = false;
		if (useHeaderByte) {
			totalByteLength++;
			variableLengthStorageTypes = {
				...defaultVariableLengthStorageTypes,
				...variableLengthStorageTypes,
			};
			hasCustomVariableLengthStorageTypes =
					refIdStorageType != variableLengthStorageTypes.refId ||
					(arrayLengthStorageType != variableLengthStorageTypes.array && dataContainsVariableLengthArrays) ||
					stringLengthStorageType != variableLengthStorageTypes.string ||
					arrayBufferLengthStorageType != variableLengthStorageTypes.arrayBuffer;

			if (hasCustomVariableLengthStorageTypes) totalByteLength++;
		}
		for (const item of flattened) {
			if (transformValueHook) {
				item.value = transformValueHook({ type: item.type, value: item.value });
			}
			const { length, value } = getStructureTypeLength(item.type, {
				value: item.value,
				textEncoder, stringLengthByteLength, arrayBufferLengthByteLength,
			});
			totalByteLength += length;
			if (value) item.value = value;
		}

		const buffer = new ArrayBuffer(totalByteLength);
		const dataView = new DataView(buffer);
		let byteOffset = 0;

		if (useHeaderByte) {
			let headerByte = 0;

			if (hasCustomVariableLengthStorageTypes) {
				headerByte |= HeaderBits.hasCustomVariableLengthStorageTypes;
			}

			byteOffset += setDataViewValue(dataView, headerByte, StorageType.UINT8, byteOffset, { littleEndian });

			if (hasCustomVariableLengthStorageTypes) {
				const refIdStorageTypeBits = variableLengthStorageTypeToBits(refIdStorageType);
				const arrayLengthStorageTypeBits = variableLengthStorageTypeToBits(arrayLengthStorageType);
				const stringLengthStorageTypeBits = variableLengthStorageTypeToBits(stringLengthStorageType);
				const arrayBufferLengthStorageTypeBits = variableLengthStorageTypeToBits(arrayBufferLengthStorageType);

				let customStorageTypesByte = 0;
				customStorageTypesByte |= refIdStorageTypeBits;
				customStorageTypesByte |= arrayLengthStorageTypeBits << 2;
				customStorageTypesByte |= stringLengthStorageTypeBits << 4;
				customStorageTypesByte |= arrayBufferLengthStorageTypeBits << 6;

				byteOffset += setDataViewValue(dataView, customStorageTypesByte, StorageType.UINT8, byteOffset, { littleEndian });
			}
		}

		for (const item of flattened) {
			const bytesMoved = setDataViewValue(dataView, item.value, item.type, byteOffset, { littleEndian, stringLengthStorageType, arrayBufferLengthStorageType, studioAssetManager });
			byteOffset += bytesMoved;
		}
		return buffer;
	};
}

/**
 * @template {import("./binarySerializationTypes.ts").AllowedStructureFormat} T
 * @param {BinaryToObjectOptions<T>} options
 * @returns {(buffer: ArrayBuffer) => import("./binarySerializationTypes.ts").StructureToObject<T>}
 */
export function createBinaryDeserializer({
	structure,
	nameIds,
	littleEndian = true,
	useHeaderByte = true,
	variableLengthStorageTypes = null,
	transformValueHook = null,
}) {
	assertNonDuplicateNameIds(nameIds);

	const nameIdsMap = new Map(Object.entries(nameIds));
	const nameIdsMapInverse = new Map(Object.entries(nameIds).map(([k, v]) => [v, k]));

	/** @type {Required<BinarySerializationVariableLengthStorageTypes>} */
	const useVariableLengthStorageTypes = {
		...defaultVariableLengthStorageTypes,
		...variableLengthStorageTypes,
	};

	const baseReoccurringStructureReferences = collectReoccurringReferences(structure, nameIdsMap, true);

	return (buffer) => {
		let refIdStorageType = useVariableLengthStorageTypes.refId;
		let arrayLengthStorageType = useVariableLengthStorageTypes.array;
		let stringLengthStorageType = useVariableLengthStorageTypes.string;
		let arrayBufferLengthStorageType = useVariableLengthStorageTypes.arrayBuffer;

		const dataView = new DataView(buffer);
		let byteOffset = 0;
		if (useHeaderByte) {
			const { value: headerByte, bytesMoved } = getDataViewValue(dataView, StorageType.UINT8, byteOffset, { littleEndian });
			byteOffset += bytesMoved;
			if (typeof headerByte != "number") throw new Error("Assertion failed, header byte is not a number.");

			const hasCustomVariableLengthStorageTypes = !!(headerByte & HeaderBits.hasCustomVariableLengthStorageTypes);

			if (hasCustomVariableLengthStorageTypes) {
				const { value: customStorageTypesByte, bytesMoved } = getDataViewValue(dataView, StorageType.UINT8, byteOffset, { littleEndian });
				if (typeof customStorageTypesByte != "number") throw new Error("Assertion failed, customStorageTypesByte is not a number.");
				byteOffset += bytesMoved;

				const refIdStorageTypeBits = (customStorageTypesByte) & 0b00000011;
				const arrayLengthStorageTypeBits = (customStorageTypesByte >> 2) & 0b00000011;
				const stringLengthStorageTypeBits = (customStorageTypesByte >> 4) & 0b00000011;
				const arrayBufferLengthStorageTypeBits = (customStorageTypesByte >> 6) & 0b00000011;

				refIdStorageType = variableLengthBitsToStorageType(refIdStorageTypeBits);
				arrayLengthStorageType = variableLengthBitsToStorageType(arrayLengthStorageTypeBits);
				stringLengthStorageType = variableLengthBitsToStorageType(stringLengthStorageTypeBits);
				arrayBufferLengthStorageType = variableLengthBitsToStorageType(arrayBufferLengthStorageTypeBits);
			}
		}

		/** @type {Set<import("./binarySerializationTypes.ts").AllowedStructureFormat>} */
		let reoccurringStructureReferences;
		if (refIdStorageType == StorageType.NULL) {
			// If the header bit indicated that there are no objects referenced multiple
			// times, we want to make sure the `reoccurringStructureReferences` is an empty map.
			// Otherwise `parseBinaryWithStructure` will assume that objects are a reference and parse
			// it as a reference id rather than an inline object.
			reoccurringStructureReferences = new Set();
		} else {
			reoccurringStructureReferences = baseReoccurringStructureReferences;
		}

		const textDecoder = new TextDecoder();
		/** @type {Map<number, StructureRefData>} */
		const structureDataById = new Map();
		structureDataById.set(0, { structureRef: structure });

		/** @type {CollectedReferenceLink[]} */
		const collectedReferenceLinks = [];

		const unparsedStructureIds = new Set([0]);
		let parsingStructureId = 0;
		while (unparsedStructureIds.size > 0) {
			const structureData = structureDataById.get(parsingStructureId);
			if (!structureData) {
				throw new Error(`Assertion failed, no structure data for id ${parsingStructureId}`);
			}
			const structureRef = structureData.structureRef;
			let reconstructedData = null;

			const { newByteOffset, newReconstructedData } = parseBinaryWithStructure(structureRef, [], reconstructedData, true, {
				reoccurringStructureReferences,
				nameIdsMap,
				dataView,
				byteOffset,
				littleEndian,
				textDecoder,
				nameIdsMapInverse,
				transformValueHook,
				collectedReferenceLinks,
				parsingStructureId,
				refIdStorageType,
				structureDataById,
				unparsedStructureIds,
				arrayLengthStorageType,
				stringLengthStorageType,
				arrayBufferLengthStorageType,
			});
			byteOffset = newByteOffset;
			reconstructedData = newReconstructedData;

			structureData.reconstructedData = reconstructedData;

			unparsedStructureIds.delete(parsingStructureId);
			parsingStructureId++;
		}

		for (const referenceLink of collectedReferenceLinks) {
			const { refId, location, injectIntoRefId } = referenceLink;
			const structureData = structureDataById.get(refId);
			if (!structureData) throw new Error(`Assertion failed, no structure data found for id ${refId}`);
			const value = structureData.reconstructedData;
			const injectIntoStructureData = structureDataById.get(injectIntoRefId);
			if (!injectIntoStructureData) throw new Error(`Assertion failed, no structure data found for id ${injectIntoRefId}`);
			let injectIntoRef = injectIntoStructureData.reconstructedData;
			injectIntoRef = resolveBinaryValueLocation(injectIntoRef || null, { nameIdsMapInverse, value, location });
			injectIntoStructureData.reconstructedData = injectIntoRef;
		}

		const structureData = structureDataById.get(0);
		if (!structureData) throw new Error("Assertion failed, no structure data found for id 0");
		if (!structureData.reconstructedData) throw new Error("Assertion failed, structure data for id 0 has no reconstructed data");
		return /** @type {any} */ (structureData.reconstructedData);
	};
}

/**
 * @deprecated Use {@linkcode createBinarySerializer}
 * @template {import("./binarySerializationTypes.ts").AllowedStructureFormat} T
 * @param {import("./binarySerializationTypes.ts").StructureToObject<T, true>} data
 * @param {ObjectToBinaryOptions<T>} options
 * @returns {ArrayBuffer}
 */
export function objectToBinary(data, options) {
	const serializer = createBinarySerializer(options);
	return serializer(data);
}

/**
 * @deprecated Use {@linkcode createBinaryDeserializer}
 * @template {import("./binarySerializationTypes.ts").AllowedStructureFormat} T
 * @param {ArrayBuffer} buffer
 * @param {BinaryToObjectOptions<T>} options
 * @returns {import("./binarySerializationTypes.ts").StructureToObject<T>}
 */
export function binaryToObject(buffer, options) {
	const deserializer = createBinaryDeserializer(options);
	return deserializer(buffer);
}

/**
 * Similar to binaryToObject() but replaces all uuids with assets.
 * @template {import("./binarySerializationTypes.ts").AllowedStructureFormat} T
 * @param {ArrayBuffer} buffer
 * @param {import("../assets/AssetLoader.js").AssetLoader} assetLoader
 * @param {BinaryToObjectOptions<T>} options
 */
export async function binaryToObjectWithAssetLoader(buffer, assetLoader, options) {
	const originalTransformValueHook = options.transformValueHook;

	/** @type {Promise<void>[]} */
	const promises = [];
	const obj = binaryToObject(buffer, {
		...options,
		transformValueHook: ({ value, type, placedOnObject, placedOnKey }) => {
			if (type != StorageType.ASSET_UUID || value == null) {
				if (originalTransformValueHook) {
					value = originalTransformValueHook({
						value, type, placedOnObject, placedOnKey,
					});
				}
				return value;
			}
			const castValue = /** @type {import("./util.js").UuidString} */ (value);
			const promise = (async () => {
				let asset = await assetLoader.getAsset(castValue);
				if (originalTransformValueHook) {
					asset = originalTransformValueHook({
						value: asset,
						type, placedOnObject, placedOnKey,
					});
				}
				placedOnObject[placedOnKey] = asset;
			})();
			promises.push(promise);
			return null;
		},
	});
	await Promise.all(promises);
	return /** @type {import("./binarySerializationTypes.ts").StructureToObjectWithAssetLoader<T>} */ (obj);
}

/**
 * Returns a Set of objects references that occur more than once in the data.
 * Only items that exist in the nameIdsMap will be parsed.
 * @template T
 * @param {T} data Either the data that needs to be converted or its structure.
 * @param {NameIdsMap} nameIdsMap
 * @param {boolean} isStructure Whether the first argument is the structure.
 */
function collectReoccurringReferences(data, nameIdsMap, isStructure) {
	/** @type {Set<T>} */
	const occurringReferences = new Set(); // references that have occured once
	/** @type {Set<T>} */
	const reoccurringReferences = new Set(); // references that have occured at least twice
	let prevReferences = [data];
	while (prevReferences.length > 0) {
		const newReferences = [];
		for (const ref of prevReferences) {
			if (typeof ref == "object" && ref != null) {
				if (occurringReferences.has(ref)) {
					reoccurringReferences.add(ref);
				} else {
					occurringReferences.add(ref);

					if (Array.isArray(ref)) {
						if (ref.length == 1 && isStructure) {
							// If the array structure only has one item, this array is expected
							// to have an arbitrary number of items, so it could have the same
							// reference in the data twice. Therefore we will assume arrays
							// with one item to always contain reoccurring references, even if
							// it occurs only once.
							newReferences.push(ref[0], ref[0]);
						} else {
							for (const item of ref) {
								newReferences.push(item);
							}
						}
					} else {
						for (const [key, val] of Object.entries(ref)) {
							if (nameIdsMap.has(key)) {
								newReferences.push(val);
							}
						}
					}
				}
			}
		}
		prevReferences = newReferences;
	}

	return reoccurringReferences;
}

/**
 * Recursively walks down the structure and object and collects all references if
 * they should be serialized as reference id rather than inline.
 * Objects that should be serialized as reference id are placed in the `options.collectedItems` map.
 * @param {object} options
 * @param {any} options.data The object that will be serialized.
 * @param {import("./binarySerializationTypes.ts").AllowedStructureFormat} options.structure
 * @param {NameIdsMap} options.nameIdsMap
 * @param {Map<object, import("./binarySerializationTypes.ts").AllowedStructureFormat>[]} options.existingItems
 * @param {Map<object, import("./binarySerializationTypes.ts").AllowedStructureFormat>} options.collectedItems
 * @param {Set<object>} options.forceUseAsObjectReferences If an object is in this set, it will always be collected.
 * @param {Set<import("./binarySerializationTypes.ts").AllowedStructureFormat>} options.forceUseAsStructureReferences If a structure is in this set,
 * it will always be collected, as well as its respective data object.
 * @param {boolean} [options.isInitialItem]
 */
function collectStoredAsReferenceItems({ data, structure, nameIdsMap, existingItems, collectedItems, forceUseAsObjectReferences, forceUseAsStructureReferences, isInitialItem = false }) {
	if (!isInitialItem) {
		for (const existingItemList of existingItems) {
			if (existingItemList.has(data)) return;
		}

		if (forceUseAsObjectReferences.has(data) || forceUseAsStructureReferences.has(structure)) {
			collectedItems.set(data, structure);
			return;
		}
	}

	if (typeof data == "object" && data != null) {
		if (Array.isArray(data)) {
			if (!(structure instanceof Array)) {
				throw new Error("The object provided contains an array where the structe does not.");
			}
			if (structure.length == 1) {
				const structureItem = structure[0];
				if (typeof structureItem == "string") {
					throw new Error("The structure contains an array of strings where the object does not have an enum as value.");
				}
				for (let i = 0; i < data.length; i++) {
					const item = data[i];
					collectStoredAsReferenceItems({
						data: item,
						structure: structureItem,
						nameIdsMap, existingItems, collectedItems, forceUseAsObjectReferences, forceUseAsStructureReferences,
					});
				}
			} else {
				for (let i = 0; i < data.length; i++) {
					const item = data[i];
					const structureItem = structure[i];
					if (typeof structureItem == "string") {
						throw new Error("The structure contains an array of strings where the object does not have an enum as value.");
					}
					collectStoredAsReferenceItems({
						data: item,
						structure: structureItem,
						nameIdsMap, existingItems, collectedItems, forceUseAsObjectReferences, forceUseAsStructureReferences,
					});
				}
			}
		} else if (Array.isArray(structure) && structure[0] == StorageType.UNION_ARRAY) {
			const [, ...possibleStructures] = structure;
			const matchingStructure = getUnionMatch(data, possibleStructures);
			collectStoredAsReferenceItems({
				data,
				structure: matchingStructure,
				nameIdsMap, collectedItems, existingItems, forceUseAsObjectReferences, forceUseAsStructureReferences,
			});
		} else {
			for (const [key, val] of Object.entries(data)) {
				if (nameIdsMap.has(key)) {
					const castStructure = /** @type {Object<string, import("./binarySerializationTypes.ts").AllowedStructureFormat>} */ (structure);
					const structureItem = castStructure[key];
					collectStoredAsReferenceItems({
						data: val,
						structure: structureItem,
						nameIdsMap, collectedItems, existingItems, forceUseAsObjectReferences, forceUseAsStructureReferences,
					});
				}
			}
		}
	}
}

/**
 * Maps reoccurring references from the to be serialized object to a map with the
 * object references as keys and their respective structure references as value.
 * The result always contains the root object and structure. Even if they are used
 * only once.
 * @param {Set<object>} reoccurringDataReferences A set of objects that occur more than once in the data.
 * @param {Set<import("./binarySerializationTypes.ts").AllowedStructureFormat>} reoccuringStructureReferences A set of objects that occur more than once in the structure.
 * @param {object} data The object that needs to be converted to binary.
 * @param {import("./binarySerializationTypes.ts").AllowedStructureFormat} structure
 * @param {NameIdsMap} nameIdsMap
 */
function getStoreAsReferenceItems(reoccurringDataReferences, reoccuringStructureReferences, data, structure, nameIdsMap) {
	/** @type {Map<object, import("./binarySerializationTypes.ts").AllowedStructureFormat>} */
	const unparsedReferences = new Map();
	unparsedReferences.set(data, structure);

	/** @type {Map<object, import("./binarySerializationTypes.ts").AllowedStructureFormat>} */
	const parsedReferences = new Map();

	while (unparsedReferences.size > 0) {
		const [ref, structureRef] = unparsedReferences.entries().next().value;

		/** @type {Map<object, import("./binarySerializationTypes.ts").AllowedStructureFormat>} */
		const collectedItems = new Map();
		collectStoredAsReferenceItems({
			data: ref,
			structure: structureRef,
			nameIdsMap, collectedItems,
			existingItems: [parsedReferences, unparsedReferences],
			forceUseAsObjectReferences: reoccurringDataReferences,
			forceUseAsStructureReferences: reoccuringStructureReferences,
			isInitialItem: true,
		});

		for (const [item, structureItem] of collectedItems) {
			unparsedReferences.set(item, structureItem);
		}
		parsedReferences.set(ref, structureRef);
		unparsedReferences.delete(ref);
	}
	return parsedReferences;
}

/**
 * Takes an integer and finds the required storage type that would be needed
 * to fit this value.
 * @param {number} int
 */
function requiredStorageTypeForUint(int) {
	const minBytes = Math.ceil(Math.log2(int + 1) / 8);
	let bytes = 0;
	/** @type {StorageTypeEnum["NULL"] | StorageTypeEnum["UINT8"] | StorageTypeEnum["UINT16"] | StorageTypeEnum["UINT32"]} */
	let type = StorageType.NULL;
	if (minBytes == 1) {
		type = StorageType.UINT8;
		bytes = 1;
	} else if (minBytes == 2) {
		type = StorageType.UINT16;
		bytes = 2;
	} else if (minBytes > 2) {
		type = StorageType.UINT32;
		bytes = 4;
	}
	return { type, bytes };
}

/**
 * @param {StorageType} storageType
 */
function variableLengthStorageTypeToBits(storageType) {
	switch (storageType) {
		case StorageType.NULL:
			return 0b00;
		case StorageType.UINT8:
			return 0b01;
		case StorageType.UINT16:
			return 0b10;
		case StorageType.UINT32:
			return 0b11;
		default:
			throw new Error(`Unknown storage type: ${storageType}`);
	}
}

/**
 * @param {number} bits
 */
function variableLengthBitsToStorageType(bits) {
	switch (bits) {
		case 0b00:
			return StorageType.NULL;
		case 0b01:
			return StorageType.UINT8;
		case 0b10:
			return StorageType.UINT16;
		case 0b11:
			return StorageType.UINT32;
		default:
			throw new Error(`Unknown storage type bits: ${bits}`);
	}
}

/**
 * Converts a structure to a storage type. This is used for sorting keys in an object.
 * Keys are sorted by their storage type first, and then by their name id.
 * @param {import("./binarySerializationTypes.ts").AllowedStructureFormat} structure
 * @returns {AllStorageTypes}
 */
function structureToStorageType(structure) {
	if (structure == null) {
		return StorageType.NULL;
	}
	if (typeof structure == "object" && structure != null) {
		if (Array.isArray(structure)) {
			if (structure[0] == StorageType.UNION_ARRAY) {
				return StorageType.UNION_ARRAY;
			} else {
				return StorageType.ARRAY;
			}
		} else {
			return StorageType.OBJECT;
		}
	}
	return structure;
}

/**
 * @param {object} obj The object that needs be converted to binary.
 * @param {import("./binarySerializationTypes.ts").AllowedStructureFormat} structure The structure that belongs to this object.
 * @param {object} opts
 * @param {Map<*,number>} opts.referenceIds A mapping of objects and an id that they will be using in the binary representation.
 * @param {Map<string,number>} opts.nameIdsMap
 * @param {boolean} [opts.isInitialItem] Whether this is the root item of the object.
 * @returns {BinarySerializationBinaryDigestible}
 */
function generateBinaryDigestable(obj, structure, { referenceIds, nameIdsMap, isInitialItem = false }) {
	if (typeof structure == "object" && structure != null) {
		if (!obj) {
			if (Array.isArray(structure)) {
				obj = [];
			} else {
				obj = {};
			}
		}
		if (!isInitialItem && referenceIds.has(obj)) {
			const refId = referenceIds.get(obj);
			const type = structureToStorageType(structure);
			return { value: refId, type };
		}

		if (Array.isArray(structure)) {
			if (typeof structure[0] == "string") {
				// structure is an array of strings, treat it as an enum
				const castStructure1 = /** @type {unknown} */ (structure);
				const castStructure2 = /** @type {string[]} */ (castStructure1);
				if (typeof obj != "string") {
					throw new Error("Tried to serialize an enum, but the provided object is not a string");
				}
				const value = castStructure2.indexOf(obj) + 1; // use 0 if the enum value is invalid
				const { type } = requiredStorageTypeForUint(castStructure2.length);
				return { value, type };
			} else if (structure[0] == StorageType.UNION_ARRAY) {
				const [, ...possibleStructures] = structure;
				const matchingStructure = getUnionMatch(obj, possibleStructures);
				const unionMatchIndex = possibleStructures.indexOf(matchingStructure);
				const type = requiredStorageTypeForUint(structure.length).type;
				return {
					value: [
						{ value: unionMatchIndex, type }, // union type
						generateBinaryDigestable(obj, structure[unionMatchIndex + 1], { referenceIds, nameIdsMap, isInitialItem }), // union value
					],
					type: StorageType.UNION_ARRAY,
				};
			} else {
				const arr = [];
				const variableArrayLength = structure.length == 1;
				if (!Array.isArray(obj)) {
					throw new Error("The provided structure contains an array but the object is not an array");
				}
				for (let i = 0; i < obj.length; i++) {
					const structureIndex = variableArrayLength ? 0 : i;
					arr.push(generateBinaryDigestable(obj[i], structure[structureIndex], { referenceIds, nameIdsMap }));
				}
				return { value: arr, type: StorageType.ARRAY, variableArrayLength };
			}
		} else {
			const arr = [];
			const castObj = /** @type {Object<string, Object>} */ (obj);
			const castStructure = /** @type {Object<string, import("./binarySerializationTypes.ts").AllowedStructureFormat>} */ (structure);
			for (const key of Object.keys(structure)) {
				if (nameIdsMap.has(key)) {
					const val = castObj[key];
					arr.push({
						...generateBinaryDigestable(val, castStructure[key], { referenceIds, nameIdsMap }),
						nameId: /** @type {number} */ (nameIdsMap.get(key)),
					});
				}
			}
			sortNameIdsArr(arr);
			return { value: arr, type: StorageType.OBJECT };
		}
	} else {
		const castStructure = /** @type {StorageType} */ (structure);
		return { value: obj, type: castStructure };
	}
}

/**
 * @param {{type: number, nameId: number}[]} arr
 */
function sortNameIdsArr(arr) {
	arr.sort((a, b) => {
		if (a.type != b.type) {
			return a.type - b.type;
		}
		return a.nameId - b.nameId;
	});
}

/**
 * @param {BinarySerializationNameIds} nameIds
 */
function assertNonDuplicateNameIds(nameIds) {
	/** @type {Set<number>} */
	const foundIds = new Set();
	/** @type {Set<number>} */
	const duplicateIds = new Set();
	for (const id of Object.values(nameIds)) {
		if (foundIds.has(id)) {
			duplicateIds.add(id);
		} else {
			foundIds.add(id);
		}
	}
	if (duplicateIds.size > 0) {
		/** @type {Set<string>} */
		const duplicateNames = new Set();
		for (const [name, id] of Object.entries(nameIds)) {
			if (duplicateIds.has(id)) {
				duplicateNames.add(`"${name}"`);
			}
		}
		const duplicates = Array.from(duplicateNames).join(", ");
		throw new Error(`The name ids object contains duplicate ids: ${duplicates}`);
	}
}

/**
 * Matches `object` against all the structures in `possibleStructures` and returns
 * the structe that most closely matches the properties of the object.
 * The index of the returned structure can be included in the serialized binary data,
 * so that the correct structure can be used to deserialize the object.
 *
 * It's important to note that it is possible for the to be serialized object
 * only partially matches one of the union types. Because in such a case all the
 * omitted properties will be filled in with default values. If no exact match
 * is found, the structure that most closely matches the object will be returned.
 *
 * For now only top level properties are looked at for matching, and only their
 * presence is checked. In the future we might also check for the types of these
 * properties.
 * Support could also be added for checking if one of the structures contains a
 * property that is of type string, rather than a `StorageType`, and if the object
 * has the same property and string value, we could match that structure.
 *
 * If no structures can be matched, an error will be thrown.
 * @param {object} object
 * @param {import("./binarySerializationTypes.ts").AllowedStructureFormat[]} possibleStructures
 */
function getUnionMatch(object, possibleStructures) {
	const keys = new Set(Object.keys(object));
	/** @type {Map<import("./binarySerializationTypes.ts").AllowedStructureFormat, number>} */
	const structureScores = new Map();
	for (const structure of possibleStructures) {
		const structeKeys = new Set(Object.keys(structure));
		let score = 0;
		for (const key of structeKeys) {
			if (keys.has(key)) {
				score++;
			}
		}
		structureScores.set(structure, score);
	}
	const highestScore = Math.max(...structureScores.values());
	/** @type {import("./binarySerializationTypes.ts").AllowedStructureFormat[]} */
	const matchingStructures = [];
	for (const [structure, score] of structureScores) {
		if (score > 0 && score == highestScore) {
			matchingStructures.push(structure);
		}
	}
	if (matchingStructures.length == 0) {
		throw new Error("No structures matched the provided object, make sure your list of union structures contains exactly one structure that matches the provided object.");
	} else if (matchingStructures.length > 1) {
		throw new Error("Multiple structures matched the provided object, make sure your list of union structures contains at least some different properties so that the object can be matched to a single structure.");
	}
	return matchingStructures[0];
}

/**
 * @param {BinarySerializationBinaryDigestible[]} binaryDigestableArray
 * @returns {number}
 */
function findBiggestVariableArrayLength(binaryDigestableArray) {
	let foundHighest = -1;
	for (const item of binaryDigestableArray) {
		if (item.type == StorageType.ARRAY && item.variableArrayLength) {
			foundHighest = Math.max(foundHighest, item.value.length);
		}
		if (Array.isArray(item.value)) {
			const highest = findBiggestVariableArrayLength(item.value);
			foundHighest = Math.max(foundHighest, highest);
		}
	}
	return foundHighest;
}

/**
 * @param {BinarySerializationBinaryDigestible[]} binaryDigestableArray
 * @param {StorageType} arrayLengthStorageType
 * @returns {Generator<BinarySerializationBinaryDigestible>}
 */
function *flattenBinaryDigestable(binaryDigestableArray, arrayLengthStorageType) {
	for (const item of binaryDigestableArray) {
		if (Array.isArray(item.value)) {
			if (item.variableArrayLength) {
				yield { value: item.value.length, type: arrayLengthStorageType };
			}
			for (const item2 of flattenBinaryDigestable(item.value, arrayLengthStorageType)) {
				yield item2;
			}
		} else {
			yield item;
		}
	}
}

/**
 * @private
 * @param {StorageType} type
 * @param {object} options
 * @param {unknown} options.value
 * @param {TextEncoder} options.textEncoder
 * @param {number} options.stringLengthByteLength
 * @param {number} options.arrayBufferLengthByteLength
 */
function getStructureTypeLength(type, {
	value,
	textEncoder,
	stringLengthByteLength,
	arrayBufferLengthByteLength,
}) {
	if (type == StorageType.INT8) {
		return { length: 1 };
	} else if (type == StorageType.INT16) {
		return { length: 2 };
	} else if (type == StorageType.INT32) {
		return { length: 4 };
	} else if (type == StorageType.UINT8) {
		return { length: 1 };
	} else if (type == StorageType.UINT16) {
		return { length: 2 };
	} else if (type == StorageType.UINT32) {
		return { length: 4 };
	} else if (type == StorageType.FLOAT32) {
		return { length: 4 };
	} else if (type == StorageType.FLOAT64) {
		return { length: 8 };
	} else if (type == StorageType.STRING) {
		const castValue = /** @type {import("./binarySerializationTypes.ts").StructureItemToObject<typeof type>} */ (value);
		const encoded = textEncoder.encode(castValue);
		return { length: encoded.byteLength + stringLengthByteLength, value: encoded };
	} else if (type == StorageType.BOOL) {
		return { length: 1 };
	} else if (type == StorageType.UUID || type == StorageType.ASSET_UUID) {
		return { length: 16 };
	} else if (type == StorageType.ARRAY_BUFFER) {
		const castValue = /** @type {import("./binarySerializationTypes.ts").StructureItemToObject<typeof type>} */ (value);
		return { length: castValue.byteLength + arrayBufferLengthByteLength };
	} else if (type == StorageType.NULL) {
		return { length: 0 };
	}
	return { length: 0 };
}

/**
 * @private
 * @param {DataView} dataView
 * @param {unknown} value
 * @param {StorageType} type
 * @param {number} [byteOffset]
 * @param {object} options
 * @param {boolean} [options.littleEndian]
 * @param {StorageType} [options.stringLengthStorageType]
 * @param {StorageType} [options.arrayBufferLengthStorageType]
 * @param {import("../../studio/src/assets/AssetManager.js").AssetManager?} [options.studioAssetManager]
 */
function setDataViewValue(dataView, value, type, byteOffset = 0, {
	littleEndian = true,
	stringLengthStorageType = StorageType.UINT8,
	arrayBufferLengthStorageType = StorageType.UINT8,
	studioAssetManager = null,
} = {}) {
	let bytesMoved = 0;
	if (type == StorageType.INT8) {
		const castValue = /** @type {import("./binarySerializationTypes.ts").StructureItemToObject<typeof type>} */ (value);
		dataView.setInt8(byteOffset, castValue);
		bytesMoved = 1;
	} else if (type == StorageType.INT16) {
		const castValue = /** @type {import("./binarySerializationTypes.ts").StructureItemToObject<typeof type>} */ (value);
		dataView.setInt16(byteOffset, castValue, littleEndian);
		bytesMoved = 2;
	} else if (type == StorageType.INT32) {
		const castValue = /** @type {import("./binarySerializationTypes.ts").StructureItemToObject<typeof type>} */ (value);
		dataView.setInt32(byteOffset, castValue, littleEndian);
		bytesMoved = 4;
	} else if (type == StorageType.UINT8) {
		const castValue = /** @type {import("./binarySerializationTypes.ts").StructureItemToObject<typeof type>} */ (value);
		dataView.setUint8(byteOffset, castValue);
		bytesMoved = 1;
	} else if (type == StorageType.UINT16) {
		const castValue = /** @type {import("./binarySerializationTypes.ts").StructureItemToObject<typeof type>} */ (value);
		dataView.setUint16(byteOffset, castValue, littleEndian);
		bytesMoved = 2;
	} else if (type == StorageType.UINT32) {
		const castValue = /** @type {import("./binarySerializationTypes.ts").StructureItemToObject<typeof type>} */ (value);
		dataView.setUint32(byteOffset, castValue, littleEndian);
		bytesMoved = 4;
	} else if (type == StorageType.FLOAT32) {
		const castValue = /** @type {import("./binarySerializationTypes.ts").StructureItemToObject<typeof type>} */ (value);
		dataView.setFloat32(byteOffset, castValue, littleEndian);
		bytesMoved = 4;
	} else if (type == StorageType.FLOAT64) {
		const castValue = /** @type {import("./binarySerializationTypes.ts").StructureItemToObject<typeof type>} */ (value);
		dataView.setFloat64(byteOffset, castValue, littleEndian);
		bytesMoved = 8;
	} else if (type == StorageType.STRING) {
		// string values have already been converted to a buffer in a previous pass.
		// See `getStructureTypeLength()`.
		const castValue = /** @type {Uint8Array} */ (value);
		bytesMoved = insertLengthAndBuffer(dataView, castValue, byteOffset, stringLengthStorageType, { littleEndian });
	} else if (type == StorageType.BOOL) {
		dataView.setUint8(byteOffset, value ? 1 : 0);
		bytesMoved = 1;
	} else if (type == StorageType.UUID || type == StorageType.ASSET_UUID) {
		const castValue = /** @type {import("./binarySerializationTypes.ts").StructureItemToObject<typeof type>} */ (value);
		if (type == StorageType.ASSET_UUID && studioAssetManager) {
			value = studioAssetManager.resolveDefaultAssetLinkUuid(castValue);
		}
		const binaryUuid = uuidToBinary(castValue);
		const view = new Uint8Array(dataView.buffer);
		view.set(new Uint8Array(binaryUuid), byteOffset);
		bytesMoved = 16;
	} else if (type == StorageType.ARRAY_BUFFER) {
		const castValue = /** @type {import("./binarySerializationTypes.ts").StructureItemToObject<typeof type>} */ (value);
		bytesMoved = insertLengthAndBuffer(dataView, castValue, byteOffset, arrayBufferLengthStorageType, { littleEndian });
	} else if (type == StorageType.NULL) {
		bytesMoved = 0;
	}
	return bytesMoved;
}

/**
 * @param {DataView} dataView
 * @param {ArrayBuffer} buffer
 * @param {number} byteOffset
 * @param {StorageType} lengthStorageType
 * @param {object} options
 * @param {boolean} options.littleEndian
 */
function insertLengthAndBuffer(dataView, buffer, byteOffset, lengthStorageType, { littleEndian }) {
	let bytesMoved = setDataViewValue(dataView, buffer.byteLength, lengthStorageType, byteOffset, { littleEndian });
	byteOffset += bytesMoved;
	const view = new Uint8Array(dataView.buffer);
	view.set(new Uint8Array(buffer), byteOffset);
	bytesMoved += buffer.byteLength;
	return bytesMoved;
}

/**
 * @typedef ParseStructureDigestableResult
 * @property {number} newByteOffset
 * @property {object | null} newReconstructedData
 */

/**
 * @param {import("./binarySerializationTypes.ts").AllowedStructureFormat} structure
 * @param {TraversedLocationData[]} traversedLocationPath
 * @param {object | null} reconstructedData The object that we'll be adding properties to as we parse the structure.
 * @param {boolean} isRootStructure True if this is a root structure of one of the reoccurring structure references.
 * @param {object} options
 * @param {Set<import("./binarySerializationTypes.ts").AllowedStructureFormat>} options.reoccurringStructureReferences
 * @param {NameIdsMap} options.nameIdsMap
 * @param {DataView} options.dataView
 * @param {number} options.byteOffset
 * @param {boolean} options.littleEndian
 * @param {TextDecoder} options.textDecoder
 * @param {Map<number, string>} options.nameIdsMapInverse
 * @param {BinaryToObjectTransformValueHook | null} options.transformValueHook
 * @param {CollectedReferenceLink[]} options.collectedReferenceLinks
 * @param {number} options.parsingStructureId
 * @param {Map<number, StructureRefData>} options.structureDataById
 * @param {Set<number>} options.unparsedStructureIds
 * @param {AllStorageTypes} options.refIdStorageType
 * @param {AllStorageTypes} options.arrayLengthStorageType
 * @param {AllStorageTypes} options.stringLengthStorageType
 * @param {AllStorageTypes} options.arrayBufferLengthStorageType
 * @returns {ParseStructureDigestableResult}
 */
function parseBinaryWithStructure(structure, traversedLocationPath, reconstructedData, isRootStructure, options) {
	const {
		reoccurringStructureReferences,
		nameIdsMap,
		dataView,
		byteOffset,
		littleEndian,
		textDecoder,
		nameIdsMapInverse,
		transformValueHook,
		collectedReferenceLinks,
		parsingStructureId,
		structureDataById,
		unparsedStructureIds,
		refIdStorageType,
		arrayLengthStorageType,
		stringLengthStorageType,
		arrayBufferLengthStorageType,
	} = options;
	let newByteOffset = byteOffset;

	if (typeof structure == "object" && structure != null) {
		if (!isRootStructure && reoccurringStructureReferences.has(structure)) {
			const { value: refId, bytesMoved } = getDataViewValue(dataView, refIdStorageType, newByteOffset, { littleEndian });
			if (typeof refId != "number") {
				throw new Error("Assertion failed, unable to get the structure ref id because its type is not a number. This is likely because the refIdStorageType isn't set in the header bit.");
			}
			newByteOffset += bytesMoved;
			if (!structureDataById.has(refId)) structureDataById.set(refId, { structureRef: structure });
			unparsedStructureIds.add(refId);
			collectedReferenceLinks.push({ refId, location: traversedLocationPath, injectIntoRefId: parsingStructureId });
		} else if (Array.isArray(structure)) {
			if (typeof structure[0] == "string") {
				// structure is an array of strings, treat it as an enum
				const castStructure1 = /** @type {unknown[]} */ (structure);
				const castStructure2 = /** @type {string[]} */ (castStructure1);
				const { type } = requiredStorageTypeForUint(structure.length);
				let { value, bytesMoved } = getDataViewValue(dataView, type, newByteOffset, { littleEndian, stringLengthStorageType, arrayBufferLengthStorageType, textDecoder });
				newByteOffset += bytesMoved;
				if (typeof value != "number") {
					throw new Error("Assertion failed, unable to get the enum value because its type is not a number.");
				}
				value = castStructure2[value - 1];
				reconstructedData = resolveBinaryValueLocation(reconstructedData, {
					nameIdsMapInverse, value,
					location: traversedLocationPath,
					transformValueHook,
					transformValueHookType: type,
				});
			} else if (structure[0] == StorageType.UNION_ARRAY) {
				const typeIndexStorageType = requiredStorageTypeForUint(structure.length).type;
				const { value: unionIndex, bytesMoved } = getDataViewValue(dataView, typeIndexStorageType, newByteOffset, { littleEndian });
				if (typeof unionIndex != "number") {
					throw new Error("Assertion failed, unable to get the type index of an union because its type is not a number.");
				}
				newByteOffset += bytesMoved;

				const unionStructure = structure[unionIndex + 1];

				const { newByteOffset: newNewByteOffset, newReconstructedData } = parseBinaryWithStructure(unionStructure, traversedLocationPath, reconstructedData, false, {
					...options,
					byteOffset: newByteOffset,
				});
				newByteOffset = newNewByteOffset;
				reconstructedData = newReconstructedData;
			} else {
				// structure is either an array with variable array length or an array with fixed array length
				const castStructure = /** @type {import("./binarySerializationTypes.ts").AllowedStructureFormat[]} */ (structure);
				const variableArrayLength = castStructure.length == 1;
				if (variableArrayLength) {
					const { value: arrayLength, bytesMoved } = getDataViewValue(dataView, arrayLengthStorageType, newByteOffset, { littleEndian });
					newByteOffset += bytesMoved;
					if (arrayLengthStorageType == StorageType.NULL || arrayLength == 0) {
						reconstructedData = resolveBinaryValueLocation(reconstructedData, {
							nameIdsMapInverse,
							value: [],
							location: traversedLocationPath,
							transformValueHook,
							transformValueHookType: StorageType.ARRAY,
						});
					} else {
						if (typeof arrayLength != "number") {
							throw new Error("Assertion failed, unable to get the variable array length because its type is not a number. This is likely because the arrayLengthStorageType isn't set in the header bit.");
						}

						for (let i = 0; i < arrayLength; i++) {
							const newTraversedLocationPath = [...traversedLocationPath, { id: i, type: StorageType.ARRAY }];
							const { newByteOffset: newNewByteOffset, newReconstructedData } = parseBinaryWithStructure(castStructure[0], newTraversedLocationPath, reconstructedData, false, {
								...options,
								byteOffset: newByteOffset,
							});
							newByteOffset = newNewByteOffset;
							reconstructedData = newReconstructedData;
						}
					}
				} else {
					const arr = [];
					for (const [i, arrayStructure] of castStructure.entries()) {
						const newTraversedLocationPath = [...traversedLocationPath, { id: i, type: StorageType.ARRAY }];
						const { newByteOffset: newNewByteOffset, newReconstructedData: arrayItemReconstructedData } = parseBinaryWithStructure(arrayStructure, newTraversedLocationPath, reconstructedData, false, {
							...options,
							byteOffset: newByteOffset,
						});
						newByteOffset = newNewByteOffset;
						arr.push(arrayItemReconstructedData);
					}
					reconstructedData = arr;
				}
			}
		} else {
			const arr = [];
			for (const [key, typeData] of Object.entries(structure)) {
				const nameId = nameIdsMap.get(key);
				if (nameId == undefined) continue;
				const newTraversedLocationPath = [...traversedLocationPath, { id: nameId, type: StorageType.OBJECT }];
				arr.push({
					type: structureToStorageType(typeData),
					typeData,
					location: newTraversedLocationPath,
					nameId,
				});
			}
			sortNameIdsArr(arr);
			for (const { typeData, location } of arr) {
				const { newByteOffset: newNewByteOffset, newReconstructedData } = parseBinaryWithStructure(typeData, location, reconstructedData, false, {
					...options,
					byteOffset: newByteOffset,
				});
				newByteOffset = newNewByteOffset;
				reconstructedData = newReconstructedData;
			}
		}
	} else {
		const { value, bytesMoved } = getDataViewValue(dataView, structure, newByteOffset, { littleEndian, stringLengthStorageType, arrayBufferLengthStorageType, textDecoder });
		newByteOffset += bytesMoved;
		reconstructedData = resolveBinaryValueLocation(reconstructedData, {
			nameIdsMapInverse, value,
			location: traversedLocationPath,
			transformValueHook,
			transformValueHookType: structure,
		});
	}

	return {
		newByteOffset,
		newReconstructedData: reconstructedData,
	};
}

/**
 * @param {DataView} dataView
 * @param {StorageType} type
 * @param {number} byteOffset
 * @param {object} opts
 * @param {boolean} [opts.littleEndian]
 * @param {StorageType} [opts.stringLengthStorageType]
 * @param {StorageType} [opts.arrayBufferLengthStorageType]
 * @param {TextDecoder} [opts.textDecoder]
 * @returns {{value: unknown, bytesMoved: number}}
 */
function getDataViewValue(dataView, type, byteOffset, {
	littleEndian = true,
	stringLengthStorageType = StorageType.UINT8,
	arrayBufferLengthStorageType = StorageType.UINT8,
	textDecoder = new TextDecoder(),
} = {}) {
	let value = null;
	let bytesMoved = 0;
	if (type == StorageType.INT8) {
		value = dataView.getInt8(byteOffset);
		bytesMoved = 1;
	} else if (type == StorageType.INT16) {
		value = dataView.getInt16(byteOffset, littleEndian);
		bytesMoved = 2;
	} else if (type == StorageType.INT32) {
		value = dataView.getInt32(byteOffset, littleEndian);
		bytesMoved = 4;
	} else if (type == StorageType.UINT8) {
		value = dataView.getUint8(byteOffset);
		bytesMoved = 1;
	} else if (type == StorageType.UINT16) {
		value = dataView.getUint16(byteOffset, littleEndian);
		bytesMoved = 2;
	} else if (type == StorageType.UINT32) {
		value = dataView.getUint32(byteOffset, littleEndian);
		bytesMoved = 4;
	} else if (type == StorageType.FLOAT32) {
		value = dataView.getFloat32(byteOffset, littleEndian);
		bytesMoved = 4;
	} else if (type == StorageType.FLOAT64) {
		value = dataView.getFloat64(byteOffset, littleEndian);
		bytesMoved = 8;
	} else if (type == StorageType.STRING) {
		const { buffer, bytesMoved: newBytesMoved } = getLengthAndBuffer(dataView, byteOffset, stringLengthStorageType, { littleEndian });
		value = textDecoder.decode(buffer);
		bytesMoved = newBytesMoved;
	} else if (type == StorageType.BOOL) {
		value = !!dataView.getUint8(byteOffset);
		bytesMoved = 1;
	} else if (type == StorageType.UUID || type == StorageType.ASSET_UUID) {
		value = binaryToUuid(dataView.buffer, byteOffset);
		bytesMoved = 16;
	} else if (type == StorageType.ARRAY_BUFFER) {
		const { buffer, bytesMoved: newBytesMoved } = getLengthAndBuffer(dataView, byteOffset, arrayBufferLengthStorageType, { littleEndian });
		value = buffer;
		bytesMoved = newBytesMoved;
	} else if (type == StorageType.NULL) {
		value = null;
		bytesMoved = 0;
	}

	return { value, bytesMoved };
}

/**
 * @param {DataView} dataView
 * @param {number} byteOffset
 * @param {StorageType} lengthStorageType
 * @param {object} options
 * @param {boolean} options.littleEndian
 */
function getLengthAndBuffer(dataView, byteOffset, lengthStorageType, { littleEndian }) {
	const { value: bufferByteLength, bytesMoved: newBytesMoved } = getDataViewValue(dataView, lengthStorageType, byteOffset, { littleEndian });
	if (typeof bufferByteLength != "number") throw new Error("Assertion failed, bufferByteLength is not a number. This is likely because the arrayBufferLengthStorageType isn't set in the header bit.");
	let bytesMoved = newBytesMoved;
	const bufferStart = byteOffset + bytesMoved;
	const buffer = dataView.buffer.slice(bufferStart, bufferStart + bufferByteLength);
	bytesMoved += bufferByteLength;
	return { buffer, length: bufferByteLength, bytesMoved };
}

/**
 * @param {object?} obj
 * @param {object} opts
 * @param {unknown} opts.value
 * @param {TraversedLocationData[]} opts.location
 * @param {Map<number, string>} opts.nameIdsMapInverse
 * @param {BinaryToObjectTransformValueHook?} [opts.transformValueHook]
 * @param {StorageType} [opts.transformValueHookType]
 * @param {number} [locationOffset]
 */
function resolveBinaryValueLocation(obj, {
	value, location, nameIdsMapInverse,
	transformValueHook, transformValueHookType,
}, locationOffset = 0) {
	const keyData = location[locationOffset];
	/** @type {string | number} */
	let key = keyData.id;
	if (obj == null) {
		if (keyData.type == StorageType.ARRAY) {
			obj = [];
		} else if (keyData.type == StorageType.OBJECT) {
			obj = {};
		} else {
			throw new Error("Assertion failed: the provided object was null but location data was not of type ARRAY or OBJECT.");
		}
	}
	const castObj = /** @type {Object<string | number, unknown>} */ (obj);

	if (keyData.type == StorageType.OBJECT) {
		const newKey = nameIdsMapInverse.get(keyData.id);
		if (newKey == undefined) {
			throw new Error(`Assertion failed: ${keyData.id} is missing from the inverse nameIds map`);
		}
		key = newKey;
	}

	if (locationOffset >= location.length - 1) {
		if (transformValueHook) {
			if (transformValueHookType == undefined) {
				throw new Error("Assertion failed, transformValueHookType was not provided but the hook could potentially get called.");
			}
			value = transformValueHook({ value, type: transformValueHookType, placedOnObject: castObj, placedOnKey: key });
		}
		castObj[key] = value;
	} else {
		let subValue = castObj[key] || null;
		subValue = resolveBinaryValueLocation(subValue, {
			value, location, nameIdsMapInverse,
			transformValueHook, transformValueHookType,
		}, locationOffset + 1);
		castObj[key] = subValue;
	}
	return obj;
}
