import { assert, assertEquals, assertExists, assertStrictEquals, assertThrows } from "std/testing/asserts.ts";
import { GizmoManager } from "../../../../src/gizmos/GizmoManager.js";
import { screenSpaceToDomSpace } from "../../../../src/util/cameraUtil.js";
import { HtmlElement } from "fake-dom/FakeHtmlElement.js";
import { PointerEvent } from "fake-dom/FakePointerEvent.js";
import { installMockGetComputedStyle, uninstallMockGetComputedStyle } from "fake-dom/mockGetComputedStyle.js";
import { Gizmo, getFakeEngineAssetsManager, initBasicSetup } from "./shared.js";
import { Sphere } from "../../../../src/mod.js";

class ExtendedGizmo extends Gizmo {
}

Deno.test({
	name: "Adding a gizmo",
	fn: () => {
		const manager = new GizmoManager(getFakeEngineAssetsManager());
		const gizmo = manager.addGizmo(ExtendedGizmo);

		assert(gizmo instanceof ExtendedGizmo, "gizmo is not an instance of ExtendedGizmo");
		assertStrictEquals(gizmo.entity.parent, manager.entity);
		assertEquals(manager.gizmos.size, 1);
	},
});

Deno.test({
	name: "Removing a gizmo",
	fn: () => {
		const manager = new GizmoManager(getFakeEngineAssetsManager());
		const gizmo = manager.addGizmo(ExtendedGizmo);
		manager.removeGizmo(gizmo);

		const castGizmo = /** @type {import("./shared.js").FakeGizmo} */(gizmo);
		assertEquals(castGizmo.destructorCalled, true);
		assertEquals(manager.gizmos.size, 0);
	},
});

Deno.test({
	name: "Destructor should remove all gizmos",
	fn() {
		const manager = new GizmoManager(getFakeEngineAssetsManager());
		const gizmo1 = manager.addGizmo(ExtendedGizmo);
		const gizmo2 = manager.addGizmo(ExtendedGizmo);

		manager.destructor();

		const castGizmo1 = /** @type {import("./shared.js").FakeGizmo} */(gizmo1);
		assertEquals(castGizmo1.destructorCalled, true);
		const castGizmo2 = /** @type {import("./shared.js").FakeGizmo} */(gizmo2);
		assertEquals(castGizmo2.destructorCalled, true);
		assertEquals(manager.gizmos.size, 0);
	},
});

Deno.test({
	name: "raycastDraggables()",
	fn() {
		const { manager, draggable, cam } = initBasicSetup();
		const screenPos = draggable.getScreenPos(cam);

		const hit1 = manager.raycastDraggables(cam, screenPos);
		assertStrictEquals(hit1, draggable);

		const draggable2 = manager.createDraggable("move");
		const sphere = new Sphere();
		draggable2.addRaycastShape(sphere);

		const hit2 = manager.raycastDraggables(cam, screenPos);
		assertStrictEquals(hit2, draggable);

		manager.removeDraggable(draggable2);

		const hit3 = manager.raycastDraggables(cam, screenPos);
		assertStrictEquals(hit3, draggable);
	},
});

Deno.test({
	name: "requestPointerDevice()",
	fn() {
		const { manager } = initBasicSetup();
		const pointer = manager.requestPointerDevice();

		assertExists(pointer);
		assertEquals(manager.pointerDevices.size, 1);
	},
});

Deno.test({
	name: "destroyPointerDevice()",
	fn() {
		const { manager } = initBasicSetup();
		const pointer = manager.requestPointerDevice();
		manager.destroyPointerDevice(pointer);

		assertEquals(manager.pointerDevices.size, 0);
	},
});

Deno.test({
	name: "addPointerEventListeners",
	fn() {
		installMockGetComputedStyle();

		const { manager, draggable, cam } = initBasicSetup();
		const screenPos = draggable.getScreenPos(cam);
		const el = new HtmlElement({
			clientWidth: 100,
			clientHeight: 100,
		});
		const screenPosElemSpace = screenSpaceToDomSpace(el, screenPos);

		manager.addPointerEventListeners(el, cam);

		const moveEvent1 = new PointerEvent("pointermove", {
			clientX: 0,
			clientY: 0,
		});
		el.dispatchEvent(moveEvent1);

		const moveEvent2 = new PointerEvent("pointermove", {
			clientX: screenPosElemSpace.x,
			clientY: screenPosElemSpace.y,
		});
		el.dispatchEvent(moveEvent2);

		assertEquals(draggable.isHovering, true);

		const moveEvent3 = new PointerEvent("pointermove", {
			clientX: 0,
			clientY: 0,
		});
		el.dispatchEvent(moveEvent3);

		assertEquals(draggable.isHovering, false);

		uninstallMockGetComputedStyle();
	},
});

Deno.test({
	name: "addPointerEventListeners should throw when already added",
	fn() {
		const { manager, cam } = initBasicSetup();
		const el = new HtmlElement();

		manager.addPointerEventListeners(el, cam);
		assertThrows(() => {
			manager.addPointerEventListeners(el, cam);
		});
	},
});

Deno.test({
	name: "removePointerEventListeners while hovering stops the hover",
	fn() {
		installMockGetComputedStyle();

		const { manager, draggable, cam } = initBasicSetup();
		const screenPos = draggable.getScreenPos(cam);
		const el = new HtmlElement({
			clientWidth: 100,
			clientHeight: 100,
		});
		const screenPosElemSpace = screenSpaceToDomSpace(el, screenPos);

		manager.addPointerEventListeners(el, cam);

		const moveEvent1 = new PointerEvent("pointermove", {
			clientX: 0,
			clientY: 0,
		});
		el.dispatchEvent(moveEvent1);

		const moveEvent2 = new PointerEvent("pointermove", {
			clientX: screenPosElemSpace.x,
			clientY: screenPosElemSpace.y,
		});
		el.dispatchEvent(moveEvent2);

		assertEquals(draggable.isHovering, true);

		manager.removePointerEventListeners(el);

		assertEquals(draggable.isHovering, false);

		uninstallMockGetComputedStyle();
	},
});

Deno.test({
	name: "gizmoNeedsRender() should fire onGizmoNeedsRender() callbacks",
	fn() {
		const manager = new GizmoManager(getFakeEngineAssetsManager());
		const mockGizmo = new ExtendedGizmo();

		/** @type {unknown[]} */
		const calls = [];
		manager.onGizmoNeedsRender((gizmo) => {
			calls.push(gizmo);
		});

		manager.gizmoNeedsRender(mockGizmo);

		assertEquals(calls.length, 1);
		assertStrictEquals(calls[0], mockGizmo);
	},
});

Deno.test({
	name: "gizmoNeedsRender() should not fire removed callbacks",
	fn() {
		const manager = new GizmoManager(getFakeEngineAssetsManager());
		const mockGizmo = new ExtendedGizmo();

		const calls = [];
		/** @type {import("../../../../src/gizmos/GizmoManager.js").OnGizmoNeedsRenderCb} */
		const cb = (gizmo) => {
			calls.push(gizmo);
		};
		manager.onGizmoNeedsRender(cb);
		manager.removeOnGizmoNeedsRender(cb);

		manager.gizmoNeedsRender(mockGizmo);

		assertEquals(calls.length, 0);
	},
});
