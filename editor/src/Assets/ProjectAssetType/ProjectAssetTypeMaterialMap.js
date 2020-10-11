import ProjectAssetType from "./ProjectAssetType.js";
import {MaterialMap} from "../../../../src/index.js";
import PropertiesAssetContentMaterialMap from "../../PropertiesAssetContent/PropertiesAssetContentMaterialMap.js";
import editor from "../../editorInstance.js";
import {uuidToBinary} from "../../Util/Util.js";

export default class ProjectAssetTypeMaterialMap extends ProjectAssetType{

	static type = "JJ:materialMap";
	static typeUuid = "dd28f2f7-254c-4447-b041-1770ae451ba9";
	static newFileName = "New Material Map";
	static propertiesAssetContentConstructor = PropertiesAssetContentMaterialMap;

	constructor(){
		super(...arguments);
	}

	static createNewFile(){
		return {};
	}

	static expectedLiveAssetConstructor = MaterialMap;

	async createBundledAssetData(assetSettingOverrides = {}){
		const assetData = await this.projectAsset.readAssetData();
		for(const map of assetData.maps){
			const mapType = editor.materialMapTypeManager.getTypeByUuid(map.mapTypeId);

			if(mapType.allowExportInAssetBundles){ //todo: make this an asset setting
				const binaryMapData = mapType.mapDataToBinary(map.mapData);
				console.log(binaryMapData);
			}
		}
	}
}
