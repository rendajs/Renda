import { ProjectAssetType } from "./ProjectAssetType.js";
import { AssetLoaderTypeVertexState, Mesh, VertexState } from "../../../../src/mod.js";
import { createTreeViewStructure } from "../../ui/propertiesTreeView/createStructureHelpers.js";

const propertiesAssetContentStructure = createTreeViewStructure({
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
});

// todo: better types for generics
/**
 * @extends {ProjectAssetType<VertexState, null, any>}
 */
export class ProjectAssetTypeVertexState extends ProjectAssetType {
	static type = "renda:vertexState";
	static typeUuid = "07dcd52e-03a5-4823-b343-16a142c304f6";
	static newFileName = "New Vertex State";
	static uiName = "Vertex State";

	/** @type {import("../../ui/propertiesTreeView/types.ts").PropertiesTreeViewStructure} */
	static propertiesAssetContentStructure = propertiesAssetContentStructure;

	static expectedLiveAssetConstructor = VertexState;
	static usedAssetLoaderType = AssetLoaderTypeVertexState;

	/** @type {import("../../tasks/task/TaskGenerateServices.js").AssetLoaderTypeImportConfig} */
	static assetLoaderTypeImportConfig = {
		identifier: "AssetLoaderTypeVertexState",
	};

	/**
	 * @override
	 * @param {*} fileData
	 * @returns {Promise<import("./ProjectAssetType.js").LiveAssetData<VertexState, null>>}
	 */
	async getLiveAssetData(fileData) {
		const liveAsset = new VertexState(fileData);
		return { liveAsset, studioData: null };
	}

	/**
	 * @override
	 * @param {import("../../ui/propertiesTreeView/types.ts").GetStructureValuesReturnType<typeof propertiesAssetContentStructure, {purpose: "binarySerialization"}>} data
	 */
	static transformBundledAssetData(data) {
		for (const buffer of data.buffers) {
			for (const attribute of buffer.attributes) {
				const castFormat = /** @type {keyof (typeof Mesh)["AttributeFormat"]} */ (attribute.format);
				const newFormatValue = Mesh.AttributeFormat[castFormat];
				// @ts-ignore
				attribute.format = newFormatValue;

				const castType = /** @type {keyof (typeof Mesh)["AttributeType"]} */ (attribute.attributeType);
				const newTypeValue = Mesh.AttributeType[castType];
				// @ts-ignore
				attribute.attributeType = newTypeValue;
			}
		}
		return /** @type {any} */ (data);
	}
}
