import {spy} from "std/testing/mock.ts";
import {EventHandler} from "../../../../src/util/EventHandler.js";

export function createMockEntityAssetManager() {
	/** @type {EventHandler<import("../../../../src/core/Entity.js").Entity, import("../../../../studio/src/assets/EntityAssetManager.js").OnTrackedEntityChangeEvent>} */
	const onChangeHandler = new EventHandler();

	const entityAssetManager = /** @type {import("../../../../studio/src/assets/EntityAssetManager.js").EntityAssetManager} */ ({
		onTrackedEntityChange(entityReference, cb) {
			onChangeHandler.addEventListener(entityReference, cb);
		},
		removeOnTrackedEntityChange(entityReference, cb) {
			onChangeHandler.removeEventListener(entityReference, cb);
		},
		updateEntity(entityInstance, changeEventType, eventSource) {},
		updateEntityTransform(entityInstance, eventSource) {},
	});
	const updateEntitySpy = spy(entityAssetManager, "updateEntity");
	const updateEntityTransformationSpy = spy(entityAssetManager, "updateEntityTransform");
	return {
		entityAssetManager, updateEntitySpy, updateEntityTransformationSpy,
		/**
		 * @param {import("../../../../src/core/Entity.js").Entity} entityReference
		 * @param {import("../../../../studio/src/assets/EntityAssetManager.js").OnTrackedEntityChangeEvent} event
		 */
		fireTrackedEntityChange(entityReference, event) {
			onChangeHandler.fireEvent(entityReference, event);
		},
	};
}
