import ProjectAssetType from "./ProjectAssetType.js";
import {Shader, Material} from "../../../../src/index.js";
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
	}

	static createNewFile(){
		return {};
	}

	static expectedLiveAssetConstructor = Material;

	async getLiveAsset(materialJson){
		const shader = new Shader(`
			attribute vec4 aVertexPosition;

			uniform mat4 uMvpMatrix;

			varying lowp vec4 vColor;

			void main() {
			  gl_Position = uMvpMatrix * aVertexPosition;
			  vColor = aVertexPosition;
			}
		`,`
			varying lowp vec4 vColor;

			void main() {
				gl_FragColor = vec4(abs(vColor).rgb, 1.0);
			}
		`);
		const material = new Material(shader);
		return material;
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
			const arrayBuffer = mapType.mapDataToAssetBundleBinary(map.mapData);
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
