import autoRegisterMaterialMapTypes from "../MaterialMapTypes/AutoRegisterMaterialMapTypes.js";
import MaterialMapType from "../MaterialMapTypes/MaterialMapType.js";
import {isUuid} from "../../../src/Util/Util.js";

export default class MaterialMapTypeManager{
	constructor(){
		this.registeredMapTypes = new Map();
	}

	init(){
		for(const t of autoRegisterMaterialMapTypes){
			this.registerMapType(t);
		}
	}

	registerMapType(constructor){
		if(!(constructor.prototype instanceof MaterialMapType)){
			console.warn("Tried to register a MaterialMapType type ("+constructor.name+") that does not extend MaterialMapType class.");
			return;
		}

		if(constructor.uiName == null || typeof constructor.uiName != "string"){
			constructor.invalidConfigurationWarning("Failed to register MaterialMapType ("+constructor.name+") invalid uiName value.");
			return;
		}

		if(!isUuid(constructor.typeUuid)){
			constructor.invalidConfigurationWarning("Tried to register MaterialMapType ("+constructor.name+") without a valid typeUuid, override the static typeUuid value in order for this MaterialMapType to function properly.");
			return;
		}

		this.registeredMapTypes.set(constructor.typeUuid, constructor);
	}

	*getAllTypes(){
		for(const type of this.registeredMapTypes.values()){
			yield type;
		}
	}

	getTypeByUuid(uuid){
		return this.registeredMapTypes.get(uuid);
	}

	async getMapValuesForMapAsset(mapAsset){
		if(!mapAsset) return [];
		const mapValues = new Map();
		const mapData = await mapAsset.readAssetData();
		for(const mapType of mapData.maps){
			const mapTypeConstructor = this.getTypeByUuid(mapType.mapTypeId);
			const values = await mapTypeConstructor.getMappedValues(mapType.customData, mapType.mappedValues);
			for(const value of values){
				mapValues.set(value.name, value);
			}
		}
		return mapValues;
	}

	async getDataForMapLiveAsset(mapAsset){
		const mapData = await mapAsset.readAssetData();
		const mapDatas = new Map();
		const linkedProjectAssets = new Set();
		for(const mapType of mapData.maps){
			const mapTypeConstructor = this.getTypeByUuid(mapType.mapTypeId);
			const customData = await mapTypeConstructor.getLiveAssetCustomData(mapType.customData);
			mapDatas.set(mapType.mapTypeId, customData);

			for await (const projectAsset of mapTypeConstructor.getLinkedAssetsInCustomData(mapType.customData)){
				linkedProjectAssets.add(projectAsset);
			}
		}
		return {mapDatas, linkedProjectAssets};
	}
}
