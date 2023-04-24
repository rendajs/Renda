import "../../shared/initializeStudio.js";
import {PropertiesAssetContentGenericStructure} from "../../../../../studio/src/propertiesAssetContent/PropertiesAssetContentGenericStructure.js";
import {runWithDom, runWithDomAsync} from "../../shared/runWithDom.js";
import {assertTreeViewStructureEquals} from "../../shared/treeViewUtil.js";
import {assertEquals, assertInstanceOf, assertThrows} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls, spy, stub} from "std/testing/mock.ts";
import {createMockProjectAsset} from "../../shared/createMockProjectAsset.js";
import {PropertiesTreeViewEntry} from "../../../../../studio/src/ui/propertiesTreeView/PropertiesTreeViewEntry.js";
import {TextGui} from "../../../../../studio/src/ui/TextGui.js";
import {waitForMicrotasks} from "../../../shared/waitForMicroTasks.js";

const mockStudio = /** @type {import("../../../../../studio/src/Studio.js").Studio} */ ({});

class MockProjectAssetType {
	static getUiName() {
		return "UI name";
	}
}
const mockAssetType = /** @type {import("../../../../../studio/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny} */ (new MockProjectAssetType());

Deno.test({
	name: "Setting structure",
	fn() {
		runWithDom(() => {
			const content = new PropertiesAssetContentGenericStructure(mockStudio);
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
			const content = new PropertiesAssetContentGenericStructure(mockStudio);
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
			gui.el.value = "baz";
			gui.el.dispatchEvent(new Event("change"));

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
