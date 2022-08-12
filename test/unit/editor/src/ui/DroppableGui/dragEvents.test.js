import {assertEquals} from "std/testing/asserts.ts";
import {stub} from "std/testing/mock.ts";
import {DragEvent} from "fake-dom/FakeDragEvent.js";
import {createBasicGui} from "./shared.js";

const BASIC_DRAGGING_DATA_UUID = "BASIC_DRAGGING_DATA_UUID";
const VALID_DRAG_TYPE = `text/renda; dragtype=projectasset; draggingdata=${BASIC_DRAGGING_DATA_UUID}`;

Deno.test({
	name: "Valid drag event",
	fn() {
		const {gui, uninstall} = createBasicGui();

		try {
			const dragEvent = new DragEvent("dragenter");
			dragEvent.dataTransfer?.setData(VALID_DRAG_TYPE, "");
			gui.onDragEnter(dragEvent);
			assertEquals(gui.el.classList.contains("dragHovering"), true);
			assertEquals(dragEvent.defaultPrevented, true);
			assertEquals(dragEvent.dataTransfer?.dropEffect, "link");
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Valid drag event on disabled gui",
	fn() {
		const {gui, uninstall} = createBasicGui({
			guiOpts: {
				disabled: true,
			},
		});

		try {
			const dragEvent = new DragEvent("dragenter");
			dragEvent.dataTransfer?.setData(VALID_DRAG_TYPE, "");
			gui.onDragEnter(dragEvent);
			assertEquals(gui.el.classList.contains("dragHovering"), false);
			assertEquals(dragEvent.defaultPrevented, false);
			assertEquals(dragEvent.dataTransfer?.dropEffect, "none");
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Invalid drag event",
	fn() {
		const {gui, uninstall} = createBasicGui();

		try {
			const dragEvent = new DragEvent("dragenter");
			dragEvent.dataTransfer?.setData("text/renda; dragtype=rearrangingtreeview; rootuuid=someuuid", "");
			gui.onDragEnter(dragEvent);
			assertEquals(gui.el.classList.contains("dragHovering"), false);
			assertEquals(dragEvent.defaultPrevented, false);
			assertEquals(dragEvent.dataTransfer?.dropEffect, "none");
		} finally {
			uninstall();
		}
	},
});

/**
 * @param {Object} options
 * @param {boolean} [options.hasSupportedAssetType]
 */
function basicSetupForSupportedAssetTypes({
	hasSupportedAssetType = true,
} = {}) {
	class SupportedLiveAsset {}
	class NonSupportedLiveAsset {}
	const {gui, uninstall, mockDragManager} = createBasicGui({
		guiOpts: {
			supportedAssetTypes: [SupportedLiveAsset],
		},
	});

	const expectedLiveAssetConstructor = hasSupportedAssetType ? SupportedLiveAsset : NonSupportedLiveAsset;

	stub(mockDragManager, "getDraggingData", uuid => {
		if (uuid == BASIC_DRAGGING_DATA_UUID) {
			/** @type {import("../../../../../../editor/src/windowManagement/contentWindows/ProjectContentWindow.js").DraggingProjectAssetData} */
			return {
				assetType: /** @type {typeof import("../../../../../../editor/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetType} */ ({
					expectedLiveAssetConstructor,
				}),
				assetUuid: "someuuid",
				dataPopulated: true,
			};
		}
	});

	return {
		gui,
		uninstall,
	};
}

Deno.test({
	name: "Invalid drag event because the asset type is not supported",
	fn() {
		const {gui, uninstall} = basicSetupForSupportedAssetTypes({
			hasSupportedAssetType: false,
		});

		try {
			const dragEvent = new DragEvent("dragenter");
			dragEvent.dataTransfer?.setData(VALID_DRAG_TYPE, "");
			gui.onDragEnter(dragEvent);
			assertEquals(gui.el.classList.contains("dragHovering"), false);
			assertEquals(dragEvent.defaultPrevented, false);
			assertEquals(dragEvent.dataTransfer?.dropEffect, "none");
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Valid drag event with supportedAssetTypes",
	fn() {
		const {gui, uninstall} = basicSetupForSupportedAssetTypes();

		try {
			const dragEvent = new DragEvent("dragenter");
			dragEvent.dataTransfer?.setData(VALID_DRAG_TYPE, "");
			gui.onDragEnter(dragEvent);
			assertEquals(gui.el.classList.contains("dragHovering"), true);
			assertEquals(dragEvent.defaultPrevented, true);
			assertEquals(dragEvent.dataTransfer?.dropEffect, "link");
		} finally {
			uninstall();
		}
	},
});
