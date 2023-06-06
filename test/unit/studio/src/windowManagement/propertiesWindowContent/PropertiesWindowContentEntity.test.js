import {getMockArgs} from "./shared.js";
import {PropertiesWindowContentEntity} from "../../../../../../studio/src/propertiesWindowContent/PropertiesWindowContentEntity.js";
import {runWithDomAsync} from "../../../shared/runWithDom.js";
import {waitForMicrotasks} from "../../../../shared/waitForMicroTasks.js";
import {Entity} from "../../../../../../src/mod.js";
import {createMockEntityAssetManager} from "../../../shared/createMockEntityAssetManager.js";
import {assertVecAlmostEquals} from "../../../../shared/asserts.js";
import {assertSpyCalls} from "std/testing/mock.ts";
import {assertStrictEquals} from "std/testing/asserts.ts";

function basicWindowWithEntity() {
	const {args, mockStudioInstance, mockWindowManager} = getMockArgs();
	mockWindowManager.getContentWindows = function *() {};

	const assetManager = /** @type {import("../../../../../../studio/src/assets/AssetManager.js").AssetManager} */ ({});
	const entityAssetManagerMocks = createMockEntityAssetManager();
	assetManager.entityAssetManager = entityAssetManagerMocks.entityAssetManager;

	mockStudioInstance.projectManager = /** @type {import("../../../../../../studio/src/projectSelector/ProjectManager.js").ProjectManager} */ ({
		assetManager,
	});
	const windowContent = new PropertiesWindowContentEntity(...args);

	const rootEntity = new Entity("root");
	const child = rootEntity.add(new Entity("child"));

	windowContent.activeObjectsChanged([
		{
			entity: child,
			metaData: /** @type {any} */ ({}),
		},
	]);
	return {windowContent, rootEntity, child, entityAssetManagerMocks};
}

Deno.test({
	name: "Changing position changes the position",
	async fn() {
		await runWithDomAsync(async () => {
			const {windowContent, child, entityAssetManagerMocks} = basicWindowWithEntity();

			const updateSpy = entityAssetManagerMocks.updateEntityTransformationSpy;
			windowContent.positionProperty.gui.numericGuis[0].el.value = "1";
			windowContent.positionProperty.gui.numericGuis[0].el.dispatchEvent(new Event("input"));

			assertVecAlmostEquals(child.pos, [1, 0, 0]);
			assertSpyCalls(updateSpy, 1);
			assertStrictEquals(updateSpy.calls[0].args[0], child);
			assertStrictEquals(updateSpy.calls[0].args[1], windowContent);

			await waitForMicrotasks();
		});
	},
});

Deno.test({
	name: "Changing rotation changes the rotation",
	async fn() {
		await runWithDomAsync(async () => {
			const {windowContent, child, entityAssetManagerMocks} = basicWindowWithEntity();

			const updateSpy = entityAssetManagerMocks.updateEntityTransformationSpy;
			windowContent.rotationProperty.gui.numericGuis[0].el.value = "1";
			windowContent.rotationProperty.gui.numericGuis[0].el.dispatchEvent(new Event("input"));

			assertVecAlmostEquals(child.rot.toAxisAngle(), [1, 0, 0]);
			assertSpyCalls(updateSpy, 1);
			assertStrictEquals(updateSpy.calls[0].args[0], child);
			assertStrictEquals(updateSpy.calls[0].args[1], windowContent);

			await waitForMicrotasks();
		});
	},
});

Deno.test({
	name: "Changing scale changes the scale",
	async fn() {
		await runWithDomAsync(async () => {
			const {windowContent, child, entityAssetManagerMocks} = basicWindowWithEntity();

			const updateSpy = entityAssetManagerMocks.updateEntityTransformationSpy;
			windowContent.scaleProperty.gui.numericGuis[0].el.value = "2";
			windowContent.scaleProperty.gui.numericGuis[0].el.dispatchEvent(new Event("input"));

			assertVecAlmostEquals(child.scale, [2, 1, 1]);
			assertSpyCalls(updateSpy, 1);
			assertStrictEquals(updateSpy.calls[0].args[0], child);
			assertStrictEquals(updateSpy.calls[0].args[1], windowContent);

			await waitForMicrotasks();
		});
	},
});
