import {spy} from "std/testing/mock.ts";

export function createMockEntityAssetManager() {
	const entityAssetManager = /** @type {import("../../../../studio/src/assets/EntityAssetManager.js").EntityAssetManager} */ ({
		onTrackedEntityChange(entityReference, cb) {},
		removeOnTrackedEntityChange(entityReference, cb) {},
		updateEntity(entityInstance, changeEventType, eventSource) {},
		updateEntityPosition(entityInstance, eventSource) {},
	});
	const updateEntitySpy = spy(entityAssetManager, "updateEntity");
	const updateEntityTransformationSpy = spy(entityAssetManager, "updateEntityPosition");
	return {entityAssetManager, updateEntitySpy, updateEntityTransformationSpy};
}
