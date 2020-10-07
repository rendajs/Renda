import ProjectAssetType from "./ProjectAssetType.js";
import {Shader} from "../../../../src/index.js";
import {getNameAndExtension} from "../../Util/FileSystems/PathUtil.js";
import editor from "../../editorInstance.js";

export default class ProjectAssetTypeShader extends ProjectAssetType{

	static type = "JJ:shader";
	static typeUuid = "e7253ad6-8459-431f-ac16-609150538a24";
	static newFileName = "New Shader";
	static newFileExtension = "shader";
	static storeInProjectAsJson = false;
	static matchExtensions = ["shader", "vert", "frag"];

	constructor(){
		super(...arguments);
	}

	static createNewFile(){
		return `void main(){

}`;
	}

	static expectedLiveAssetConstructor = Shader;

	async getLiveAsset(materialJson){
		return new Shader(`
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
	}
}
