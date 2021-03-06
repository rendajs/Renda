import ProjectAssetType from "./ProjectAssetType.js";
import editor from "../../editorInstance.js";
import {ShaderSource, WebGpuVertexState, Mesh} from "../../../../src/index.js";

export default class ProjectAssetTypeVertexState extends ProjectAssetType{

	static type = "JJ:vertexState";
	static typeUuid = "07dcd52e-03a5-4823-b343-16a142c304f6";
	static newFileName = "New Vertex State";

	constructor(){
		super(...arguments);
	}

	static createNewFile(){
		return {};
	}

	static propertiesAssetContentStructure = {
		buffers: {
			type: Array,
			arrayOpts: {
				type: {
					arrayStride: {
						guiOpts: {
							min: -1,
							step: 1,
							allowedStringValues: ["auto"],
							value: "auto",
						},
					},
					stepMode: {
						type: ["vertex", "instance"],
					},
					attributes: {
						type: Array,
						arrayOpts: {
							type: {
								attributeType: {
									type: Array.from(Object.keys(Mesh.AttributeTypes)),
								},
								format: {
									type: Array.from(Object.keys(Mesh.AttributeFormat)),
								},
								componentCount: {
									guiOpts: {
										min: 1,
										step: 1,
										max: 4,
									},
								},
								unsigned: {
									type: Boolean,
								},
								shaderLocation: {
									guiOpts: {
										min: 0,
										step: 1,
										allowedStringValues: ["auto"],
										value: "auto",
									},
								},
							},
						},
					},
				},
			},
		},
	};

	static expectedLiveAssetConstructor = WebGpuVertexState;

	async getLiveAssetData(fileData){
		const liveAsset = new WebGpuVertexState(fileData);
		return {liveAsset};
	}

	async fileChangedExternally(){
		this.liveAssetNeedsReplacement();
	}
}
