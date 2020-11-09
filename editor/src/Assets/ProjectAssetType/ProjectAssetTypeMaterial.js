import ProjectAssetType from "./ProjectAssetType.js";
import {Material} from "../../../../src/index.js";
import PropertiesAssetContentMaterial from "../../PropertiesAssetContent/PropertiesAssetContentMaterial.js";
import editor from "../../editorInstance.js";
import BinaryComposer from "../../../../src/Util/BinaryComposer.js";

export default class ProjectAssetTypeMaterial extends ProjectAssetType{

	static type = "JJ:material";
	static typeUuid = "430f47a8-82cc-4b4c-a664-2360794e80d6";
	static newFileName = "New Material";
	static propertiesAssetContentConstructor = PropertiesAssetContentMaterial;

	constructor(){
		super(...arguments);

		this.boundOnLinkedAssetNewInstance = this.onLinkedAssetNewInstance.bind(this);
		this.currentLiveAssetLinkedAssets = null;
	}

	static createNewFile(){
		return {};
	}

	static expectedLiveAssetConstructor = Material;

	async getLiveAsset(materialJson){
		let customMapDatas = null;
		let linkedAssets = null;
		if(materialJson.map){
			const map = await editor.projectManager.assetManager.getProjectAsset(materialJson.map);
			const {mapDatas, linkedProjectAssets} = await editor.materialMapTypeManager.getDataForMapLiveAsset(map);
			customMapDatas = mapDatas;
			linkedAssets = linkedProjectAssets;
		}

		if(linkedAssets){
			for(const projectAsset of linkedAssets){
				projectAsset.onNewLiveAssetInstance(this.boundOnLinkedAssetNewInstance)
			}
		}
		this.currentLiveAssetLinkedAssets = linkedAssets;

		const material = new Material({
			customMapDatas,
		});
		return material;
	}

	destroyLiveAsset(material){
		material.destructor();
		if(this.currentLiveAssetLinkedAssets){
			for(const projectAsset of this.currentLiveAssetLinkedAssets){
				projectAsset.onNewLiveAssetInstance(this.boundOnLinkedAssetNewInstance)
			}
		}
	}

	onLinkedAssetNewInstance(){
		this.liveAssetNeedsReplacement();
	}

	async createBundledAssetData(assetSettingOverrides = {}){
		const assetData = await this.projectAsset.readAssetData();
		const mapUuid = assetData.map;
		if(!mapUuid) return "";
		const mapDatas = [];

		const mapAsset = await editor.projectManager.assetManager.getProjectAsset(mapUuid);
		const mapData = await mapAsset.readAssetData();
		for(const map of mapData.maps){
			const mapType = editor.materialMapTypeManager.getTypeByUuid(map.mapTypeId);
			const arrayBuffer = mapType.mapDataToAssetBundleBinary(map.customData);
			if(!arrayBuffer) continue;
			mapDatas.push({
				typeUuid: map.mapTypeId,
				data: arrayBuffer,
			});
		}

		return BinaryComposer.objectToBinary({
			values: [], //todo
			mapDatas: mapDatas,
		}, {
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
	}
}
