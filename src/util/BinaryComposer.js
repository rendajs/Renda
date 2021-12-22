import {BinaryDecomposer} from "./BinaryDecomposer.js";

/**
 * @typedef {{
 * [key: string]: (StorageType | string[] | StorageType[] | BinaryComposerStructure[])
 * }} BinaryComposerStructure
 */

/** @typedef {Object.<string, number>} BinaryComposerNameIds */

/**
 * @typedef {Object} BinaryComposerObjectToBinaryOptions
 * @property {BinaryComposerStructure} [structure = null]
 * @property {BinaryComposerNameIds} [nameIds = null]
 * @property {boolean} [littleEndian = true]
 * @property {boolean} [useHeaderByte = true]
 * @property {BinaryComposerVariableLengthStorageTypes} [variableLengthStorageTypes = true]
 * @property {ObjectToBinaryTransformValueHook} [transformValueHook = null]
 * @property {import("../../editor/src/Assets/AssetManager.js").AssetManager} [editorAssetManager = null]
 */

/**
 * @typedef {Object} BinaryComposerVariableLengthStorageTypes
 * @property {StorageType} [refId = StorageType.NULL]
 * @property {StorageType} [array = StorageType.UINT8]
 * @property {StorageType} [string = StorageType.UINT16]
 * @property {StorageType} [arrayBuffer = StorageType.UINT16]
 */

/**
 * @typedef {Object} BinaryToObjectTransformValueHookArgs
 * @property {*} value The value of the property before the transformation.
 * @property {StorageType} type The type of the property before the transformation.
 * @property {Object} placedOnObject The object the property will be placed on, use this with `placedOnKey` if you want to place it yourself in a promise.
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
 * @typedef {Object} BinaryComposerBinaryDigestible
 * @property {*} value
 * @property {StorageType} type
 * @property {boolean} [variableArrayLength = false]
 */

/** @typedef {{id: number, type: StorageType}} TraversedLocationData */

/** @typedef {BinaryComposerStructure | BinaryComposerStructure[] | StorageType | StorageType[] | string[]} BinaryComposerStructureRef */

/**
 * @typedef {Object} BinaryComposerStructureDigestible
 * @property {StorageType} type
 * @property {TraversedLocationData[]} location
 * @property {BinaryComposerStructureRef} [structureRef]
 * @property {*} [childData]
 * @property {BinaryComposerStructureDigestible} [arrayType]
 * @property {string[]} [enumStrings]
 */

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

export class BinaryComposer {
	constructor({
		littleEndian = true,
	} = {}) {
		this.bufferList = [];
		this.littleEndian = littleEndian;
	}

	static get HeaderBits() {
		return {
			hasCustomVariableLengthStorageTypes: 0b00000001,
		};
	}

	getFullBuffer() {
		if (this.bufferList.length == 0) {
			return new ArrayBuffer(0);
		} else if (this.bufferList.length == 1) {
			return this.bufferList[0];
		} else {
			let totalByteLength = 0;
			for (const chunk of this.bufferList) {
				totalByteLength += chunk.byteLength;
			}
			const intView = new Uint8Array(totalByteLength);
			let index = 0;
			for (const chunk of this.bufferList) {
				intView.set(new Uint8Array(chunk), index);
				index += chunk.byteLength;
			}
			const buff = intView.buffer;
			this.bufferList = [buff];
			return buff;
		}
	}

	appendBuffer(buffer) {
		this.bufferList.push(buffer);
	}

	appendInt8(value) {
		const buffer = new ArrayBuffer(1);
		new DataView(buffer).setInt8(0, value);
		this.appendBuffer(buffer);
	}

	appendUint8(value) {
		const buffer = new ArrayBuffer(1);
		new DataView(buffer).setUint8(0, value);
		this.appendBuffer(buffer);
	}

	appendInt16(value) {
		const buffer = new ArrayBuffer(2);
		new DataView(buffer).setInt16(0, value, this.littleEndian);
		this.appendBuffer(buffer);
	}

	appendUint16(value) {
		const buffer = new ArrayBuffer(2);
		new DataView(buffer).setUint16(0, value, this.littleEndian);
		this.appendBuffer(buffer);
	}

	appendInt32(value) {
		const buffer = new ArrayBuffer(4);
		new DataView(buffer).setInt32(0, value, this.littleEndian);
		this.appendBuffer(buffer);
	}

	appendUint32(value) {
		const buffer = new ArrayBuffer(4);
		new DataView(buffer).setUint32(0, value, this.littleEndian);
		this.appendBuffer(buffer);
	}

	appendUuid(uuid) {
		const buffer = BinaryComposer.uuidToBinary(uuid);
		this.appendBuffer(buffer);
	}

	static uuidToBinary(uuidStr) {
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

	/** @type {BinaryComposerVariableLengthStorageTypes} */
	static get defaultVariableLengthStorageTypes() {
		return {
			refId: StorageType.NULL,
			array: StorageType.UINT8,
			string: StorageType.UINT16,
			arrayBuffer: StorageType.UINT16,
		};
	}

	/**
	 * @param {Object} data
	 * @param {BinaryComposerObjectToBinaryOptions} opts
	 * @returns {ArrayBuffer}
	 */
	static objectToBinary(data, {
		structure = null,
		nameIds = null,
		littleEndian = true,
		useHeaderByte = true,
		variableLengthStorageTypes = null,
		transformValueHook = null,
		editorAssetManager = null,
	} = {}) {
		const nameIdsMap = new Map(Object.entries(nameIds));

		const reoccurringDataReferences = BinaryComposer.collectReoccurringReferences(data, nameIdsMap, false);
		// const reoccurringStructureReferences = BinaryComposer.collectReoccurringReferences(structure, nameIdsMap, true);

		const referencesAndStructures = BinaryComposer.getStoreAsReferenceItems(reoccurringDataReferences, data, structure, nameIdsMap);

		const referenceIds = new Map();
		const sortedReferences = [];
		for (const [ref, structure] of referencesAndStructures) {
			const id = sortedReferences.length;
			referenceIds.set(ref, id);
			sortedReferences.push({ref, structure});
		}

		const highestReferenceId = sortedReferences.length - 1;
		const {type: refIdStorageType} = BinaryComposer.requiredStorageTypeForUint(highestReferenceId);

		/** @type {BinaryComposerBinaryDigestible[]} */
		const binaryDigestable = [];
		for (const {ref, structure} of sortedReferences) {
			const digestable = BinaryComposer.generateBinaryDigestable(ref, structure, {referenceIds, nameIdsMap, isInitialItem: true});
			binaryDigestable.push(digestable);
		}

		const biggestVariableArrayLength = BinaryComposer.findBiggestVariableArrayLength(binaryDigestable);
		const dataContainsVariableLengthArrays = biggestVariableArrayLength >= 0;
		const {type: arrayLengthStorageType} = BinaryComposer.requiredStorageTypeForUint(biggestVariableArrayLength);

		const biggestStringLength = 600; // todo
		const {type: stringLengthStorageType, bytes: stringLengthByteLength} = BinaryComposer.requiredStorageTypeForUint(biggestStringLength);

		const biggestArrayBufferLength = 600; // todo
		const {type: arrayBufferLengthStorageType, bytes: arrayBufferLengthByteLength} = BinaryComposer.requiredStorageTypeForUint(biggestArrayBufferLength);

		const flattened = Array.from(BinaryComposer.flattenBinaryDigestable(binaryDigestable, arrayLengthStorageType));
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
				...BinaryComposer.defaultVariableLengthStorageTypes,
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
			const {length, value} = BinaryComposer.getStructureTypeLength(item.type, {
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
				headerByte |= BinaryComposer.HeaderBits.hasCustomVariableLengthStorageTypes;
			}

			byteOffset += BinaryComposer.setDataViewValue(dataView, headerByte, StorageType.UINT8, byteOffset, {littleEndian});

			if (hasCustomVariableLengthStorageTypes) {
				const refIdStorageTypeBits = BinaryComposer.variableLengthStorageTypeToBits(refIdStorageType);
				const arrayLengthStorageTypeBits = BinaryComposer.variableLengthStorageTypeToBits(arrayLengthStorageType);
				const stringLengthStorageTypeBits = BinaryComposer.variableLengthStorageTypeToBits(stringLengthStorageType);
				const arrayBufferLengthStorageTypeBits = BinaryComposer.variableLengthStorageTypeToBits(arrayBufferLengthStorageType);

				let customStorageTypesByte = 0;
				customStorageTypesByte |= refIdStorageTypeBits;
				customStorageTypesByte |= arrayLengthStorageTypeBits << 2;
				customStorageTypesByte |= stringLengthStorageTypeBits << 4;
				customStorageTypesByte |= arrayBufferLengthStorageTypeBits << 6;

				byteOffset += BinaryComposer.setDataViewValue(dataView, customStorageTypesByte, StorageType.UINT8, byteOffset, {littleEndian});
			}
		}

		for (const item of flattened) {
			const bytesMoved = BinaryComposer.setDataViewValue(dataView, item.value, item.type, byteOffset, {littleEndian, stringLengthStorageType, arrayBufferLengthStorageType, editorAssetManager});
			byteOffset += bytesMoved;
		}

		return buffer;
	}

	/**
	 * @param {ArrayBuffer} buffer
	 * @param {Object} [opts]
	 * @param {BinaryComposerStructure} [opts.structure]
	 * @param {BinaryComposerNameIds} [opts.nameIds]
	 * @param {boolean} [opts.littleEndian]
	 * @param {boolean} [opts.useHeaderByte]
	 * @param {BinaryComposerVariableLengthStorageTypes} [opts.variableLengthStorageTypes]
	 * @param {BinaryToObjectTransformValueHook} [opts.transformValueHook]
	 */
	static binaryToObject(buffer, {
		structure = null,
		nameIds = null,
		littleEndian = true,
		useHeaderByte = true,
		variableLengthStorageTypes = null,
		transformValueHook = null,
	} = {}) {
		const nameIdsMap = new Map(Object.entries(nameIds));
		const nameIdsMapInverse = new Map(Object.entries(nameIds).map(([k, v]) => [v, k]));

		const reoccurringStructureReferences = BinaryComposer.collectReoccurringReferences(structure, nameIdsMap, true);
		const references = new Set([structure, ...reoccurringStructureReferences]);

		/** @type {Map<any,BinaryComposerStructureDigestible[]>} */
		const structureDigestables = new Map();
		for (const structureRef of references) {
			const digestable = BinaryComposer.generateStructureDigestable(structureRef, [], {nameIdsMap, reoccurringStructureReferences, isInitialItem: true});
			const flattened = Array.from(BinaryComposer.flattenStructureDigestable(digestable));
			structureDigestables.set(structureRef, flattened);
		}

		variableLengthStorageTypes = {
			...BinaryComposer.defaultVariableLengthStorageTypes,
			...variableLengthStorageTypes,
		};
		let refIdStorageType = variableLengthStorageTypes.refId;
		let arrayLengthStorageType = variableLengthStorageTypes.array;
		let stringLengthStorageType = variableLengthStorageTypes.string;
		let arrayBufferLengthStorageType = variableLengthStorageTypes.arrayBuffer;

		const dataView = new DataView(buffer);
		let byteOffset = 0;
		if (useHeaderByte) {
			const {value: headerByte, bytesMoved} = BinaryComposer.getDataViewValue(dataView, StorageType.UINT8, byteOffset, {littleEndian});
			byteOffset += bytesMoved;

			const hasCustomVariableLengthStorageTypes = !!(headerByte & BinaryComposer.HeaderBits.hasCustomVariableLengthStorageTypes);

			if (hasCustomVariableLengthStorageTypes) {
				const {value: customStorageTypesByte, bytesMoved} = BinaryComposer.getDataViewValue(dataView, StorageType.UINT8, byteOffset, {littleEndian});
				byteOffset += bytesMoved;

				const refIdStorageTypeBits = (customStorageTypesByte) & 0b00000011;
				const arrayLengthStorageTypeBits = (customStorageTypesByte >> 2) & 0b00000011;
				const stringLengthStorageTypeBits = (customStorageTypesByte >> 4) & 0b00000011;
				const arrayBufferLengthStorageTypeBits = (customStorageTypesByte >> 6) & 0b00000011;

				refIdStorageType = BinaryComposer.variableLengthBitsToStorageType(refIdStorageTypeBits);
				arrayLengthStorageType = BinaryComposer.variableLengthBitsToStorageType(arrayLengthStorageTypeBits);
				stringLengthStorageType = BinaryComposer.variableLengthBitsToStorageType(stringLengthStorageTypeBits);
				arrayBufferLengthStorageType = BinaryComposer.variableLengthBitsToStorageType(arrayBufferLengthStorageTypeBits);
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
			for (const digestable of digestables) {
				if (digestable.arrayType) {
					const {value: arrayLength, bytesMoved} = BinaryComposer.getDataViewValue(dataView, arrayLengthStorageType, byteOffset, {littleEndian});
					byteOffset += bytesMoved;
					if (arrayLength == 0) {
						reconstructedData = BinaryComposer.resolveBinaryValueLocation(reconstructedData, {
							nameIdsMapInverse,
							value: [],
							location: digestable.location,
							transformValueHook,
							transformValueHookType: digestable.type,
						});
					} else if (digestable.arrayType.structureRef) {
						for (let i = 0; i < arrayLength; i++) {
							const {value: refId, bytesMoved} = BinaryComposer.getDataViewValue(dataView, refIdStorageType, byteOffset, {littleEndian});
							byteOffset += bytesMoved;
							if (!structureDataById.has(refId)) structureDataById.set(refId, {structureRef: digestable.arrayType.structureRef});
							unparsedStructureIds.add(refId);
							collectedReferenceLinks.push({refId, location: digestable.arrayType.location, injectIntoRefId: parsingStructureId, variableLengthArrayIndex: i});
						}
					} else {
						for (let i = 0; i < arrayLength; i++) {
							const {value, bytesMoved} = BinaryComposer.getDataViewValue(dataView, digestable.arrayType.type, byteOffset, {littleEndian, stringLengthStorageType, arrayBufferLengthStorageType, textDecoder});
							byteOffset += bytesMoved;
							reconstructedData = BinaryComposer.resolveBinaryValueLocation(reconstructedData, {
								nameIdsMapInverse, value,
								location: digestable.arrayType.location,
								variableLengthArrayIndex: i,
								transformValueHook,
								transformValueHookType: digestable.arrayType.type,
							});
						}
					}
				} else if (digestable.structureRef) {
					const {value: refId, bytesMoved} = BinaryComposer.getDataViewValue(dataView, refIdStorageType, byteOffset, {littleEndian});
					byteOffset += bytesMoved;
					if (!structureDataById.has(refId)) structureDataById.set(refId, {structureRef: digestable.structureRef});
					unparsedStructureIds.add(refId);
					collectedReferenceLinks.push({refId, location: digestable.location, injectIntoRefId: parsingStructureId});
				} else {
					let {value, bytesMoved} = BinaryComposer.getDataViewValue(dataView, digestable.type, byteOffset, {littleEndian, stringLengthStorageType, arrayBufferLengthStorageType, textDecoder});
					byteOffset += bytesMoved;
					if (digestable.enumStrings) {
						value = digestable.enumStrings[value - 1];
					}
					reconstructedData = BinaryComposer.resolveBinaryValueLocation(reconstructedData, {
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
			injectIntoRef = BinaryComposer.resolveBinaryValueLocation(injectIntoRef, {nameIdsMapInverse, value, location, variableLengthArrayIndex});
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
	static async binaryToObjectWithAssetLoader(buffer, assetLoader, {
		structure = null,
		nameIds = null,
		littleEndian = true,
	} = {}) {
		const promises = [];
		const obj = BinaryComposer.binaryToObject(buffer, {
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
	 * @param {Object | BinaryComposerStructure} data Either the data that needs to be converted or its structure.
	 * @param {Map<string, number>} nameIdsMap
	 * @param {boolean} isStructure Whether the first argument is the structure.
	 * @returns {Set<*>} A set of objects that occur more than once in the data.
	 */
	static collectReoccurringReferences(data, nameIdsMap, isStructure) {
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

	static collectStoredAsReferenceItems({data, structure, nameIdsMap, existingItems, collectedItems, forceUseAsReferences, isInitialItem = false}) {
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
						BinaryComposer.collectStoredAsReferenceItems({
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
						BinaryComposer.collectStoredAsReferenceItems({
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
	 * @param {Set<*>} reoccurringDataReferences A set of objects that occur more than once in the data.
	 * @param {Object} data The object that needs to be converted to binary.
	 * @param {BinaryComposerStructure} structure
	 * @param {Map<string, number>} nameIdsMap
	 * @returns {Map<*,*>} A mapping of the reoccurring data references and their respective Structure references.
	 */
	static getStoreAsReferenceItems(reoccurringDataReferences, data, structure, nameIdsMap) {
		const unparsedReferences = new Map();
		unparsedReferences.set(data, structure);

		const parsedReferences = new Map();

		while (unparsedReferences.size > 0) {
			const [ref, structureRef] = unparsedReferences.entries().next().value;

			const collectedItems = new Map();
			BinaryComposer.collectStoredAsReferenceItems({
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

	static requiredStorageTypeForUint(int) {
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

	static variableLengthStorageTypeToBits(storageType) {
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

	static variableLengthBitsToStorageType(bits) {
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
	 *
	 * @param {Object} obj The object that needs be converted to binary.
	 * @param {BinaryComposerStructureRef} structure The structure that belongs to this object.
	 * @param {Object} opts
	 * @param {Map<*,number>} opts.referenceIds A mapping of objects and an id that they will be using in the binary representation.
	 * @param {Map<string,number>} opts.nameIdsMap
	 * @param {boolean} [opts.isInitialItem] Whether this is the root item of the object.
	 * @returns {BinaryComposerBinaryDigestible}
	 */
	static generateBinaryDigestable(obj, structure, {referenceIds, nameIdsMap, isInitialItem = false}) {
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
				const castStructure = /** @type {(StorageType | BinaryComposerStructure)[]} */ (structure);
				if (typeof castStructure[0] == "string") {
					// structure is an array of strings, treat it as an enum
					const value = castStructure.indexOf(obj) + 1; // use 0 if the enum value is invalid
					const {type} = BinaryComposer.requiredStorageTypeForUint(castStructure.length);
					return {value, type};
				} else {
					const arr = [];
					const variableArrayLength = castStructure.length == 1;
					for (let i = 0; i < obj.length; i++) {
						const structureIndex = variableArrayLength ? 0 : i;
						arr.push(BinaryComposer.generateBinaryDigestable(obj[i], castStructure[structureIndex], {referenceIds, nameIdsMap}));
					}
					return {value: arr, type: StorageType.ARRAY, variableArrayLength};
				}
			} else {
				const arr = [];
				for (const key of Object.keys(structure)) {
					if (nameIdsMap.has(key)) {
						const val = obj[key];
						arr.push({
							...BinaryComposer.generateBinaryDigestable(val, structure[key], {referenceIds, nameIdsMap}),
							nameId: nameIdsMap.get(key),
						});
					}
				}
				BinaryComposer.sortNameIdsArr(arr);
				return {value: arr, type: StorageType.OBJECT};
			}
		} else {
			const castStructure = /** @type {StorageType} */ (structure);
			return {value: obj, type: castStructure};
		}
	}

	static sortNameIdsArr(arr) {
		arr.sort((a, b) => {
			if (a.type != b.type) {
				return a.type - b.type;
			}
			return a.nameId - b.nameId;
		});
	}

	/**
	 * @param {BinaryComposerBinaryDigestible[]} binaryDigestableArray
	 * @returns {number}
	 */
	static findBiggestVariableArrayLength(binaryDigestableArray) {
		let foundHighest = -1;
		for (const item of binaryDigestableArray) {
			if (item.type == StorageType.ARRAY && item.variableArrayLength) {
				foundHighest = Math.max(foundHighest, item.value.length);
			}
			if (Array.isArray(item.value)) {
				const highest = BinaryComposer.findBiggestVariableArrayLength(item.value);
				foundHighest = Math.max(foundHighest, highest);
			}
		}
		return foundHighest;
	}

	/**
	 *
	 * @param {BinaryComposerBinaryDigestible[]} binaryDigestableArray
	 * @param {StorageType} arrayLengthStorageType
	 * @returns {Generator<BinaryComposerBinaryDigestible>}
	 */
	static *flattenBinaryDigestable(binaryDigestableArray, arrayLengthStorageType) {
		for (const item of binaryDigestableArray) {
			if (Array.isArray(item.value)) {
				if (item.variableArrayLength) {
					yield {value: item.value.length, type: arrayLengthStorageType};
				}
				for (const item2 of BinaryComposer.flattenBinaryDigestable(item.value, arrayLengthStorageType)) {
					yield item2;
				}
			} else {
				yield item;
			}
		}
	}

	static getStructureTypeLength(type, {
		value = null,
		textEncoder = null,
		stringLengthByteLength = 0,
		arrayBufferLengthByteLength = 0,
	} = {}) {
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

	static setDataViewValue(dataView, value, type, byteOffset = 0, {
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
			bytesMoved = BinaryComposer.insertLengthAndBuffer(dataView, value, byteOffset, stringLengthStorageType, {littleEndian});
		} else if (type == StorageType.BOOL) {
			dataView.setUint8(byteOffset, value ? 1 : 0);
			bytesMoved = 1;
		} else if (type == StorageType.UUID || type == StorageType.ASSET_UUID) {
			if (type == StorageType.ASSET_UUID && editorAssetManager) {
				value = editorAssetManager.resolveDefaultAssetLinkUuid(value);
			}
			const binaryUuid = BinaryComposer.uuidToBinary(value);
			const view = new Uint8Array(dataView.buffer);
			view.set(new Uint8Array(binaryUuid), byteOffset);
			bytesMoved = 16;
		} else if (type == StorageType.ARRAY_BUFFER) {
			bytesMoved = BinaryComposer.insertLengthAndBuffer(dataView, value, byteOffset, arrayBufferLengthStorageType, {littleEndian});
		} else if (type == StorageType.NULL) {
			bytesMoved = 0;
		}
		return bytesMoved;
	}

	static insertLengthAndBuffer(dataView, buffer, byteOffset, lengthStorageType, {littleEndian}) {
		let bytesMoved = BinaryComposer.setDataViewValue(dataView, buffer.byteLength, lengthStorageType, byteOffset, {littleEndian});
		byteOffset += bytesMoved;
		const view = new Uint8Array(dataView.buffer);
		view.set(new Uint8Array(buffer), byteOffset);
		bytesMoved += buffer.byteLength;
		return bytesMoved;
	}

	/**
	 * @param {BinaryComposerStructureRef} structure
	 * @param {TraversedLocationData[]} traversedLocationPath
	 * @param {Object} opts
	 * @param {Map<string, number>} opts.nameIdsMap
	 * @param {Set<*>} opts.reoccurringStructureReferences
	 * @param {boolean} [opts.isInitialItem]
	 * @returns {BinaryComposerStructureDigestible}
	 */
	static generateStructureDigestable(structure, traversedLocationPath, {nameIdsMap, reoccurringStructureReferences, isInitialItem = false}) {
		if (typeof structure == "object" && structure != null) {
			if (!isInitialItem && reoccurringStructureReferences.has(structure)) {
				const type = Array.isArray(structure) ? StorageType.ARRAY : StorageType.OBJECT;
				return {type, structureRef: structure, location: traversedLocationPath};
			}
			if (Array.isArray(structure)) {
				if (typeof structure[0] == "string") {
					const castStructure = /** @type {string[]} */ (structure);
					// structure is an array of strings, treat it as an enum
					const {type} = BinaryComposer.requiredStorageTypeForUint(structure.length);
					return {type, location: traversedLocationPath, enumStrings: castStructure};
				} else {
					const castStructure = /** @type {BinaryComposerStructure[] | number[]} */ (structure);
					const variableArrayLength = castStructure.length == 1;
					if (variableArrayLength) {
						const newTraversedLocationPath = [...traversedLocationPath, {id: -1, type: StorageType.ARRAY}];
						const arrayType = BinaryComposer.generateStructureDigestable(castStructure[0], newTraversedLocationPath, {nameIdsMap, reoccurringStructureReferences});
						return {type: StorageType.ARRAY, arrayType, location: traversedLocationPath};
					} else {
						const arr = [];
						for (const [i, arrayItem] of castStructure.entries()) {
							const newTraversedLocationPath = [...traversedLocationPath, {id: i, type: StorageType.ARRAY}];
							arr.push(BinaryComposer.generateStructureDigestable(arrayItem, newTraversedLocationPath, {nameIdsMap, reoccurringStructureReferences}));
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
							...BinaryComposer.generateStructureDigestable(typeData, newTraversedLocationPath, {nameIdsMap, reoccurringStructureReferences}),
							nameId,
						});
					}
				}
				BinaryComposer.sortNameIdsArr(arr);
				return {type: StorageType.OBJECT, childData: arr, location: traversedLocationPath};
			}
		} else {
			const castStructure = /** @type {StorageType} */ (structure);
			return {type: castStructure, location: traversedLocationPath};
		}
	}

	/**
	 * @param {BinaryComposerStructureDigestible} digestable
	 * @returns {Generator<BinaryComposerStructureDigestible>}
	 */
	static *flattenStructureDigestable(digestable) {
		if (digestable.type == StorageType.OBJECT || digestable.type == StorageType.ARRAY) {
			if (digestable.childData) {
				for (const item of digestable.childData) {
					for (const childDigestable of BinaryComposer.flattenStructureDigestable(item)) {
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
	static getDataViewValue(dataView, type, byteOffset, {
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
			const {buffer, bytesMoved: newBytesMoved} = BinaryComposer.getLengthAndBuffer(dataView, byteOffset, stringLengthStorageType, {littleEndian});
			value = textDecoder.decode(buffer);
			bytesMoved = newBytesMoved;
		} else if (type == StorageType.BOOL) {
			value = !!dataView.getUint8(byteOffset);
			bytesMoved = 1;
		} else if (type == StorageType.UUID || type == StorageType.ASSET_UUID) {
			const view = new Uint8Array(dataView.buffer, byteOffset, 16);
			value = BinaryDecomposer.binaryToUuid(view);
			bytesMoved = 16;
		} else if (type == StorageType.ARRAY_BUFFER) {
			const {buffer, bytesMoved: newBytesMoved} = BinaryComposer.getLengthAndBuffer(dataView, byteOffset, arrayBufferLengthStorageType, {littleEndian});
			value = buffer;
			bytesMoved = newBytesMoved;
		} else if (type == StorageType.NULL) {
			value = null;
			bytesMoved = 0;
		}

		return {value, bytesMoved};
	}

	static getLengthAndBuffer(dataView, byteOffset, lengthStorageType, {littleEndian}) {
		const {value: bufferByteLength, bytesMoved: newBytesMoved} = BinaryComposer.getDataViewValue(dataView, lengthStorageType, byteOffset, {littleEndian});
		let bytesMoved = newBytesMoved;
		const bufferStart = byteOffset + bytesMoved;
		const buffer = dataView.buffer.slice(bufferStart, bufferStart + bufferByteLength);
		bytesMoved += bufferByteLength;
		return {buffer, length: bufferByteLength, bytesMoved};
	}

	/**
	 *
	 * @param {Object} obj
	 * @param {Object} opts
	 * @param {Object} [opts.value]
	 * @param {Object} [opts.location]
	 * @param {Map<number, string>} [opts.nameIdsMapInverse]
	 * @param {number} [opts.variableLengthArrayIndex]
	 * @param {BinaryToObjectTransformValueHook} [opts.transformValueHook]
	 * @param {StorageType} [opts.transformValueHookType]
	 * @param {number} [locationOffset]
	 */
	static resolveBinaryValueLocation(obj, {
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
			subValue = BinaryComposer.resolveBinaryValueLocation(subValue, {
				value, location, nameIdsMapInverse, variableLengthArrayIndex,
				transformValueHook, transformValueHookType,
			}, locationOffset + 1);
			obj[key] = subValue;
		}
		return obj;
	}
}
