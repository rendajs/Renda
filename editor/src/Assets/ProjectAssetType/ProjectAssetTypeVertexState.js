import ProjectAssetType from "./ProjectAssetType.js";
import editor from "../../editorInstance.js";
import {ShaderSource, VertexState, Mesh, AssetLoaderTypeVertexState} from "../../../../src/index.js";

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
							defaultValue: "auto",
						},
					},
					stepMode: {
						type: ["vertex", "instance"],
						guiOpts: {
							defaultValue: "vertex",
						}
					},
					attributes: {
						type: Array,
						arrayOpts: {
							type: {
								attributeType: {
									type: [],
									guiOpts: {
										enumObject: Mesh.AttributeType,
									},
								},
								format: {
									type: [],
									guiOpts: {
										enumObject: Mesh.AttributeFormat,
										defaultValue: Mesh.AttributeFormat.FLOAT32,
									},
								},
								componentCount: {
									guiOpts: {
										min: 1,
										step: 1,
										max: 4,
										defaultValue: 3,
									},
								},
								unsigned: {
									type: Boolean,
									defaultValue: false,
								},
								shaderLocation: {
									guiOpts: {
										min: 0,
										step: 1,
										allowedStringValues: ["auto"],
										defaultValue: "auto",
									},
								},
							},
						},
					},
				},
			},
		},
	};

	static expectedLiveAssetConstructor = VertexState;

	async getLiveAssetData(fileData){
		const liveAsset = new VertexState(fileData);
		return {liveAsset};
	}

	async fileChangedExternally(){
		this.liveAssetNeedsReplacement();
	}

	static usedAssetLoaderType = AssetLoaderTypeVertexState;
}
