/** @typedef {StorageType | string[] | StorageType[] | BinarySerializationStructure[]} BinarySerializationStructureItem */
/**
 * @typedef {{
 * [key: string]: BinarySerializationStructureItem
 * }} BinarySerializationStructure
 */

/** @typedef {Object.<string, number>} BinarySerializationNameIds */

/**
 * @typedef {Object} ObjectToBinaryOptions
 * @property {BinarySerializationStructure} structure
 * @property {BinarySerializationNameIds} nameIds
 * @property {boolean} [littleEndian = true]
 * @property {boolean} [useHeaderByte = true]
 * @property {BinarySerializationVariableLengthStorageTypes?} [variableLengthStorageTypes = true]
 * @property {ObjectToBinaryTransformValueHook?} [transformValueHook = null]
 * @property {import("../../editor/src/assets/AssetManager.js").AssetManager?} [editorAssetManager = null]
 */

/**
 * @typedef {Object} BinarySerializationVariableLengthStorageTypes
 * @property {StorageType} [refId = StorageType.NULL]
 * @property {StorageType} [array = StorageType.UINT8]
 * @property {StorageType} [string = StorageType.UINT16]
 * @property {StorageType} [arrayBuffer = StorageType.UINT16]
 */

/**
 * @typedef {Object} BinaryToObjectTransformValueHookArgs
 * @property {*} value The value of the property before the transformation.
 * @property {StorageType} type The type of the property before the transformation.
 * @property {Object.<string, unknown>} placedOnObject The object the property will be placed on, use this with `placedOnKey` if you want to place it yourself in a promise.
 * @property {string} placedOnKey The key of the property.
 */

/** @typedef {function(BinaryToObjectTransformValueHookArgs) : *} BinaryToObjectTransformValueHook */

/**
 * @typedef {Object} ObjectToBinaryTransformValueHookArgs
 * @property {number} type The type of the property before the transformation.
 * @property {*} value The value of the property before the transformation.
 */

/** @typedef {function(ObjectToBinaryTransformValueHookArgs) : *} ObjectToBinaryTransformValueHook */

/**
 * @typedef {Object} BinarySerializationBinaryDigestible
 * @property {*} value
 * @property {StorageType} type
 * @property {boolean} [variableArrayLength = false]
 */

/** @typedef {{id: number, type: StorageType}} TraversedLocationData */

/** @typedef {BinarySerializationStructure | BinarySerializationStructure[] | StorageType | StorageType[] | string[]} BinarySerializationStructureRef */

/**
 * @typedef {Object} BinarySerializationStructureDigestible
 * @property {StorageType} type
 * @property {TraversedLocationData[]} location
 * @property {BinarySerializationStructureRef} [structureRef]
 * @property {*} [childData]
 * @property {BinarySerializationStructureDigestible} [arrayType]
 * @property {string[]} [enumStrings]
 */

/** @typedef {Map<string, number>} NameIdsMap */

/**
 * @readonly
 * @enum {number}
 */
export const StorageType = {
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
};

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
 * @param {ArrayBufferLike} buffer
 */
export function binaryToUuid(buffer, offset = 0) {
	/** @type {Uint8Array} */
	let bufferView;
	if (!ArrayBuffer.isView(buffer)) {
		bufferView = new Uint8Array(buffer);
	} else {
		bufferView = /** @type {Uint8Array} */ (buffer);
	}
	let allZeros = true;
	let str = "";
	for (let i = 0; i < 16; i++) {
		const intValue = bufferView[offset + i];
		if (intValue != 0) allZeros = false;
		str += intValue.toString(16).padStart(2, "0");
		if (i == 3 || i == 5 || i == 7 || i == 9) str += "-";
	}
	if (allZeros) return null;
	return str;
}

/**
 * @param {Object} data
 * @param {ObjectToBinaryOptions} opts
 * @returns {ArrayBuffer}
 */
export function objectToBinary(data, {
	structure,
	nameIds,
	littleEndian = true,
	useHeaderByte = true,
	variableLengthStorageTypes = null,
	transformValueHook = null,
	editorAssetManager = null,
}) {
	const nameIdsMap = new Map(Object.entries(nameIds));

	const reoccurringDataReferences = collectReoccurringReferences(data, nameIdsMap, false);
	// const reoccurringStructureReferences = collectReoccurringReferences(structure, nameIdsMap, true);

	const referencesAndStructures = getStoreAsReferenceItems(reoccurringDataReferences, data, structure, nameIdsMap);

	const referenceIds = new Map();
	const sortedReferences = [];
	for (const [ref, structure] of referencesAndStructures) {
		const id = sortedReferences.length;
		referenceIds.set(ref, id);
		sortedReferences.push({ref, structure});
	}

	const highestReferenceId = sortedReferences.length - 1;
	const {type: refIdStorageType} = requiredStorageTypeForUint(highestReferenceId);

	/** @type {BinarySerializationBinaryDigestible[]} */
	const binaryDigestable = [];
	for (const {ref, structure} of sortedReferences) {
		const digestable = generateBinaryDigestable(ref, structure, {referenceIds, nameIdsMap, isInitialItem: true});
		binaryDigestable.push(digestable);
	}

	const biggestVariableArrayLength = findBiggestVariableArrayLength(binaryDigestable);
	const dataContainsVariableLengthArrays = biggestVariableArrayLength >= 0;
	const {type: arrayLengthStorageType} = requiredStorageTypeForUint(biggestVariableArrayLength);

	const biggestStringLength = 600; // todo
	const {type: stringLengthStorageType, bytes: stringLengthByteLength} = requiredStorageTypeForUint(biggestStringLength);

	const biggestArrayBufferLength = 600; // todo
	const {type: arrayBufferLengthStorageType, bytes: arrayBufferLengthByteLength} = requiredStorageTypeForUint(biggestArrayBufferLength);

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
			item.value = transformValueHook({type: item.type, value: item.value});
		}
		const {length, value} = getStructureTypeLength(item.type, {
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

		byteOffset += setDataViewValue(dataView, headerByte, StorageType.UINT8, byteOffset, {littleEndian});

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

			byteOffset += setDataViewValue(dataView, customStorageTypesByte, StorageType.UINT8, byteOffset, {littleEndian});
		}
	}

	for (const item of flattened) {
		const bytesMoved = setDataViewValue(dataView, item.value, item.type, byteOffset, {littleEndian, stringLengthStorageType, arrayBufferLengthStorageType, editorAssetManager});
		byteOffset += bytesMoved;
	}

	return buffer;
}

/**
 * @param {ArrayBuffer} buffer
 * @param {Object} opts
 * @param {BinarySerializationStructure} opts.structure
 * @param {BinarySerializationNameIds} opts.nameIds
 * @param {boolean} [opts.littleEndian]
 * @param {boolean} [opts.useHeaderByte]
 * @param {BinarySerializationVariableLengthStorageTypes?} [opts.variableLengthStorageTypes]
 * @param {BinaryToObjectTransformValueHook?} [opts.transformValueHook]
 */
export function binaryToObject(buffer, {
	structure,
	nameIds,
	littleEndian = true,
	useHeaderByte = true,
	variableLengthStorageTypes = null,
	transformValueHook = null,
}) {
	const nameIdsMap = new Map(Object.entries(nameIds));
	const nameIdsMapInverse = new Map(Object.entries(nameIds).map(([k, v]) => [v, k]));

	const reoccurringStructureReferences = collectReoccurringReferences(structure, nameIdsMap, true);
	const references = new Set([structure, ...reoccurringStructureReferences]);

	/** @type {Map<any,BinarySerializationStructureDigestible[]>} */
	const structureDigestables = new Map();
	for (const structureRef of references) {
		const digestable = generateStructureDigestable(structureRef, [], {nameIdsMap, reoccurringStructureReferences, isInitialItem: true});
		const flattened = Array.from(flattenStructureDigestable(digestable));
		structureDigestables.set(structureRef, flattened);
	}

	/** @type {Required<BinarySerializationVariableLengthStorageTypes>} */
	const useVariableLengthStorageTypes = {
		...defaultVariableLengthStorageTypes,
		...variableLengthStorageTypes,
	};
	let refIdStorageType = useVariableLengthStorageTypes.refId;
	let arrayLengthStorageType = useVariableLengthStorageTypes.array;
	let stringLengthStorageType = useVariableLengthStorageTypes.string;
	let arrayBufferLengthStorageType = useVariableLengthStorageTypes.arrayBuffer;

	const dataView = new DataView(buffer);
	let byteOffset = 0;
	if (useHeaderByte) {
		const {value: headerByte, bytesMoved} = getDataViewValue(dataView, StorageType.UINT8, byteOffset, {littleEndian});
		byteOffset += bytesMoved;

		const hasCustomVariableLengthStorageTypes = !!(headerByte & HeaderBits.hasCustomVariableLengthStorageTypes);

		if (hasCustomVariableLengthStorageTypes) {
			const {value: customStorageTypesByte, bytesMoved} = getDataViewValue(dataView, StorageType.UINT8, byteOffset, {littleEndian});
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
	const textDecoder = new TextDecoder();
	const structureDataById = new Map();
	structureDataById.set(0, {structureRef: structure});

	const collectedReferenceLinks = [];

	const unparsedStructureIds = new Set([0]);
	let parsingStructureId = 0;
	while (unparsedStructureIds.size > 0) {
		const structureData = structureDataById.get(parsingStructureId);
		const structureRef = structureData.structureRef;
		let reconstructedData = null;

		const digestables = structureDigestables.get(structureRef);
		if (!digestables) throw new Error("Assertion error, no digestables found for structureRef");
		for (const digestable of digestables) {
			if (digestable.arrayType) {
				const {value: arrayLength, bytesMoved} = getDataViewValue(dataView, arrayLengthStorageType, byteOffset, {littleEndian});
				byteOffset += bytesMoved;
				if (arrayLength == 0) {
					reconstructedData = resolveBinaryValueLocation(reconstructedData, {
						nameIdsMapInverse,
						value: [],
						location: digestable.location,
						transformValueHook,
						transformValueHookType: digestable.type,
					});
				} else if (digestable.arrayType.structureRef) {
					for (let i = 0; i < arrayLength; i++) {
						const {value: refId, bytesMoved} = getDataViewValue(dataView, refIdStorageType, byteOffset, {littleEndian});
						byteOffset += bytesMoved;
						if (!structureDataById.has(refId)) structureDataById.set(refId, {structureRef: digestable.arrayType.structureRef});
						unparsedStructureIds.add(refId);
						collectedReferenceLinks.push({refId, location: digestable.arrayType.location, injectIntoRefId: parsingStructureId, variableLengthArrayIndex: i});
					}
				} else {
					for (let i = 0; i < arrayLength; i++) {
						const {value, bytesMoved} = getDataViewValue(dataView, digestable.arrayType.type, byteOffset, {littleEndian, stringLengthStorageType, arrayBufferLengthStorageType, textDecoder});
						byteOffset += bytesMoved;
						reconstructedData = resolveBinaryValueLocation(reconstructedData, {
							nameIdsMapInverse, value,
							location: digestable.arrayType.location,
							variableLengthArrayIndex: i,
							transformValueHook,
							transformValueHookType: digestable.arrayType.type,
						});
					}
				}
			} else if (digestable.structureRef) {
				const {value: refId, bytesMoved} = getDataViewValue(dataView, refIdStorageType, byteOffset, {littleEndian});
				byteOffset += bytesMoved;
				if (!structureDataById.has(refId)) structureDataById.set(refId, {structureRef: digestable.structureRef});
				unparsedStructureIds.add(refId);
				collectedReferenceLinks.push({refId, location: digestable.location, injectIntoRefId: parsingStructureId});
			} else {
				let {value, bytesMoved} = getDataViewValue(dataView, digestable.type, byteOffset, {littleEndian, stringLengthStorageType, arrayBufferLengthStorageType, textDecoder});
				byteOffset += bytesMoved;
				if (digestable.enumStrings) {
					value = digestable.enumStrings[value - 1];
				}
				reconstructedData = resolveBinaryValueLocation(reconstructedData, {
					nameIdsMapInverse, value,
					location: digestable.location,
					transformValueHook,
					transformValueHookType: digestable.type,
				});
			}
		}

		structureData.reconstructedData = reconstructedData;

		unparsedStructureIds.delete(parsingStructureId);
		parsingStructureId++;
	}

	for (const {refId, location, injectIntoRefId, variableLengthArrayIndex} of collectedReferenceLinks) {
		const structureData = structureDataById.get(refId);
		const value = structureData.reconstructedData;
		const injectIntoStructureData = structureDataById.get(injectIntoRefId);
		let injectIntoRef = injectIntoStructureData.reconstructedData;
		injectIntoRef = resolveBinaryValueLocation(injectIntoRef, {nameIdsMapInverse, value, location, variableLengthArrayIndex});
		injectIntoStructureData.reconstructedData = injectIntoRef;
	}

	return structureDataById.get(0).reconstructedData;
}

/**
 * Similar to binaryToObject() but replaces all uuids with assets.
 * @param {*} buffer
 * @param {*} assetLoader
 * @param {*} param2
 */
export async function binaryToObjectWithAssetLoader(buffer, assetLoader, {
	structure = null,
	nameIds = null,
	littleEndian = true,
} = {}) {
	/** @type {Promise<void>[]} */
	const promises = [];
	const obj = binaryToObject(buffer, {
		structure, nameIds, littleEndian,
		transformValueHook: ({value, type, placedOnObject, placedOnKey}) => {
			if (type != StorageType.ASSET_UUID) return value;
			if (value == null) return null;
			const promise = (async () => {
				const asset = await assetLoader.getAsset(value);
				placedOnObject[placedOnKey] = asset;
			})();
			promises.push(promise);
			return null;
		},
	});
	await Promise.all(promises);
	return obj;
}

/**
 * Returns a Set of objects references that occur more than once in the data.
 * Only items that exist in the nameIdsMap will be parsed.
 * @param {Object | BinarySerializationStructure} data Either the data that needs to be converted or its structure.
 * @param {NameIdsMap} nameIdsMap
 * @param {boolean} isStructure Whether the first argument is the structure.
 * @returns {Set<*>} A set of objects that occur more than once in the data.
 */
function collectReoccurringReferences(data, nameIdsMap, isStructure) {
	const occurringReferences = new Set(); // references that have occured once
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
 * @private
 * @param {Object} options
 * @param {any} options.data
 * @param {BinarySerializationStructure | BinarySerializationStructureItem} options.structure
 * @param {NameIdsMap} options.nameIdsMap
 * @param {Map<Object, BinarySerializationStructure>[]} options.existingItems
 * @param {Map<Object, BinarySerializationStructure>} options.collectedItems
 * @param {Set<object>} options.forceUseAsReferences
 * @param {boolean} [options.isInitialItem]
 */
function collectStoredAsReferenceItems({data, structure, nameIdsMap, existingItems, collectedItems, forceUseAsReferences, isInitialItem = false}) {
	if (!isInitialItem) {
		for (const existingItemList of existingItems) {
			if (existingItemList.has(data)) return;
		}

		if (forceUseAsReferences.has(data)) {
			collectedItems.set(data, structure);
			return;
		}
	}

	if (typeof data == "object" && data != null) {
		if (Array.isArray(data)) {
			if (structure.length == 1) {
				const structureItem = structure[0];
				// todo: add some sort of way to store arrays with variable length with
				// the value in place rather than as reference
				if (typeof structureItem == "object" && structureItem != null) {
					for (const item of data) {
						collectedItems.set(item, structureItem);
					}
				}
			} else {
				for (let i = 0; i < data.length; i++) {
					const item = data[i];
					const structureItem = structure[i];
					collectStoredAsReferenceItems({
						data: item,
						structure: structureItem,
						nameIdsMap, existingItems, collectedItems, forceUseAsReferences,
					});
				}
			}
		} else {
			for (const [key, val] of Object.entries(data)) {
				if (nameIdsMap.has(key)) {
					const structureItem = structure[key];
					collectStoredAsReferenceItems({
						data: val,
						structure: structureItem,
						nameIdsMap, collectedItems, existingItems, forceUseAsReferences,
					});
				}
			}
		}
	}
}

/**
 * @param {Set<object>} reoccurringDataReferences A set of objects that occur more than once in the data.
 * @param {Object} data The object that needs to be converted to binary.
 * @param {BinarySerializationStructure} structure
 * @param {NameIdsMap} nameIdsMap
 * @returns {Map<*,*>} A mapping of the reoccurring data references and their respective Structure references.
 */
function getStoreAsReferenceItems(reoccurringDataReferences, data, structure, nameIdsMap) {
	/** @type {Map<Object, BinarySerializationStructure>} */
	const unparsedReferences = new Map();
	unparsedReferences.set(data, structure);

	const parsedReferences = new Map();

	while (unparsedReferences.size > 0) {
		const [ref, structureRef] = unparsedReferences.entries().next().value;

		/** @type {Map<object, BinarySerializationStructure>} */
		const collectedItems = new Map();
		collectStoredAsReferenceItems({
			data: ref,
			structure: structureRef,
			nameIdsMap, collectedItems,
			existingItems: [parsedReferences, unparsedReferences],
			forceUseAsReferences: reoccurringDataReferences,
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
 * @param {number} int
 */
function requiredStorageTypeForUint(int) {
	const minBytes = Math.ceil(Math.log2(int + 1) / 8);
	let bytes = 0;
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
	return {type, bytes};
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
			return 0;
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
			return 0;
	}
}

/**
 * @param {Object} obj The object that needs be converted to binary.
 * @param {BinarySerializationStructureRef} structure The structure that belongs to this object.
 * @param {Object} opts
 * @param {Map<*,number>} opts.referenceIds A mapping of objects and an id that they will be using in the binary representation.
 * @param {Map<string,number>} opts.nameIdsMap
 * @param {boolean} [opts.isInitialItem] Whether this is the root item of the object.
 * @returns {BinarySerializationBinaryDigestible}
 */
function generateBinaryDigestable(obj, structure, {referenceIds, nameIdsMap, isInitialItem = false}) {
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
			const type = Array.isArray(obj) ? StorageType.ARRAY : StorageType.OBJECT;
			return {value: refId, type};
		}

		if (Array.isArray(structure)) {
			const castStructure = /** @type {(StorageType | BinarySerializationStructure)[]} */ (structure);
			if (typeof castStructure[0] == "string") {
				// structure is an array of strings, treat it as an enum
				const value = castStructure.indexOf(obj) + 1; // use 0 if the enum value is invalid
				const {type} = requiredStorageTypeForUint(castStructure.length);
				return {value, type};
			} else {
				const arr = [];
				const variableArrayLength = castStructure.length == 1;
				for (let i = 0; i < obj.length; i++) {
					const structureIndex = variableArrayLength ? 0 : i;
					arr.push(generateBinaryDigestable(obj[i], castStructure[structureIndex], {referenceIds, nameIdsMap}));
				}
				return {value: arr, type: StorageType.ARRAY, variableArrayLength};
			}
		} else {
			const arr = [];
			for (const key of Object.keys(structure)) {
				if (nameIdsMap.has(key)) {
					const val = obj[key];
					arr.push({
						...generateBinaryDigestable(val, structure[key], {referenceIds, nameIdsMap}),
						nameId: nameIdsMap.get(key),
					});
				}
			}
			sortNameIdsArr(arr);
			return {value: arr, type: StorageType.OBJECT};
		}
	} else {
		const castStructure = /** @type {StorageType} */ (structure);
		return {value: obj, type: castStructure};
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
 *
 * @param {BinarySerializationBinaryDigestible[]} binaryDigestableArray
 * @param {StorageType} arrayLengthStorageType
 * @returns {Generator<BinarySerializationBinaryDigestible>}
 */
function *flattenBinaryDigestable(binaryDigestableArray, arrayLengthStorageType) {
	for (const item of binaryDigestableArray) {
		if (Array.isArray(item.value)) {
			if (item.variableArrayLength) {
				yield {value: item.value.length, type: arrayLengthStorageType};
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
 * @param {Object} options
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
		return {length: 1};
	} else if (type == StorageType.INT16) {
		return {length: 2};
	} else if (type == StorageType.INT32) {
		return {length: 4};
	} else if (type == StorageType.UINT8) {
		return {length: 1};
	} else if (type == StorageType.UINT16) {
		return {length: 2};
	} else if (type == StorageType.UINT32) {
		return {length: 4};
	} else if (type == StorageType.FLOAT32) {
		return {length: 4};
	} else if (type == StorageType.FLOAT64) {
		return {length: 8};
	} else if (type == StorageType.STRING) {
		const encoded = textEncoder.encode(value);
		return {length: encoded.byteLength + stringLengthByteLength, value: encoded};
	} else if (type == StorageType.BOOL) {
		return {length: 1};
	} else if (type == StorageType.UUID || type == StorageType.ASSET_UUID) {
		return {length: 16};
	} else if (type == StorageType.ARRAY_BUFFER) {
		return {length: value.byteLength + arrayBufferLengthByteLength};
	} else if (type == StorageType.NULL) {
		return {length: 0};
	}
	return {length: 0};
}

/**
 * @private
 * @param {DataView} dataView
 * @param {unknown} value
 * @param {StorageType} type
 * @param {number} [byteOffset]
 * @param {Object} [options]
 * @param {boolean} [options.littleEndian]
 * @param {StorageType} [options.stringLengthStorageType]
 * @param {StorageType} [options.arrayBufferLengthStorageType]
 * @param {import("../../editor/src/assets/AssetManager.js").AssetManager?} [options.editorAssetManager]
 */
function setDataViewValue(dataView, value, type, byteOffset = 0, {
	littleEndian = true,
	stringLengthStorageType = StorageType.UINT8,
	arrayBufferLengthStorageType = StorageType.UINT8,
	editorAssetManager = null,
} = {}) {
	let bytesMoved = 0;
	if (type == StorageType.INT8) {
		dataView.setInt8(byteOffset, value);
		bytesMoved = 1;
	} else if (type == StorageType.INT16) {
		dataView.setInt16(byteOffset, value, littleEndian);
		bytesMoved = 2;
	} else if (type == StorageType.INT32) {
		dataView.setInt32(byteOffset, value, littleEndian);
		bytesMoved = 4;
	} else if (type == StorageType.UINT8) {
		dataView.setUint8(byteOffset, value);
		bytesMoved = 1;
	} else if (type == StorageType.UINT16) {
		dataView.setUint16(byteOffset, value, littleEndian);
		bytesMoved = 2;
	} else if (type == StorageType.UINT32) {
		dataView.setUint32(byteOffset, value, littleEndian);
		bytesMoved = 4;
	} else if (type == StorageType.FLOAT32) {
		dataView.setFloat32(byteOffset, value, littleEndian);
		bytesMoved = 4;
	} else if (type == StorageType.FLOAT64) {
		dataView.setFloat64(byteOffset, value, littleEndian);
		bytesMoved = 8;
	} else if (type == StorageType.STRING) {
		bytesMoved = insertLengthAndBuffer(dataView, value, byteOffset, stringLengthStorageType, {littleEndian});
	} else if (type == StorageType.BOOL) {
		dataView.setUint8(byteOffset, value ? 1 : 0);
		bytesMoved = 1;
	} else if (type == StorageType.UUID || type == StorageType.ASSET_UUID) {
		if (type == StorageType.ASSET_UUID && editorAssetManager) {
			value = editorAssetManager.resolveDefaultAssetLinkUuid(value);
		}
		const binaryUuid = uuidToBinary(value);
		const view = new Uint8Array(dataView.buffer);
		view.set(new Uint8Array(binaryUuid), byteOffset);
		bytesMoved = 16;
	} else if (type == StorageType.ARRAY_BUFFER) {
		bytesMoved = insertLengthAndBuffer(dataView, value, byteOffset, arrayBufferLengthStorageType, {littleEndian});
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
 * @param {Object} options
 * @param {boolean} options.littleEndian
 */
function insertLengthAndBuffer(dataView, buffer, byteOffset, lengthStorageType, {littleEndian}) {
	let bytesMoved = setDataViewValue(dataView, buffer.byteLength, lengthStorageType, byteOffset, {littleEndian});
	byteOffset += bytesMoved;
	const view = new Uint8Array(dataView.buffer);
	view.set(new Uint8Array(buffer), byteOffset);
	bytesMoved += buffer.byteLength;
	return bytesMoved;
}

/**
 * @param {BinarySerializationStructureRef} structure
 * @param {TraversedLocationData[]} traversedLocationPath
 * @param {Object} opts
 * @param {NameIdsMap} opts.nameIdsMap
 * @param {Set<*>} opts.reoccurringStructureReferences
 * @param {boolean} [opts.isInitialItem]
 * @returns {BinarySerializationStructureDigestible}
 */
function generateStructureDigestable(structure, traversedLocationPath, {nameIdsMap, reoccurringStructureReferences, isInitialItem = false}) {
	if (typeof structure == "object" && structure != null) {
		if (!isInitialItem && reoccurringStructureReferences.has(structure)) {
			const type = Array.isArray(structure) ? StorageType.ARRAY : StorageType.OBJECT;
			return {type, structureRef: structure, location: traversedLocationPath};
		}
		if (Array.isArray(structure)) {
			if (typeof structure[0] == "string") {
				const castStructure = /** @type {string[]} */ (structure);
				// structure is an array of strings, treat it as an enum
				const {type} = requiredStorageTypeForUint(structure.length);
				return {type, location: traversedLocationPath, enumStrings: castStructure};
			} else {
				const castStructure = /** @type {BinarySerializationStructure[] | number[]} */ (structure);
				const variableArrayLength = castStructure.length == 1;
				if (variableArrayLength) {
					const newTraversedLocationPath = [...traversedLocationPath, {id: -1, type: StorageType.ARRAY}];
					const arrayType = generateStructureDigestable(castStructure[0], newTraversedLocationPath, {nameIdsMap, reoccurringStructureReferences});
					return {type: StorageType.ARRAY, arrayType, location: traversedLocationPath};
				} else {
					const arr = [];
					for (const [i, arrayItem] of castStructure.entries()) {
						const newTraversedLocationPath = [...traversedLocationPath, {id: i, type: StorageType.ARRAY}];
						arr.push(generateStructureDigestable(arrayItem, newTraversedLocationPath, {nameIdsMap, reoccurringStructureReferences}));
					}
					return {type: StorageType.ARRAY, childData: arr, location: traversedLocationPath};
				}
			}
		} else {
			const arr = [];
			for (const [key, typeData] of Object.entries(structure)) {
				if (nameIdsMap.has(key)) {
					const nameId = nameIdsMap.get(key);
					const newTraversedLocationPath = [...traversedLocationPath, {id: nameId, type: StorageType.OBJECT}];
					arr.push({
						...generateStructureDigestable(typeData, newTraversedLocationPath, {nameIdsMap, reoccurringStructureReferences}),
						nameId,
					});
				}
			}
			sortNameIdsArr(arr);
			return {type: StorageType.OBJECT, childData: arr, location: traversedLocationPath};
		}
	} else {
		const castStructure = /** @type {StorageType} */ (structure);
		return {type: castStructure, location: traversedLocationPath};
	}
}

/**
 * @param {BinarySerializationStructureDigestible} digestable
 * @returns {Generator<BinarySerializationStructureDigestible>}
 */
function *flattenStructureDigestable(digestable) {
	if (digestable.type == StorageType.OBJECT || digestable.type == StorageType.ARRAY) {
		if (digestable.childData) {
			for (const item of digestable.childData) {
				for (const childDigestable of flattenStructureDigestable(item)) {
					yield childDigestable;
				}
			}
		} else if (digestable.arrayType || digestable.structureRef) {
			yield digestable;
		}
	} else {
		yield digestable;
	}
}

/**
 * @param {DataView} dataView
 * @param {StorageType} type
 * @param {number} byteOffset
 * @param {Object} opts
 * @param {boolean} [opts.littleEndian]
 * @param {StorageType} [opts.stringLengthStorageType]
 * @param {StorageType} [opts.arrayBufferLengthStorageType]
 * @param {TextDecoder} [opts.textDecoder]
 * @returns {{value: *, bytesMoved: number}}
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
		const {buffer, bytesMoved: newBytesMoved} = getLengthAndBuffer(dataView, byteOffset, stringLengthStorageType, {littleEndian});
		value = textDecoder.decode(buffer);
		bytesMoved = newBytesMoved;
	} else if (type == StorageType.BOOL) {
		value = !!dataView.getUint8(byteOffset);
		bytesMoved = 1;
	} else if (type == StorageType.UUID || type == StorageType.ASSET_UUID) {
		const view = new Uint8Array(dataView.buffer, byteOffset, 16);
		value = binaryToUuid(view);
		bytesMoved = 16;
	} else if (type == StorageType.ARRAY_BUFFER) {
		const {buffer, bytesMoved: newBytesMoved} = getLengthAndBuffer(dataView, byteOffset, arrayBufferLengthStorageType, {littleEndian});
		value = buffer;
		bytesMoved = newBytesMoved;
	} else if (type == StorageType.NULL) {
		value = null;
		bytesMoved = 0;
	}

	return {value, bytesMoved};
}

/**
 * @param {DataView} dataView
 * @param {number} byteOffset
 * @param {StorageType} lengthStorageType
 * @param {Object} options
 * @param {boolean} options.littleEndian
 */
function getLengthAndBuffer(dataView, byteOffset, lengthStorageType, {littleEndian}) {
	const {value: bufferByteLength, bytesMoved: newBytesMoved} = getDataViewValue(dataView, lengthStorageType, byteOffset, {littleEndian});
	let bytesMoved = newBytesMoved;
	const bufferStart = byteOffset + bytesMoved;
	const buffer = dataView.buffer.slice(bufferStart, bufferStart + bufferByteLength);
	bytesMoved += bufferByteLength;
	return {buffer, length: bufferByteLength, bytesMoved};
}

/**
 * @param {Object?} obj
 * @param {Object} opts
 * @param {Object} [opts.value]
 * @param {Object} [opts.location]
 * @param {Map<number, string>} [opts.nameIdsMapInverse]
 * @param {number} [opts.variableLengthArrayIndex]
 * @param {BinaryToObjectTransformValueHook?} [opts.transformValueHook]
 * @param {StorageType} [opts.transformValueHookType]
 * @param {number} [locationOffset]
 */
function resolveBinaryValueLocation(obj, {
	value, location, nameIdsMapInverse, variableLengthArrayIndex,
	transformValueHook, transformValueHookType,
}, locationOffset = 0) {
	const keyData = location[locationOffset];
	let key = keyData.id;
	if (obj == null) {
		if (keyData.type == StorageType.ARRAY) {
			obj = [];
		} else if (keyData.type == StorageType.OBJECT) {
			obj = {};
		}
	}
	if (keyData.type == StorageType.ARRAY) {
		if (key == -1) {
			key = variableLengthArrayIndex;
		}
	} else if (keyData.type == StorageType.OBJECT) {
		key = nameIdsMapInverse.get(keyData.id);
	}
	if (locationOffset >= location.length - 1) {
		if (transformValueHook) {
			value = transformValueHook({value, type: transformValueHookType, placedOnObject: obj, placedOnKey: key});
		}
		obj[key] = value;
	} else {
		let subValue = obj[key] || null;
		subValue = resolveBinaryValueLocation(subValue, {
			value, location, nameIdsMapInverse, variableLengthArrayIndex,
			transformValueHook, transformValueHookType,
		}, locationOffset + 1);
		obj[key] = subValue;
	}
	return obj;
}
