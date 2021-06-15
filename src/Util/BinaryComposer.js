import BinaryDecomposer from "./BinaryDecomposer.js";

export default class BinaryComposer{
	constructor({
		littleEndian = true,
	} = {}){
		this.bufferList = [];
		this.littleEndian = littleEndian;
	}

	static get StructureTypes(){
		return {
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
			ASSET_UUID: 14, //same as UUID but will load the asset when binaryToObjectWithAssetLoader() is used
			ARRAY_BUFFER: 15,
		};
	}

	getFullBuffer(){
		if(this.bufferList.length == 0){
			return new ArrayBuffer(0);
		}else if(this.bufferList.length == 1){
			return this.bufferList[0];
		}else{
			let totalByteLength = 0;
			for(const chunk of this.bufferList){
				totalByteLength += chunk.byteLength;
			}
			const intView = new Uint8Array(totalByteLength);
			let index = 0;
			for(const chunk of this.bufferList){
				intView.set(new Uint8Array(chunk), index);
				index += chunk.byteLength;
			}
			const buff = intView.buffer;
			this.bufferList = [buff];
			return buff;
		}
	}

	appendBuffer(buffer){
		this.bufferList.push(buffer);
	}

	appendInt8(value){
		const buffer = new ArrayBuffer(1);
		new DataView(buffer).setInt8(0, value);
		this.appendBuffer(buffer);
	}

	appendUint8(value){
		const buffer = new ArrayBuffer(1);
		new DataView(buffer).setUint8(0, value);
		this.appendBuffer(buffer);
	}

	appendInt16(value){
		const buffer = new ArrayBuffer(2);
		new DataView(buffer).setInt16(0, value, this.littleEndian);
		this.appendBuffer(buffer);
	}

	appendUint16(value){
		const buffer = new ArrayBuffer(2);
		new DataView(buffer).setUint16(0, value, this.littleEndian);
		this.appendBuffer(buffer);
	}

	appendInt32(value){
		const buffer = new ArrayBuffer(4);
		new DataView(buffer).setInt32(0, value, this.littleEndian);
		this.appendBuffer(buffer);
	}

	appendUint32(value){
		const buffer = new ArrayBuffer(4);
		new DataView(buffer).setUint32(0, value, this.littleEndian);
		this.appendBuffer(buffer);
	}

	appendUuid(uuid){
		const buffer = BinaryComposer.uuidToBinary(uuid);
		this.appendBuffer(buffer);
	}

	static uuidToBinary(uuidStr){
		const buffer = new ArrayBuffer(16);
		if(!uuidStr) return buffer;
		let i=0, j=0;
		const view = new DataView(buffer);
		while(i < uuidStr.length){
			if(uuidStr[i] == "-") i++;
			const hex = uuidStr.slice(i, i+2);
			const int = parseInt(hex, 16);
			view.setUint8(j++, int);
			i+=2;
		}
		return buffer;
	}

	static objectToBinary(data, {
		structure = null,
		nameIds = null,
		littleEndian = true,
		transformValueHook = null,
		editorAssetManager = null,
	} = {}){
		const nameIdsMap = new Map(Object.entries(nameIds));

		const reoccurringDataReferences = BinaryComposer.collectReoccurringReferences(data, nameIdsMap, false);
		const reoccurringStructureReferences = BinaryComposer.collectReoccurringReferences(structure, nameIdsMap, true);

		const referencesAndStructures = BinaryComposer.getStoreAsReferenceItems({reoccurringDataReferences, data, structure, nameIdsMap});

		const referenceIds = new Map();
		const sortedReferences = [];
		for(const [ref, structure] of referencesAndStructures){
			const id = sortedReferences.length;
			referenceIds.set(ref, id);
			sortedReferences.push({ref, structure});
		}

		const highestReferenceId = sortedReferences.length - 1;
		const {type: refIdStorageType} = BinaryComposer.requiredStorageTypeForUint(highestReferenceId);

		const binaryDigestable = [];
		for(const {ref, structure} of sortedReferences){
			const digestable = BinaryComposer.generateBinaryDigestable(ref, structure, {referenceIds, nameIdsMap, isInitialItem: true});
			binaryDigestable.push(digestable);
		}

		let biggestVariableArrayLength = BinaryComposer.findBiggestVariableArrayLength(binaryDigestable);
		const dataContainsVariableLengthArrays = biggestVariableArrayLength >= 0;
		const {type: arrayLengthStorageType} = BinaryComposer.requiredStorageTypeForUint(biggestVariableArrayLength);

		const biggestStringLength = 600; //todo
		const {type: stringLengthStorageType, bytes: stringLengthByteLength} = BinaryComposer.requiredStorageTypeForUint(biggestStringLength);

		const biggestArrayBufferLength = 600; //todo
		const {type: arrayBufferLengthStorageType, bytes: arrayBufferLengthByteLength} = BinaryComposer.requiredStorageTypeForUint(biggestStringLength);

		const flattened = Array.from(BinaryComposer.flattenBinaryDigestable(binaryDigestable, arrayLengthStorageType));
		// console.log(flattened);

		for(const item of flattened){
			if(item.type == BinaryComposer.StructureTypes.OBJECT || item.type == BinaryComposer.StructureTypes.ARRAY){
				item.type = refIdStorageType;
			}
		}

		const textEncoder = new TextEncoder();
		let totalByteLength = 0;
		for(const item of flattened){
			if(transformValueHook){
				item.value = transformValueHook({type: item.type, value: item.value});
			}
			const {length, value} = BinaryComposer.getStructureTypeLength(item.type, {
				value: item.value,
				textEncoder, stringLengthByteLength, arrayBufferLengthByteLength,
			});
			totalByteLength += length;
			if(value) item.value = value;
		}


		const buffer = new ArrayBuffer(totalByteLength);
		const dataView = new DataView(buffer);
		let byteOffset = 0;
		//todo: add arraylength and refid storage types as header
		for(const item of flattened){
			const bytesMoved = BinaryComposer.setDataViewValue(dataView, item.value, item.type, byteOffset, {littleEndian, stringLengthStorageType, arrayBufferLengthStorageType, editorAssetManager});
			byteOffset += bytesMoved;
		}

		return buffer;
	}

	static binaryToObject(buffer, {
		structure = null,
		nameIds = null,
		littleEndian = true,
		transformValueHook = null,
	} = {}){
		const nameIdsMap = new Map(Object.entries(nameIds));
		const nameIdsMapInverse = new Map(Object.entries(nameIds).map(([k,v]) => [v,k]));

		const reoccurringStructureReferences = BinaryComposer.collectReoccurringReferences(structure, nameIdsMap, true);
		const references = new Set([structure, ...reoccurringStructureReferences]);

		const structureDigestables = new Map();
		for(const structureRef of references){
			const digestable = BinaryComposer.generateStructureDigestable(structureRef, [], {nameIdsMap, reoccurringStructureReferences, isInitialItem: true});
			const flattened = Array.from(BinaryComposer.flattenStructureDigestable(digestable));
			structureDigestables.set(structureRef, flattened);
		}

		const refIdStorageType = BinaryComposer.StructureTypes.UINT8; //todo: get from header
		const arrayLengthStorageType = BinaryComposer.StructureTypes.UINT8; //todo: get from header
		const stringLengthStorageType = BinaryComposer.StructureTypes.UINT16; //todo: get from header
		const arrayBufferLengthStorageType = BinaryComposer.StructureTypes.UINT16; //todo: get from header


		const dataView = new DataView(buffer);
		const textDecoder = new TextDecoder();
		let byteOffset = 0;
		const structureDataById = new Map();
		structureDataById.set(0, {structureRef: structure});

		const collectedReferenceLinks = [];

		const unparsedStructureIds = new Set([0]);
		let parsingStructureId = 0;
		while(unparsedStructureIds.size > 0){
			const structureData = structureDataById.get(parsingStructureId);
			const structureRef = structureData.structureRef;
			let reconstructedData = null;

			const digestables = structureDigestables.get(structureRef);
			for(const digestable of digestables){
				if(digestable.arrayType){
					const {value: arrayLength, bytesMoved} = BinaryComposer.getDataViewValue(dataView, arrayLengthStorageType, byteOffset, {littleEndian});
					byteOffset += bytesMoved;
					if(arrayLength == 0){
						const transformValueHookOpts = {type: digestable.type, nameId: digestable.nameId};
						reconstructedData = BinaryComposer.resolveBinaryValueLocation(reconstructedData, {
							nameIdsMapInverse,
							value: [],
							location: digestable.location,
							transformValueHook, transformValueHookOpts,
						});
					}else{
						if(digestable.arrayType.structureRef){
							for(let i=0; i<arrayLength; i++){
								const {value: refId, bytesMoved} = BinaryComposer.getDataViewValue(dataView, refIdStorageType, byteOffset, {littleEndian});
								byteOffset += bytesMoved;
								if(!structureDataById.has(refId)) structureDataById.set(refId, {structureRef: digestable.arrayType.structureRef});
								unparsedStructureIds.add(refId);
								collectedReferenceLinks.push({refId, location: digestable.arrayType.location, injectIntoRefId: parsingStructureId, variableLengthArrayIndex: i});
							}
						}else{
							for(let i=0; i<arrayLength; i++){
								const {value, bytesMoved} = BinaryComposer.getDataViewValue(dataView, digestable.arrayType.type, byteOffset, {littleEndian, stringLengthStorageType, arrayBufferLengthStorageType, textDecoder});
								byteOffset += bytesMoved;
								const transformValueHookOpts = {type: digestable.arrayType.type, nameId: digestable.nameId};
								reconstructedData = BinaryComposer.resolveBinaryValueLocation(reconstructedData, {
									nameIdsMapInverse, value,
									location: digestable.arrayType.location,
									variableLengthArrayIndex: i,
									transformValueHook, transformValueHookOpts,
								});
							}
						}
					}
				}else if(digestable.structureRef){
					const {value: refId, bytesMoved} = BinaryComposer.getDataViewValue(dataView, refIdStorageType, byteOffset, {littleEndian});
					byteOffset += bytesMoved;
					if(!structureDataById.has(refId)) structureDataById.set(refId, {structureRef: digestable.structureRef});
					unparsedStructureIds.add(refId);
					collectedReferenceLinks.push({refId, location: digestable.location, injectIntoRefId: parsingStructureId});
				}else{
					let {value, bytesMoved} = BinaryComposer.getDataViewValue(dataView, digestable.type, byteOffset, {littleEndian, stringLengthStorageType, arrayBufferLengthStorageType, textDecoder});
					byteOffset += bytesMoved;
					if(digestable.enumStrings){
						value = digestable.enumStrings[value - 1];
					}
					const transformValueHookOpts = {type: digestable.type, nameId: digestable.nameId};
					reconstructedData = BinaryComposer.resolveBinaryValueLocation(reconstructedData, {
						nameIdsMapInverse, value,
						location: digestable.location,
						transformValueHook, transformValueHookOpts,
					});
				}
			}

			structureData.reconstructedData = reconstructedData;

			unparsedStructureIds.delete(parsingStructureId);
			parsingStructureId++;
		}

		for(const {refId, location, injectIntoRefId, variableLengthArrayIndex} of collectedReferenceLinks){
			const structureData = structureDataById.get(refId);
			const value = structureData.reconstructedData;
			const injectIntoStructureData = structureDataById.get(injectIntoRefId);
			let injectIntoRef = injectIntoStructureData.reconstructedData;
			injectIntoRef = BinaryComposer.resolveBinaryValueLocation(injectIntoRef, {nameIdsMapInverse, value, location, variableLengthArrayIndex});
			injectIntoStructureData.reconstructedData = injectIntoRef;
		}

		return structureDataById.get(0).reconstructedData;
	}

	//similar to binaryToObject() but replaces all uuids with assets
	static async binaryToObjectWithAssetLoader(buffer, assetLoader, {
		structure = null,
		nameIds = null,
		littleEndian = true,
	} = {}){
		let promises = [];
		const obj = BinaryComposer.binaryToObject(buffer, {
			structure, nameIds, littleEndian,
			transformValueHook: ({value, type, placedOnObject, placedOnKey}) => {
				if(type != BinaryComposer.StructureTypes.ASSET_UUID) return value;
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

	//returns a Set of objects references that occur more than once in the data
	//only items that exist in the nameIdsMap will be parsed
	static collectReoccurringReferences(data, nameIdsMap, isStructure){
		const occurringReferences = new Set(); //references that have occured once
		const reoccurringReferences = new Set(); //references that have occured at least twice
		let prevReferences = [data];
		while(prevReferences.length > 0){
			const newReferences = [];
			for(const ref of prevReferences){
				if(typeof ref == "object" && ref != null){
					if(occurringReferences.has(ref)){
						reoccurringReferences.add(ref);
					}else{
						occurringReferences.add(ref);

						if(Array.isArray(ref)){
							if(ref.length == 1 && isStructure){
								//If the array structure only has one item, this array is expected
								//to have an arbitrary number of items, so it could have the same
								//reference in the data twice. Therefore we will assume arrays
								//with one item to always contain reoccurring references, even if
								//it occurs only once.
								newReferences.push(ref[0], ref[0]);
							}else{
								for(const item of ref){
									newReferences.push(item);
								}
							}
						}else{
							for(const [key, val] of Object.entries(ref)){
								if(nameIdsMap.has(key)){
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

	static collectStoredAsReferenceItems({data, structure, nameIdsMap, existingItems, collectedItems, forceUseAsReferences, isInitialItem = false}){
		if(!isInitialItem){
			for(const existingItemList of existingItems){
				if(existingItemList.has(data)) return;
			}

			if(forceUseAsReferences.has(data)){
				collectedItems.set(data, structure);
				return;
			}
		}


		if(typeof data == "object" && data != null){
			if(Array.isArray(data)){
				if(structure.length == 1){
					const structureItem = structure[0];
					//todo: add some sort of way to store arrays with variable length with
					//the value in place rather than as reference
					if(typeof structureItem == "object" && structureItem != null){
						for(const item of data){
							collectedItems.set(item, structureItem);
						}
					}
				}else{
					for(let i=0; i<data.length; i++){
						const item = data[i];
						const structureItem = structure[i];
						BinaryComposer.collectStoredAsReferenceItems({
							data: item,
							structure: structureItem,
							nameIdsMap, existingItems, collectedItems, forceUseAsReferences,
						});
					}
				}
			}else{
				for(const [key, val] of Object.entries(data)){
					if(nameIdsMap.has(key)){
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

	static getStoreAsReferenceItems({reoccurringDataReferences, data, structure, nameIdsMap}){
		const unparsedReferences = new Map();
		unparsedReferences.set(data, structure);

		const parsedReferences = new Map();

		while(unparsedReferences.size > 0){
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

			for(const [item, structureItem] of collectedItems){
				unparsedReferences.set(item, structureItem);
			}
			parsedReferences.set(ref, structureRef);
			unparsedReferences.delete(ref);
		}
		return parsedReferences;
	}

	static requiredStorageTypeForUint(int){
		const minBytes = Math.ceil(Math.log2(int+1)/8);
		let bytes = 4;
		let type = BinaryComposer.StructureTypes.UINT32;
		if(minBytes == 0){
			//todo: add an extra type for when minBytes is 0
			type = BinaryComposer.StructureTypes.UINT8;
			bytes = 1;
		}else if(minBytes == 1){
			type = BinaryComposer.StructureTypes.UINT8;
			bytes = 1;
		}else if(minBytes == 2){
			type = BinaryComposer.StructureTypes.UINT16;
			bytes = 2;
		}
		return {type, bytes};
	}

	static generateBinaryDigestable(obj, structure, {referenceIds, nameIdsMap, isInitialItem = false}){
		if(typeof structure == "object" && structure != null){
			if(!obj){
				if(Array.isArray(structure)){
					obj = [];
				}else{
					obj = {};
				}
			}
			if(!isInitialItem && referenceIds.has(obj)){
				const refId = referenceIds.get(obj);
				let type = Array.isArray(obj) ? BinaryComposer.StructureTypes.ARRAY : BinaryComposer.StructureTypes.OBJECT;
				return {value: refId, type};
			}

			if(Array.isArray(structure)){
				if(typeof structure[0] == "string"){
					//structure is an array of strings, treat it as an enum
					const value = structure.indexOf(obj) + 1; //use 0 if the enum value is invalid
					const {type} = BinaryComposer.requiredStorageTypeForUint(structure.length);
					return {value, type};
				}else{
					const arr = [];
					const variableArrayLength = structure.length == 1;
					for(let i=0; i<obj.length; i++){
						const structureIndex = variableArrayLength ? 0 : i;
						arr.push(BinaryComposer.generateBinaryDigestable(obj[i], structure[structureIndex], {referenceIds, nameIdsMap}));
					}
					return {value: arr, type: BinaryComposer.StructureTypes.ARRAY, variableArrayLength};
				}
			}else{
				const arr = [];
				for(const key of Object.keys(structure)){
					if(nameIdsMap.has(key)){
						const val = obj[key];
						arr.push({
							...BinaryComposer.generateBinaryDigestable(val, structure[key], {referenceIds, nameIdsMap}),
							nameId: nameIdsMap.get(key),
						});
					}
				}
				BinaryComposer.sortNameIdsArr(arr);
				return {value: arr, type: BinaryComposer.StructureTypes.OBJECT};
			}
		}else{
			return {value: obj, type: structure};
		}
	}

	static sortNameIdsArr(arr){
		arr.sort((a,b) => {
			if(a.type != b.type){
				return a.type - b.type;
			}
			return a.nameId - b.nameId;
		});
	}

	static findBiggestVariableArrayLength(binaryDigestableArray){
		let foundHighest = -1;
		for(const item of binaryDigestableArray){
			if(item.type == BinaryComposer.StructureTypes.ARRAY && item.variableArrayLength){
				foundHighest = Math.max(foundHighest, item.value.length);
			}
			if(Array.isArray(item.value)){
				const highest = BinaryComposer.findBiggestVariableArrayLength(item.value);
				foundHighest = Math.max(foundHighest, highest);
			}
		}
		return foundHighest;
	}

	static *flattenBinaryDigestable(binaryDigestableArray, arrayLengthStorageType){
		for(const item of binaryDigestableArray){
			if(Array.isArray(item.value)){
				if(item.variableArrayLength){
					yield {value: item.value.length, type: arrayLengthStorageType};
				}
				for(const item2 of BinaryComposer.flattenBinaryDigestable(item.value, arrayLengthStorageType)){
					yield item2;
				}
			}else{
				yield item;
			}
		}
	}

	static getStructureTypeLength(type, {
		value = null,
		textEncoder = null,
		stringLengthByteLength = 0,
		arrayBufferLengthByteLength = 0,
	} = {}){
		if(type == BinaryComposer.StructureTypes.INT8){
			return {length: 1};
		}else if(type == BinaryComposer.StructureTypes.INT16){
			return {length: 2};
		}else if(type == BinaryComposer.StructureTypes.INT32){
			return {length: 4};
		}else if(type == BinaryComposer.StructureTypes.UINT8){
			return {length: 1};
		}else if(type == BinaryComposer.StructureTypes.UINT16){
			return {length: 2};
		}else if(type == BinaryComposer.StructureTypes.UINT32){
			return {length: 4};
		}else if(type == BinaryComposer.StructureTypes.FLOAT32){
			return {length: 4};
		}else if(type == BinaryComposer.StructureTypes.FLOAT64){
			return {length: 8};
		}else if(type == BinaryComposer.StructureTypes.STRING){
			const encoded = textEncoder.encode(value);
			return {length: encoded.byteLength + stringLengthByteLength, value: encoded};
		}else if(type == BinaryComposer.StructureTypes.BOOL){
			return {length: 1};
		}else if(type == BinaryComposer.StructureTypes.UUID || type == BinaryComposer.StructureTypes.ASSET_UUID){
			return {length: 16};
		}else if(type == BinaryComposer.StructureTypes.ARRAY_BUFFER){
			return {length: value.byteLength + arrayBufferLengthByteLength};
		}
	}

	static setDataViewValue(dataView, value, type, byteOffset = 0, {
		littleEndian = true,
		stringLengthStorageType = BinaryComposer.StructureTypes.UINT8,
		arrayBufferLengthStorageType = BinaryComposer.StructureTypes.UINT8,
		editorAssetManager = null,
	} = {}){
		let bytesMoved = 0;
		if(type == BinaryComposer.StructureTypes.INT8){
			dataView.setInt8(byteOffset, value);
			bytesMoved = 1;
		}else if(type == BinaryComposer.StructureTypes.INT16){
			dataView.setInt16(byteOffset, value, littleEndian);
			bytesMoved = 2;
		}else if(type == BinaryComposer.StructureTypes.INT32){
			dataView.setInt32(byteOffset, value, littleEndian);
			bytesMoved = 4;
		}else if(type == BinaryComposer.StructureTypes.UINT8){
			dataView.setUint8(byteOffset, value);
			bytesMoved = 1;
		}else if(type == BinaryComposer.StructureTypes.UINT16){
			dataView.setUint16(byteOffset, value, littleEndian);
			bytesMoved = 2;
		}else if(type == BinaryComposer.StructureTypes.UINT32){
			dataView.setUint32(byteOffset, value, littleEndian);
			bytesMoved = 4;
		}else if(type == BinaryComposer.StructureTypes.FLOAT32){
			dataView.setFloat32(byteOffset, value, littleEndian);
			bytesMoved = 4;
		}else if(type == BinaryComposer.StructureTypes.FLOAT64){
			dataView.setFloat64(byteOffset, value, littleEndian);
			bytesMoved = 8;
		}else if(type == BinaryComposer.StructureTypes.STRING){
			bytesMoved = BinaryComposer.insertLengthAndBuffer(dataView, value, byteOffset, stringLengthStorageType, {littleEndian});
		}else if(type == BinaryComposer.StructureTypes.BOOL){
			dataView.setUint8(byteOffset, value ? 1 : 0);
			bytesMoved = 1;
		}else if(type == BinaryComposer.StructureTypes.UUID || type == BinaryComposer.StructureTypes.ASSET_UUID){
			if(type == BinaryComposer.StructureTypes.ASSET_UUID && editorAssetManager){
				value = editorAssetManager.resolveDefaultAssetLinkUuid(value);
			}
			const binaryUuid = BinaryComposer.uuidToBinary(value);
			const view = new Uint8Array(dataView.buffer);
			view.set(new Uint8Array(binaryUuid), byteOffset);
			bytesMoved = 16;
		}else if(type = BinaryComposer.StructureTypes.ARRAY_BUFFER){
			bytesMoved = BinaryComposer.insertLengthAndBuffer(dataView, value, byteOffset, arrayBufferLengthStorageType, {littleEndian});
		}
		return bytesMoved;
	}

	static insertLengthAndBuffer(dataView, buffer, byteOffset, lengthStorageType, {littleEndian}){
		let bytesMoved = BinaryComposer.setDataViewValue(dataView, buffer.byteLength, lengthStorageType, byteOffset, {littleEndian});
		byteOffset += bytesMoved;
		const view = new Uint8Array(dataView.buffer);
		view.set(new Uint8Array(buffer), byteOffset);
		bytesMoved += buffer.byteLength;
		return bytesMoved;
	}

	static generateStructureDigestable(structure, traversedLocationPath, {nameIdsMap, reoccurringStructureReferences, isInitialItem = false}){
		if(typeof structure == "object" && structure != null){
			if(!isInitialItem && reoccurringStructureReferences.has(structure)){
				let type = Array.isArray(structure) ? BinaryComposer.StructureTypes.ARRAY : BinaryComposer.StructureTypes.OBJECT;
				return {type, structureRef: structure, location: traversedLocationPath};
			}
			if(Array.isArray(structure)){
				if(typeof structure[0] == "string"){
					//structure is an array of strings, treat it as an enum
					const {type} = BinaryComposer.requiredStorageTypeForUint(structure.length);
					return {type, location: traversedLocationPath, enumStrings: structure};
				}else{
					const variableArrayLength = structure.length == 1;
					if(variableArrayLength){
						const newTraversedLocationPath = [...traversedLocationPath, {id: -1, type: BinaryComposer.StructureTypes.ARRAY}];
						const arrayType = BinaryComposer.generateStructureDigestable(structure[0], newTraversedLocationPath, {nameIdsMap, reoccurringStructureReferences});
						return {type: BinaryComposer.StructureTypes.ARRAY, arrayType, location: traversedLocationPath};
					}else{
						const arr = [];
						for(const [i, arrayItem] of structure.entries()){
							const newTraversedLocationPath = [...traversedLocationPath, {id: i, type: BinaryComposer.StructureTypes.ARRAY}];
							arr.push(BinaryComposer.generateStructureDigestable(arrayItem, newTraversedLocationPath, {nameIdsMap, reoccurringStructureReferences}));
						}
						return {type: BinaryComposer.StructureTypes.ARRAY, childData: arr, location: traversedLocationPath}
					}
				}
			}else{
				const arr = [];
				for(const [key, typeData] of Object.entries(structure)){
					if(nameIdsMap.has(key)){
						const nameId = nameIdsMap.get(key);
						const newTraversedLocationPath = [...traversedLocationPath, {id: nameId, type: BinaryComposer.StructureTypes.OBJECT}];
						arr.push({
							...BinaryComposer.generateStructureDigestable(typeData, newTraversedLocationPath, {nameIdsMap, reoccurringStructureReferences}),
							nameId,
						});
					}
				}
				BinaryComposer.sortNameIdsArr(arr);
				return {type: BinaryComposer.StructureTypes.OBJECT, childData: arr, location: traversedLocationPath};
			}
		}else{
			return {type: structure, location: traversedLocationPath};
		}
	}

	static *flattenStructureDigestable(digestable){
		if(digestable.type == BinaryComposer.StructureTypes.OBJECT || digestable.type == BinaryComposer.StructureTypes.ARRAY){
			if(digestable.childData){
				for(const item of digestable.childData){
					for(const childDigestable of BinaryComposer.flattenStructureDigestable(item)){
						yield childDigestable;
					}
				}
			}else if(digestable.arrayType || digestable.structureRef){
				yield digestable;
			}
		}else{
			yield digestable;
		}
	}

	static getDataViewValue(dataView, type, byteOffset, {
		littleEndian = true,
		stringLengthStorageType = BinaryComposer.StructureTypes.UINT8,
		arrayBufferLengthStorageType = BinaryComposer.StructureTypes.UINT8,
		textDecoder = new TextDecoder(),
	} = {}){
		let value = null;
		let bytesMoved = 0;
		if(type == BinaryComposer.StructureTypes.INT8){
			value = dataView.getInt8(byteOffset);
			bytesMoved = 1;
		}else if(type == BinaryComposer.StructureTypes.INT16){
			value = dataView.getInt16(byteOffset, littleEndian);
			bytesMoved = 2;
		}else if(type == BinaryComposer.StructureTypes.INT32){
			value = dataView.getInt32(byteOffset, littleEndian);
			bytesMoved = 4;
		}else if(type == BinaryComposer.StructureTypes.UINT8){
			value = dataView.getUint8(byteOffset);
			bytesMoved = 1;
		}else if(type == BinaryComposer.StructureTypes.UINT16){
			value = dataView.getUint16(byteOffset, littleEndian);
			bytesMoved = 2;
		}else if(type == BinaryComposer.StructureTypes.UINT32){
			value = dataView.getUint32(byteOffset, littleEndian);
			bytesMoved = 4;
		}else if(type == BinaryComposer.StructureTypes.FLOAT32){
			value = dataView.getFloat32(byteOffset, littleEndian);
			bytesMoved = 4;
		}else if(type == BinaryComposer.StructureTypes.FLOAT64){
			value = dataView.getFloat64(byteOffset, littleEndian);
			bytesMoved = 8;
		}else if(type == BinaryComposer.StructureTypes.STRING){
			const {buffer, bytesMoved: newBytesMoved} = BinaryComposer.getLengthAndBuffer(dataView, byteOffset, stringLengthStorageType, {littleEndian});
			value = textDecoder.decode(buffer);
			bytesMoved = newBytesMoved;
		}else if(type == BinaryComposer.StructureTypes.BOOL){
			value = !!dataView.getUint8(byteOffset);
			bytesMoved = 1;
		}else if(type == BinaryComposer.StructureTypes.UUID || type == BinaryComposer.StructureTypes.ASSET_UUID){
			const view = new Uint8Array(dataView.buffer, byteOffset, 16);
			value = BinaryDecomposer.binaryToUuid(view);
			bytesMoved = 16;
		}else if(type == BinaryComposer.StructureTypes.ARRAY_BUFFER){
			const {buffer, bytesMoved: newBytesMoved} = BinaryComposer.getLengthAndBuffer(dataView, byteOffset, arrayBufferLengthStorageType, {littleEndian});
			value = buffer;
			bytesMoved = newBytesMoved;
		}

		return {value, bytesMoved};
	}

	static getLengthAndBuffer(dataView, byteOffset, lengthStorageType, {littleEndian}){
		const {value: bufferByteLength, bytesMoved: newBytesMoved} = BinaryComposer.getDataViewValue(dataView, lengthStorageType, byteOffset, {littleEndian});
		let bytesMoved = newBytesMoved;
		const bufferStart = byteOffset + bytesMoved;
		const buffer = dataView.buffer.slice(bufferStart, bufferStart + bufferByteLength);
		bytesMoved += bufferByteLength;
		return {buffer, length: bufferByteLength, bytesMoved};
	}

	static resolveBinaryValueLocation(obj, {
		value, location, nameIdsMapInverse, variableLengthArrayIndex,
		transformValueHook, transformValueHookOpts,
	}, locationOffset = 0){
		const keyData = location[locationOffset];
		let key = keyData.id;
		if(obj == null){
			if(keyData.type == BinaryComposer.StructureTypes.ARRAY){
				obj = [];
			}else if(keyData.type == BinaryComposer.StructureTypes.OBJECT){
				obj = {};
			}
		}
		if(keyData.type == BinaryComposer.StructureTypes.ARRAY){
			if(key == -1){
				key = variableLengthArrayIndex;
			}
		}else if(keyData.type == BinaryComposer.StructureTypes.OBJECT){
			key = nameIdsMapInverse.get(keyData.id);
		}
		if(locationOffset >= location.length - 1){
			if(transformValueHook){
				value = transformValueHook({value, placedOnObject: obj, placedOnKey: key, ...transformValueHookOpts});
			}
			obj[key] = value;
		}else{
			let subValue = obj[key] || null;
			subValue = BinaryComposer.resolveBinaryValueLocation(subValue, {
				value, location, nameIdsMapInverse, variableLengthArrayIndex,
				transformValueHook, transformValueHookOpts,
			}, locationOffset + 1);
			obj[key] = subValue;
		}
		return obj;
	}
}
