import "../../../shared/initializeStudio.js";
import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {ContentWindowOutliner} from "../../../../../../studio/src/windowManagement/contentWindows/ContentWindowOutliner.js";
import {getMockArgs} from "./shared.js";
import {stub} from "std/testing/mock.ts";
import {assertEquals, assertExists, assertStrictEquals} from "std/testing/asserts.ts";
import {ENTITY_EDITOR_CONTENT_WINDOW_ID} from "../../../../../../studio/src/windowManagement/contentWindows/ContentWindowEntityEditor/ContentWindowEntityEditor.js";
import {Entity} from "../../../../../../src/mod.js";
import {assertTreeViewStructureEquals} from "../../../shared/treeViewUtil.js";
import {entityAssetRootUuidSymbol} from "../../../../../../studio/src/assets/projectAssetType/ProjectAssetTypeEntity.js";

/**
 * @typedef ContentWindowOutlinerTestContext
 * @property {ConstructorParameters<typeof ContentWindowOutliner>} args
 * @property {import("../../../../../../studio/src/windowManagement/contentWindows/ContentWindowEntityEditor/ContentWindowEntityEditor.js").ContentWindowEntityEditor[]} mockEntityEditors
 * @property {import("../../../../../../studio/src/windowManagement/contentWindows/ContentWindowEntityEditor/ContentWindowEntityEditor.js").ContentWindowEntityEditor} mockEntityEditor
 */

/**
 * @param {object} options
 * @param {number} [options.availableEntityEditors]
 * @param {(context: ContentWindowOutlinerTestContext) => void} options.fn
 */
function basictest({
	availableEntityEditors = 1,
	fn,
}) {
	installFakeDocument();
	try {
		const {args, mockWindowManager} = getMockArgs();
		/** @type {import("../../../../../../studio/src/windowManagement/contentWindows/ContentWindowEntityEditor/ContentWindowEntityEditor.js").ContentWindowEntityEditor[]} */
		const mockEntityEditors = [];
		for (let i = 0; i < availableEntityEditors; i++) {
			mockEntityEditors.push(createMockEntityEditor());
		}
		stub(mockWindowManager, "getContentWindows", function *getContentWindows(contentWindowConstructorOrId) {
			if (contentWindowConstructorOrId == ENTITY_EDITOR_CONTENT_WINDOW_ID) {
				for (const entityEditor of mockEntityEditors) {
					yield entityEditor;
				}
			}
		});
		stub(mockWindowManager, "getMostSuitableContentWindow", () => {
			return mockEntityEditors[0] || null;
		});
		fn({
			args,
			mockEntityEditors,
			mockEntityEditor: mockEntityEditors[0],
		});
	} finally {
		uninstallFakeDocument();
	}
}

function createMockEntityEditor() {
	const entityEditor = /** @type {import("../../../../../../studio/src/windowManagement/contentWindows/ContentWindowEntityEditor/ContentWindowEntityEditor.js").ContentWindowEntityEditor} */ ({
		editingEntity: new Entity(),
	});
	return entityEditor;
}

Deno.test({
	name: "Assigns no linked entity editor when none is available",
	fn() {
		basictest({
			availableEntityEditors: 0,
			fn({args}) {
				const contentWindow = new ContentWindowOutliner(...args);
				assertEquals(contentWindow.linkedEntityEditor, null);
			},
		});
	},
});

Deno.test({
	name: "Assigns the first available linked entity editor on creation",
	fn() {
		basictest({
			fn({args, mockEntityEditors}) {
				const contentWindow = new ContentWindowOutliner(...args);
				assertStrictEquals(contentWindow.linkedEntityEditor, mockEntityEditors[0]);
			},
		});
	},
});

Deno.test({
	name: "Initial treeview represents the hierarchy of the entity",
	fn() {
		basictest({
			fn({args, mockEntityEditor}) {
				mockEntityEditor.editingEntity.add(new Entity("child1"));
				const child2 = new Entity("child2");
				child2.add(new Entity("subchild1"));
				child2.add(new Entity("subchild2"));
				mockEntityEditor.editingEntity.add(child2);
				mockEntityEditor.editingEntity.add(new Entity("child3"));

				const contentWindow = new ContentWindowOutliner(...args);
				assertTreeViewStructureEquals(contentWindow.treeView, {
					name: "Entity",
					children: [
						{name: "child1"},
						{
							name: "child2",
							children: [
								{name: "subchild1"},
								{name: "subchild2"},
							],
						},
						{name: "child3"},
					],
				});
			},
		});
	},
});

Deno.test({
	name: "Linked entity assets have a link icon",
	fn() {
		basictest({
			fn({args, mockEntityEditor}) {
				const childEntity = new Entity();
				const castChildEntity = /** @type {import("../../../../../../studio/src/assets/projectAssetType/ProjectAssetTypeEntity.js").EntityWithAssetRootUuid} */ (childEntity);
				castChildEntity[entityAssetRootUuidSymbol] = "uuid";

				mockEntityEditor.editingEntity.add(childEntity);

				const contentWindow = new ContentWindowOutliner(...args);
				const childTreeView = contentWindow.treeView.children[0];
				assertExists(childTreeView);
				assertEquals(childTreeView.afterEl.childElementCount, 1);
			},
		});
	},
});
