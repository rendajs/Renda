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

	static propertiesAssetContentStructure = {
		buffers: {
			type: Array,
			arrayOpts: {
				type: {
					arrayStride: {
						defaultValue: "auto",
						guiOpts: {
							min: -1,
							step: 1,
							mappedStringValues: [[-1, "auto"]],
						},
					},
					stepMode: {
						type: ["vertex", "instance"],
						defaultValue: "vertex",
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
									defaultValue: Mesh.AttributeFormat.FLOAT32,
									guiOpts: {
										enumObject: Mesh.AttributeFormat,
									},
								},
								componentCount: {
									defaultValue: 3,
									guiOpts: {
										min: 1,
										step: 1,
										max: 4,
									},
								},
								unsigned: {
									type: Boolean,
									defaultValue: false,
								},
								shaderLocation: {
									defaultValue: "auto",
									guiOpts: {
										min: -1,
										step: 1,
										mappedStringValues: [[-1, "auto"]],
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
	static usedAssetLoaderType = AssetLoaderTypeVertexState;

	async getLiveAssetData(fileData){
		const liveAsset = new VertexState(fileData);
		return {liveAsset};
	}
}
