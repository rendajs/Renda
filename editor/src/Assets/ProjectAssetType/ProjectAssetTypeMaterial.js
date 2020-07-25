import ProjectAssetType from "./ProjectAssetType.js";
import {Shader, Material} from "../../../../src/index.js";

export default class ProjectAssetTypeMaterial extends ProjectAssetType{

	static type = "material";
	static newFileName = "New Material";

	constructor(){
		super();
	}

	static createNewFile(){
		return {};
	}

	getLiveAssetConstructor(){
		return Material;
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
