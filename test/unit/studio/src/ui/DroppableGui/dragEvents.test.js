import { assertEquals, assertStrictEquals } from "std/testing/asserts.ts";
import { assertSpyCalls, spy, stub } from "std/testing/mock.ts";
import { DragEvent } from "fake-dom/FakeDragEvent.js";
import { BASIC_ASSET_UUID_FOR_SETTING, basicSetupForSettingByUuid, createBasicGui } from "./shared.js";
import { ProjectAssetType } from "../../../../../../studio/src/assets/projectAssetType/ProjectAssetType.js";
import { DroppableGui } from "../../../../../../studio/src/ui/DroppableGui.js";
import { waitForMicrotasks } from "../../../../../../src/util/waitForMicroTasks.js";
import { assertIsType, testTypes } from "../../../../shared/typeAssertions.js";

const BASIC_DRAGGING_DATA_UUID = "BASIC_DRAGGING_DATA_UUID";
const VALID_DRAG_TYPE = `text/renda; dragtype=projectasset; draggingdata=${BASIC_DRAGGING_DATA_UUID}`;

Deno.test({
	name: "Valid drag event",
	async fn() {
		const { gui, mockDragManager, mockProjectAsset, mockAssetManager, uninstall } = await basicSetupForSettingByUuid();

		try {
			stub(mockDragManager, "getDraggingData", (uuid) => {
				if (uuid == BASIC_DRAGGING_DATA_UUID) {
					return { assetUuid: BASIC_ASSET_UUID_FOR_SETTING };
				}
			});
			const makePersistentSpy = spy(mockAssetManager, "makeAssetUuidPersistent");

			const dragEvent = new DragEvent("dragenter");
			dragEvent.dataTransfer?.setData(VALID_DRAG_TYPE, "");
			gui.el.dispatchEvent(dragEvent);
			assertEquals(gui.el.classList.contains("drag-hovering"), true);
			assertEquals(dragEvent.defaultPrevented, true);
			assertEquals(dragEvent.dataTransfer?.dropEffect, "link");

			const dropEvent = new DragEvent("drop");
			dropEvent.dataTransfer?.setData(VALID_DRAG_TYPE, "");
			gui.el.dispatchEvent(dropEvent);

			await waitForMicrotasks();

			assertSpyCalls(makePersistentSpy, 1);
			assertStrictEquals(makePersistentSpy.calls[0].args[0], mockProjectAsset);
			assertEquals(gui.value, BASIC_ASSET_UUID_FOR_SETTING);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Valid drag event on disabled gui",
	fn() {
		const { gui, uninstall } = createBasicGui({
			guiOpts: {
				disabled: true,
			},
		});

		try {
			const dragEvent = new DragEvent("dragenter");
			dragEvent.dataTransfer?.setData(VALID_DRAG_TYPE, "");
			gui.onDragEnter(dragEvent);
			assertEquals(gui.el.classList.contains("drag-hovering"), false);
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
		const { gui, uninstall } = createBasicGui();

		try {
			const dragEvent = new DragEvent("dragenter");
			dragEvent.dataTransfer?.setData("text/renda; dragtype=rearrangingtreeview; rootuuid=someuuid", "");
			gui.onDragEnter(dragEvent);
			assertEquals(gui.el.classList.contains("drag-hovering"), false);
			assertEquals(dragEvent.defaultPrevented, false);
			assertEquals(dragEvent.dataTransfer?.dropEffect, "none");
		} finally {
			uninstall();
		}
	},
});

/**
 * @param {object} options
 * @param {"none" | "live-asset" | "project-asset-type" | "project-asset-type-without-liveasset"} [options.supportedAssetType]
 * @param {boolean} [options.draggingDataHasSupportedAssetType]
 */
function basicSetupForSupportedAssetTypes({
	supportedAssetType = "live-asset",
	draggingDataHasSupportedAssetType = true,
} = {}) {
	class SupportedLiveAsset {}
	class UnsupportedLiveAsset {}

	/** @extends {ProjectAssetType<SupportedLiveAsset, unknown, string>} */
	class SupportedExtendedProjectAssetType extends ProjectAssetType {
		static expectedLiveAssetConstructor = SupportedLiveAsset;
	}

	/** @extends {ProjectAssetType<UnsupportedLiveAsset, unknown, string>} */
	class UnsupportedExtendedProjectAssetType extends ProjectAssetType {
		static expectedLiveAssetConstructor = UnsupportedLiveAsset;
	}

	/** @extends {ProjectAssetType<unknown, unknown, string>} */
	class NoLiveAssetExtendedProjectAssetType extends ProjectAssetType {}

	/** @type {any[]} */
	let supportedAssetTypes = [];
	if (supportedAssetType == "live-asset") {
		supportedAssetTypes = [SupportedLiveAsset];
	} else if (supportedAssetType == "project-asset-type") {
		supportedAssetTypes = [SupportedExtendedProjectAssetType];
	} else if (supportedAssetType == "project-asset-type-without-liveasset") {
		supportedAssetTypes = [NoLiveAssetExtendedProjectAssetType];
	}

	/** @type {typeof ProjectAssetType?} */
	let getDraggingDataAssetType = null;
	if (supportedAssetType == "none" || supportedAssetType == "live-asset") {
		getDraggingDataAssetType = /** @type {typeof ProjectAssetType} */ ({
			expectedLiveAssetConstructor: draggingDataHasSupportedAssetType ? SupportedLiveAsset : UnsupportedLiveAsset,
		});
	} else if (supportedAssetType == "project-asset-type") {
		if (draggingDataHasSupportedAssetType) {
			getDraggingDataAssetType = /** @type {typeof ProjectAssetType} */ (SupportedExtendedProjectAssetType);
		} else {
			getDraggingDataAssetType = /** @type {typeof ProjectAssetType} */ (UnsupportedExtendedProjectAssetType);
		}
	} else if (supportedAssetType == "project-asset-type-without-liveasset") {
		getDraggingDataAssetType = /** @type {typeof ProjectAssetType} */ (NoLiveAssetExtendedProjectAssetType);
	}
	const { gui, uninstall, mockDragManager } = createBasicGui({
		guiOpts: {
			supportedAssetTypes,
		},
	});

	stub(mockDragManager, "getDraggingData", (uuid) => {
		if (uuid == BASIC_DRAGGING_DATA_UUID) {
			/** @type {import("../../../../../../studio/src/windowManagement/contentWindows/ContentWindowProject.js").DraggingProjectAssetData} */
			return {
				assetType: getDraggingDataAssetType,
				assetUuid: "someuuid",
				dataPopulated: true,
			};
		}
	});

	function triggerDragEvent() {
		const dragEvent = new DragEvent("dragenter");
		dragEvent.dataTransfer?.setData(VALID_DRAG_TYPE, "");
		gui.onDragEnter(dragEvent);
		return dragEvent;
	}

	/**
	 * @param {DragEvent} dragEvent
	 * @param {boolean} isHovering
	 */
	function assertIsDragHovering(dragEvent, isHovering) {
		assertEquals(gui.el.classList.contains("drag-hovering"), isHovering);
		assertEquals(dragEvent.defaultPrevented, isHovering);
		assertEquals(dragEvent.dataTransfer?.dropEffect, isHovering ? "link" : "none");
	}

	return {
		gui,
		triggerDragEvent,
		assertIsDragHovering,
		uninstall,
	};
}

Deno.test({
	name: "Invalid drag event because the asset type is not supported, asset type is live asset",
	fn() {
		const { triggerDragEvent, assertIsDragHovering, uninstall } = basicSetupForSupportedAssetTypes({
			draggingDataHasSupportedAssetType: false,
		});

		try {
			const dragEvent = triggerDragEvent();
			assertIsDragHovering(dragEvent, false);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Valid drag event with supportedAssetTypes",
	fn() {
		const { triggerDragEvent, assertIsDragHovering, uninstall } = basicSetupForSupportedAssetTypes();

		try {
			const dragEvent = triggerDragEvent();
			assertIsDragHovering(dragEvent, true);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Invalid drag event because the asset type is not supported, asset type is ProjectAssetType",
	fn() {
		const { triggerDragEvent, assertIsDragHovering, uninstall } = basicSetupForSupportedAssetTypes({
			draggingDataHasSupportedAssetType: false,
			supportedAssetType: "project-asset-type",
		});

		try {
			const dragEvent = triggerDragEvent();
			assertIsDragHovering(dragEvent, false);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Valid drag event with supported ProjectAssetType",
	fn() {
		const { triggerDragEvent, assertIsDragHovering, uninstall } = basicSetupForSupportedAssetTypes({
			draggingDataHasSupportedAssetType: true,
			supportedAssetType: "project-asset-type",
		});

		try {
			const dragEvent = triggerDragEvent();
			assertIsDragHovering(dragEvent, true);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Valid drag event with supported ProjectAssetType without a liveasset",
	fn() {
		const { triggerDragEvent, assertIsDragHovering, uninstall } = basicSetupForSupportedAssetTypes({
			draggingDataHasSupportedAssetType: true,
			supportedAssetType: "project-asset-type-without-liveasset",
		});

		try {
			const dragEvent = triggerDragEvent();
			assertIsDragHovering(dragEvent, true);
		} finally {
			uninstall();
		}
	},
});

testTypes({
	name: "getValue() has the correct return types",
	fn() {
		class LiveAsset {
			someMethodNotOnTheProjectAssetType() {}
		}
		/** @extends {ProjectAssetType<LiveAsset, null, string>} */
		class ExtendedProjectAssetType extends ProjectAssetType {
			static expectedLiveAssetConstructor = LiveAsset;

			someMethodNotOnTheLiveAsset() {}
		}

		// A gui with a live asset constructor as supported asset type.
		const gui1 = DroppableGui.of({
			supportedAssetTypes: [LiveAsset],
		});

		const uuidOrNull = /** @type {import("../../../../../../src/mod.js").UuidString | null} */ ("");
		const liveAssetOrNull = /** @type {LiveAsset | null} */ (null);

		const val1 = gui1.getValue();
		// Verify that the type is a `UuidString | null` and nothing else
		assertIsType(uuidOrNull, val1);
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType(true, val1);
		// Verify that the union contains `UuidString`
		assertIsType(val1, "");
		// Verify that the union contains `null`
		assertIsType(val1, null);

		const val2 = gui1.getValue({
			returnLiveAsset: true,
		});
		// Verify that the type is a `LiveAsset | null` and nothing else
		assertIsType(liveAssetOrNull, val2);
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType(true, val2);
		// Verify that the union contains `LiveAsset`
		assertIsType(val2, new LiveAsset());
		// Verify that the union contains `null`
		assertIsType(val2, null);

		// A gui with a ProjectAssetType constructor as supported asset type.
		const gui2 = DroppableGui.of({
			supportedAssetTypes: [ExtendedProjectAssetType],
		});

		const val3 = gui2.getValue();
		// Verify that the type is a `UuidString | null` and nothing else
		assertIsType(uuidOrNull, val3);
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType(true, val3);
		// Verify that the union contains `UuidString`
		assertIsType(val3, "");
		// Verify that the union contains `null`
		assertIsType(val3, null);

		const val4 = gui2.getValue({
			returnLiveAsset: true,
		});
		// Verify that the type is a `LiveAsset | null` and nothing else
		assertIsType(liveAssetOrNull, val4);
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType(true, val4);
		// Verify that the union contains `LiveAsset`
		assertIsType(val4, new LiveAsset());
		// Verify that the union contains `null`
		assertIsType(val4, null);
	},
});
