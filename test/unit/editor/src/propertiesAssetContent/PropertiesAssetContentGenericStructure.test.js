import "../../shared/initializeEditor.js";
import {PropertiesAssetContentGenericStructure} from "../../../../../editor/src/propertiesAssetContent/PropertiesAssetContentGenericStructure.js";
import {runWithDom, runWithDomAsync} from "../../shared/runWithDom.js";
import {assertTreeViewStructureEquals} from "../../shared/treeViewUtil.js";
import {assertEquals, assertInstanceOf, assertThrows} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls, spy, stub} from "std/testing/mock.ts";
import {createMockProjectAsset} from "../../shared/createMockProjectAsset.js";
import {PropertiesTreeViewEntry} from "../../../../../editor/src/ui/propertiesTreeView/PropertiesTreeViewEntry.js";
import {TextGui} from "../../../../../editor/src/ui/TextGui.js";
import {waitForMicrotasks} from "../../../shared/waitForMicroTasks.js";

const mockEditor = /** @type {import("../../../../../editor/src/Editor.js").Editor} */ ({});

class MockProjectAssetType {
	static getUiName() {
		return "UI name";
	}
}
const mockAssetType = /** @type {import("../../../../../editor/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny} */ (new MockProjectAssetType());

Deno.test({
	name: "Setting structure",
	fn() {
		runWithDom(() => {
			const content = new PropertiesAssetContentGenericStructure(mockEditor);
			content.setStructure({
				foo: {
					type: "string",
				},
			}, mockAssetType);

			assertTreeViewStructureEquals(content.assetTreeView, {
				name: "UI name",
				children: [
					{
						propertiesLabel: "Foo",
					},
				],
			});

			assertThrows(() => {
				content.setStructure({
					bar: {
						type: "boolean",
					},
				}, mockAssetType);
			}, Error, "Assertion failed: structure can only be set once.");
		});
	},
});

Deno.test({
	name: "loading and saving",
	async fn() {
		await runWithDomAsync(async () => {
			const content = new PropertiesAssetContentGenericStructure(mockEditor);
			content.setStructure({
				foo: {
					type: "string",
				},
			}, mockAssetType);

			const {projectAsset: mockAsset} = createMockProjectAsset({
				readAssetDataReturnValue: {
					foo: "bar",
				},
			});
			const fillValuesSpy = spy(content.assetTreeView, "fillSerializableStructureValues");
			const writeAssetSpy = spy(mockAsset, "writeAssetData");
			const needsReplacementSpy = stub(mockAsset, "liveAssetNeedsReplacement");

			// Load the values
			await content.selectionUpdated([mockAsset]);

			assertSpyCalls(fillValuesSpy, 1);
			assertSpyCall(fillValuesSpy, 0, {
				args: [
					{
						foo: "bar",
					},
				],
			});
			assertSpyCalls(writeAssetSpy, 0);
			assertSpyCalls(needsReplacementSpy, 0);

			const entry = content.assetTreeView.children[0];
			assertInstanceOf(entry, PropertiesTreeViewEntry);
			const gui = entry.gui;
			assertInstanceOf(gui, TextGui);
			assertEquals(gui.value, "bar");

			// Update a value to cause it to save
			gui.value = "baz";

			assertSpyCalls(fillValuesSpy, 1);
			assertSpyCalls(writeAssetSpy, 1);
			assertSpyCall(writeAssetSpy, 0, {
				args: [
					{
						foo: "baz",
					},
				],
			});
			const writePromise = writeAssetSpy.calls[0].returned;
			await writePromise;
			await waitForMicrotasks();
			assertSpyCalls(needsReplacementSpy, 1);
		});
	},
});
