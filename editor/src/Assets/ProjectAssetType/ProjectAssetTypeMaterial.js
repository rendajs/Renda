import ProjectAssetType from "./ProjectAssetType.js";
import {Shader, Material} from "../../../../src/index.js";
import PropertiesAssetContentMaterial from "../../PropertiesAssetContent/PropertiesAssetContentMaterial.js";

export default class ProjectAssetTypeMaterial extends ProjectAssetType{

	static type = "material";
	static newFileName = "New Material";
	static propertiesAssetContentConstructor = PropertiesAssetContentMaterial;

	constructor(){
		super();
	}

	static createNewFile(){
		return {};
	}

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
}
