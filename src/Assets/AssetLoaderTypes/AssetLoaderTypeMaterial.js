import AssetLoaderType from "./AssetLoaderType.js";
import BinaryComposer from "../../Util/BinaryComposer.js";
import MaterialMapTypeLoader from "../MaterialMapTypeLoader.js";
import {isUuid} from "../../Util/Util.js";

export default class AssetLoaderTypeMaterial extends AssetLoaderType{

	static typeUuid = "430f47a8-82cc-4b4c-a664-2360794e80d6";

	constructor(){
		super();

		this.registeredLoaderTypes = new Map();
	}

	async parseBuffer(buffer){
		const materialData = BinaryComposer.binaryToObject(buffer, {
			structure: {
				values: [BinaryComposer.StructureTypes.INT8],
				mapDatas: [{
					typeUuid: BinaryComposer.StructureTypes.UUID,
					data: BinaryComposer.StructureTypes.ARRAYBUFFER,
				}],
			},
			nameIds: {
				values: 1,
				mapDatas: 2,
				typeUuid: 3,
				data: 4,
			},
		});
		for(const mapData of materialData.mapDatas){
			const mapLoader = this.registeredLoaderTypes.get(mapData.typeUuid);
			if(!mapLoader){
				//todo: remove this warning in release builds
				console.warn(`Unable to load material map, no mapLoader found for ${mapData.typeUuid}. Make sure to add a MaterialMapTypeLoader using registerMaterialMapTypeLoader()`);
				continue;
			}
			const parsedMapData = await mapLoader.parseBuffer(mapData.data);
			console.log(parsedMapData);
		}
	}

	registerMaterialMapTypeLoader(constructor){
		//todo: remove these warnings in release builds?
		if(!(constructor.prototype instanceof MaterialMapTypeLoader)){
			console.warn("Tried to register a MaterialMapTypeLoader type ("+constructor.name+") that does not extend MaterialMapTypeLoader class.");
			return;
		}

		if(!isUuid(constructor.typeUuid)){
			constructor.invalidConfigurationWarning("Tried to register MaterialMapTypeLoader ("+constructor.name+") without a valid typeUuid, override the static typeUuid value in order for this MaterialMapTypeLoader to function properly.");
			return;
		}

		const instance = new constructor(this);
		this.registeredLoaderTypes.set(constructor.typeUuid, instance);
	}
}
