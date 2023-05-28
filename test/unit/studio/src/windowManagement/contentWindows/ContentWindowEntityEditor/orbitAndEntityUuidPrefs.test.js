import {BASIC_ENTITY_PATH, BASIC_ENTITY_UUID, basicTest} from "./shared.js";
import {ContentWindowEntityEditor} from "../../../../../../../studio/src/windowManagement/contentWindows/ContentWindowEntityEditor/ContentWindowEntityEditor.js";
import {assertSpyCalls} from "std/testing/mock.ts";
import {FakeTime} from "std/testing/time.ts";
import {createMockProjectAsset} from "../../../../shared/createMockProjectAsset.js";
import {assertEquals, assertExists, assertStrictEquals} from "std/testing/asserts.ts";
import {Entity, Quat} from "../../../../../../../src/mod.js";
import {assertQuatAlmostEquals, assertVecAlmostEquals} from "../../../../../shared/asserts.js";

Deno.test({
	name: "last loaded entity and orbit controls are saved and loaded",
	async fn() {
		const {args, preferencesFlushSpy, getProjectAssetFromUuidResults, assetManager, uninstall} = basicTest();
		const time = new FakeTime();
		try {
			const entity = new Entity("editing entity");
			assetManager.entityAssetManager.setLinkedAssetUuid(entity, BASIC_ENTITY_UUID);

			const {projectAsset: entityProjectAsset} = createMockProjectAsset({
				uuid: BASIC_ENTITY_UUID,
				path: BASIC_ENTITY_PATH,
				liveAsset: entity,
			});
			getProjectAssetFromUuidResults.set(BASIC_ENTITY_UUID, entityProjectAsset);
			const contentWindow1 = new ContentWindowEntityEditor(...args);
			contentWindow1.setProjectPreferencesLocationData({});

			await contentWindow1.loadEntityAsset(BASIC_ENTITY_UUID, false);
			assertSpyCalls(preferencesFlushSpy, 1);
			assertEquals(contentWindow1.editingEntityUuid, BASIC_ENTITY_UUID);
			// Wait for the entity to load
			await time.runMicrotasks();
			assertEquals(contentWindow1.editingEntity.name, "editing entity");

			// Orbit controls should not be saved when nothing has changed
			contentWindow1.loop();
			await time.tickAsync(10_000);
			contentWindow1.loop();
			assertSpyCalls(preferencesFlushSpy, 1);

			const newLookRot = Quat.fromAxisAngle(0, 1, 0, Math.PI);

			contentWindow1.orbitControls.lookPos.set(1, 2, 3);
			contentWindow1.orbitControls.lookRot.set(newLookRot);
			contentWindow1.orbitControls.lookDist = 123;
			contentWindow1.loop();
			await time.tickAsync(10_000);
			contentWindow1.loop();
			assertSpyCalls(preferencesFlushSpy, 2);

			const preferencesData = contentWindow1.getProjectPreferencesLocationData();
			assertExists(preferencesData);
			contentWindow1.destructor();

			const contentWindow2 = new ContentWindowEntityEditor(...args);
			contentWindow2.setProjectPreferencesLocationData(preferencesData);
			// Wait for the entity to load
			await time.runMicrotasks();
			assertEquals(contentWindow1.editingEntityUuid, BASIC_ENTITY_UUID);
			assertEquals(contentWindow1.editingEntity.name, "editing entity");

			assertVecAlmostEquals(contentWindow2.orbitControls.lookPos, [1, 2, 3]);
			assertQuatAlmostEquals(contentWindow2.orbitControls.lookRot, newLookRot);
			assertEquals(contentWindow2.orbitControls.lookDist, 123);
		} finally {
			uninstall();
			time.restore();
		}
	},
});

Deno.test({
	name: "Orbit controls are not saved when editing a non project entity",
	async fn() {
		const {args, preferencesFlushSpy, uninstall} = basicTest();
		const time = new FakeTime();
		try {
			const contentWindow = new ContentWindowEntityEditor(...args);
			contentWindow.setProjectPreferencesLocationData({});

			// Orbit controls should not be saved when nothing has changed
			contentWindow.loop();
			await time.tickAsync(10_000);
			contentWindow.loop();

			const newLookRot = Quat.fromAxisAngle(0, 1, 0, Math.PI);

			contentWindow.orbitControls.lookPos.set(1, 2, 3);
			contentWindow.orbitControls.lookRot.set(newLookRot);
			contentWindow.orbitControls.lookDist = 123;
			contentWindow.loop();
			await time.tickAsync(10_000);
			contentWindow.loop();
			assertSpyCalls(preferencesFlushSpy, 0);

			// Double check that no preferences have been touched, otherwise they might
			// get written once preferences get flushed somewhere else.
			const preferencesData = contentWindow.getProjectPreferencesLocationData();
			assertEquals(preferencesData, null);
			contentWindow.destructor();
		} finally {
			uninstall();
			time.restore();
		}
	},
});
