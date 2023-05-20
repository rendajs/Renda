import {assertEquals} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls, spy, stub} from "std/testing/mock.ts";
import {Importer} from "fake-imports";
import {castTreeView} from "../../../shared/mockTreeView/castTreeView.js";
import {Texture} from "../../../../../../src/core/Texture.js";
import {Sampler} from "../../../../../../src/rendering/Sampler.js";

const importer = new Importer(import.meta.url, {
	importMap: "../../../../../../importmap.json",
});
importer.redirectModule("../../../../../../studio/src/ui/propertiesTreeView/PropertiesTreeView.js", "../../../shared/mockTreeView/PropertiesTreeView.js");
importer.makeReal("../../../../../../src/core/Texture.js");
importer.makeReal("../../../../../../src/rendering/Sampler.js");

/** @type {import("../../../../../../studio/src/propertiesAssetContent/propertiesAssetContentMaterialMap/MaterialMapListUi.js")} */
const MaterialMapListUiImport = await importer.import("../../../../../../studio/src/propertiesAssetContent/propertiesAssetContentMaterialMap/MaterialMapListUi.js");
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

		/** @type {import("../../../../../../studio/src/ui/propertiesTreeView/types.ts").PropertiesTreeViewStructure[]} */
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
			const child = /** @type {import("../../../../../../studio/src/ui/propertiesTreeView/PropertiesTreeView.js").PropertiesTreeView} */ (mapListUi.treeView.children[i]);
			const childTreeView = castTreeView(child);
			const generateSpy = childTreeView.spy.generateFromSerializableStructureSpy;
			assertSpyCalls(generateSpy, 1);
			assertSpyCall(generateSpy, 0, {
				args: [expectedStructure],
			});
		}
	},
});

Deno.test({
	name: "setValues()",
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
					name: "texture1",
					type: "texture2d",
				},
				{
					name: "texture2",
					type: "texture2d",
				},
			],
		});

		const spies = [];
		for (const child of mapListUi.treeView.children) {
			const castChild = /** @type {import("../../../../../../studio/src/ui/propertiesTreeView/PropertiesTreeView.js").PropertiesTreeView} */ (child);
			const childTreeView = castTreeView(castChild);
			const fillSpy = spy(childTreeView, "fillSerializableStructureValues");
			spies.push(fillSpy);
		}

		mapListUi.setValues({
			num: {
				mappedName: "newNum",
				defaultValue: 3,
				visible: false,
			},
			texture1: {
				mappedName: "texture1",
				defaultValue: [0.1, 0.2, 0.3, 0.4],
			},
			texture2: {
				mappedName: "texture2",
				defaultValue: "textureAssetHash",
			},
		});

		const numSpy = spies[0];
		assertSpyCalls(numSpy, 1);
		assertSpyCall(numSpy, 0, {
			args: [
				{
					defaultValue: 3,
					mappedName: "newNum",
					visible: false,
				},
			],
		});

		const samplerSpy = spies[1];
		assertSpyCalls(samplerSpy, 0);

		const texture1Spy = spies[2];
		assertSpyCalls(texture1Spy, 1);
		assertSpyCall(texture1Spy, 0, {
			args: [
				{
					defaultColor: [0.1, 0.2, 0.3, 0.4],
					mappedName: "texture1",
				},
			],
		});

		const texture2Spy = spies[3];
		assertSpyCalls(texture2Spy, 1);
		assertSpyCall(texture2Spy, 0, {
			args: [
				{
					defaultTexture: "textureAssetHash",
					mappedName: "texture2",
				},
			],
		});
	},
});

Deno.test({
	name: "getModifiedValuesForSave()",
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
					name: "texture1",
					type: "texture2d",
				},
				{
					name: "texture2",
					type: "texture2d",
				},
			],
		});

		const castTreeViews = [];
		for (const child of mapListUi.treeView.children) {
			const castChild = /** @type {import("../../../../../../studio/src/ui/propertiesTreeView/PropertiesTreeView.js").PropertiesTreeView} */ (child);
			castTreeViews.push(castTreeView(castChild));
		}

		const [numTreeView, samplerTreeView, texture1TreeView, texture2TreeView] = castTreeViews;
		const numSpy = stub(numTreeView, "getSerializableStructureValues", () => {
			return {
				defaultValue: 1,
			};
		});
		const samplerSpy = stub(samplerTreeView, "getSerializableStructureValues", () => {
			return {
				visible: false,
			};
		});
		const texture1Spy = stub(texture1TreeView, "getSerializableStructureValues", () => {
			return {
				defaultTexture: "hash",
				defaultColor: [0.1, 0.2, 0.3, 0.4],
			};
		});
		const texture2Spy = stub(texture2TreeView, "getSerializableStructureValues", () => {
			return {
				defaultColor: [0.1, 0.2, 0.3, 0.4],
			};
		});

		const result = mapListUi.getModifiedValuesForSave();

		assertSpyCalls(numSpy, 1);
		assertSpyCalls(samplerSpy, 1);
		assertSpyCalls(texture1Spy, 1);
		assertSpyCalls(texture2Spy, 1);

		assertEquals(result, {
			num: {
				defaultValue: 1,
			},
			sampler: {
				visible: false,
			},
			texture1: {
				defaultValue: "hash",
			},
			texture2: {
				defaultValue: [0.1, 0.2, 0.3, 0.4],
			},
		});
	},
});
