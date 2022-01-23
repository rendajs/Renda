import {ProjectAssetType} from "./ProjectAssetType.js";
import {AssetLoaderTypeVertexState, Mesh, VertexState} from "../../../../src/mod.js";

// todo: better types for generics
/**
 * @extends {ProjectAssetType<VertexState, null, any>}
 */
export class ProjectAssetTypeVertexState extends ProjectAssetType {
	static type = "JJ:vertexState";
	static typeUuid = "07dcd52e-03a5-4823-b343-16a142c304f6";
	static newFileName = "New Vertex State";

	/** @type {import("../../UI/propertiesTreeView/types.js").PropertiesTreeViewStructure} */
	static propertiesAssetContentStructure = {
		buffers: {
			type: "array",
			guiOpts: {
				arrayType: "object",
				arrayGuiOpts: {
					structure: {
						arrayStride: {
							type: "number",
							guiOpts: {
								min: -1,
								step: 1,
								mappedStringValues: [[-1, "auto"]],
								defaultValue: "auto",
							},
						},
						stepMode: {
							type: "dropdown",
							guiOpts: {
								items: ["vertex", "instance"],
								defaultValue: "vertex",
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
											guiOpts: {
												enumObject: Mesh.AttributeFormat,
												defaultValue: Mesh.AttributeFormat.FLOAT32,
											},
										},
										componentCount: {
											type: "number",
											guiOpts: {
												min: 1,
												step: 1,
												max: 4,
												defaultValue: 3,
											},
										},
										unsigned: {
											type: "boolean",
											guiOpts: {
												defaultValue: false,
											},
										},
										shaderLocation: {
											type: "number",
											guiOpts: {
												min: -1,
												step: 1,
												mappedStringValues: [[-1, "auto"]],
												defaultValue: "auto",
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

	/**
	 * @override
	 * @param {*} fileData
	 * @returns {Promise<import("./ProjectAssetType.js").LiveAssetData<VertexState, null>>}
	 */
	async getLiveAssetData(fileData) {
		const liveAsset = new VertexState(fileData);
		return {liveAsset};
	}
}
