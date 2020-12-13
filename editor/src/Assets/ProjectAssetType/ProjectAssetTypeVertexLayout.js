import ProjectAssetType from "./ProjectAssetType.js";
import editor from "../../editorInstance.js";
import {ShaderSource, WebGpuVertexLayout} from "../../../../src/index.js";

export default class ProjectAssetTypeVertexLayout extends ProjectAssetType{

	static type = "JJ:vertexLayout";
	static typeUuid = "07dcd52e-03a5-4823-b343-16a142c304f6";
	static newFileName = "New Vertex Layout";

	constructor(){
		super(...arguments);
	}

	static createNewFile(){
		return {};
	}

	static propertiesAssetContentStructure = {
		indexFormat: {
			type: ["none", "16-bit", "32-bit"],
		},
		vertexBuffers: {
			type: Array,
			arrayOpts: {
				type: {
					arrayStride: {
						guiOpts: {
							min: 0,
							step: 1,
						},
					},
					stepMode: {
						type: ["vertex", "instance"],
					},
					attributes: {
						type: Array,
						arrayOpts: {
							type: {
								format: {
									type: ["int8", "int16", "int32", "float16", "float32"],
								},
								components: {
									guiOpts: {
										min: 1,
										step: 1,
										max: 4,
									},
								},
								unsigned: {
									type: Boolean,
								},
								normalized: {
									type: Boolean,
								},
								shaderLocation: {
									guiOpts: {
										min: 0,
										step: 1,
									},
								},
							},
						},
					},
				},
			},
		},
	};

	static expectedLiveAssetConstructor = WebGpuVertexLayout;

	async getLiveAsset(fileData){
		return new WebGpuVertexLayout();
	}

	async fileChangedExternally(){
		this.liveAssetNeedsReplacement();
	}
}
