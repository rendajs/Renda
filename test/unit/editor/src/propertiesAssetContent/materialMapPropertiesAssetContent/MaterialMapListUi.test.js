import {assertEquals} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls} from "std/testing/mock.ts";
import {Importer} from "fake-imports";
import {castTreeView} from "../../../shared/mockTreeView/castTreeView.js";
import {Texture} from "../../../../../../src/core/Texture.js";
import {Sampler} from "../../../../../../src/rendering/Sampler.js";

const importer = new Importer(import.meta.url, {
	importMap: "../../../../../../importmap.json",
});
importer.redirectModule("../../../../../../editor/src/ui/propertiesTreeView/PropertiesTreeView.js", "../../../shared/mockTreeView/PropertiesTreeView.js");
importer.makeReal("../../../../../../src/core/Texture.js");
importer.makeReal("../../../../../../src/rendering/Sampler.js");

/** @type {import("../../../../../../editor/src/propertiesAssetContent/propertiesAssetContentMaterialMap/MaterialMapListUi.js")} */
const MaterialMapListUiImport = await importer.import("../../../../../../editor/src/propertiesAssetContent/propertiesAssetContentMaterialMap/MaterialMapListUi.js");
const {MaterialMapListUi} = MaterialMapListUiImport;

Deno.test({
	name: "Creating with zero items",
	fn() {
		const mapListUi = new MaterialMapListUi({
			items: [],
		});

		assertEquals(mapListUi.treeView.children.length, 0);
	},
});

Deno.test({
	name: "Creating with one item",
	fn() {
		const mapListUi = new MaterialMapListUi({
			items: [
				{
					name: "num",
					type: "number",
				},
				{
					name: "sampler",
					type: "sampler",
				},
				{
					name: "texture",
					type: "texture2d",
				},
			],
		});

		/** @type {import("../../../../../../editor/src/ui/propertiesTreeView/types.js").PropertiesTreeViewStructure[]} */
		const expectedStructures = [
			{
				defaultValue: {
					type: "number",
				},
				mappedName: {
					type: "string",
					guiOpts: {
						defaultValue: "num",
					},
				},
				visible: {
					type: "boolean",
					guiOpts: {
						defaultValue: true,
					},
				},
			},
			{
				defaultValue: {
					type: "droppable",
					guiOpts: {
						supportedAssetTypes: [Sampler],
					},
				},
				mappedName: {
					type: "string",
					guiOpts: {
						defaultValue: "sampler",
					},
				},
				visible: {
					type: "boolean",
					guiOpts: {
						defaultValue: true,
					},
				},
			},
			{
				defaultTexture: {
					type: "droppable",
					guiOpts: {
						supportedAssetTypes: [Texture],
					},
				},
				defaultColor: {
					type: "vec4",
				},
				mappedName: {
					type: "string",
					guiOpts: {
						defaultValue: "texture",
					},
				},
				visible: {
					type: "boolean",
					guiOpts: {
						defaultValue: true,
					},
				},
			},
		];

		assertEquals(mapListUi.treeView.children.length, expectedStructures.length);

		for (let i = 0; i < expectedStructures.length; i++) {
			const expectedStructure = expectedStructures[i];
			const child = /** @type {import("../../../../../../editor/src/ui/propertiesTreeView/PropertiesTreeView.js").PropertiesTreeView} */ (mapListUi.treeView.children[i]);
			const childTreeView = castTreeView(child);
			const generateSpy = childTreeView.spy.generateFromSerializableStructureSpy;
			assertSpyCalls(generateSpy, 1);
			assertSpyCall(generateSpy, 0, {
				args: [expectedStructure],
			});
		}
	},
});
