import ProjectAssetType from "./ProjectAssetType.js";
import {AssetLoaderTypeVertexState, Mesh, VertexState} from "../../../../src/index.js";

export default class ProjectAssetTypeVertexState extends ProjectAssetType {
	static type = "JJ:vertexState";
	static typeUuid = "07dcd52e-03a5-4823-b343-16a142c304f6";
	static newFileName = "New Vertex State";

	/** @type {import("../../UI/PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewStructure} */
	static propertiesAssetContentStructure = {
		buffers: {
			type: "array",
			guiOpts: {
				arrayType: "object",
				arrayGuiOpts: {
					structure: {
						arrayStride: {
							defaultValue: "auto",
							/** @type {import("../../UI/NumericGui.js").NumericGuiOptions} */
							guiOpts: {
								min: -1,
								step: 1,
								mappedStringValues: [[-1, "auto"]],
							},
						},
						stepMode: {
							type: "dropdown",
							defaultValue: "vertex",
							guiOpts: {
								items: ["vertex", "instance"],
							},
						},
						attributes: {
							type: "array",
							guiOpts: {
								arrayType: "object",
								arrayGuiOpts: {
									structure: {
										attributeType: {
											type: "dropdown",
											guiOpts: {
												enumObject: Mesh.AttributeType,
											},
										},
										format: {
											type: "dropdown",
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
											type: "boolean",
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
			},
		},
	};

	static expectedLiveAssetConstructor = VertexState;
	static usedAssetLoaderType = AssetLoaderTypeVertexState;

	async getLiveAssetData(fileData) {
		const liveAsset = new VertexState(fileData);
		return {liveAsset};
	}
}
