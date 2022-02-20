import {Mat4} from "../../../../../src/mod.js";
import {screenToWorldPos, worldToScreenPos} from "../../../../../src/util/cameraUtil.js";

export function basicSetup() {
	const camWorldMatrix = Mat4.createTranslation(0, 0, -5);
	const camProjectionMatrix = Mat4.createPerspective(90, 0.01, 1000);
	const mockGizmoManager = /** @type {import("../../../../../src/mod.js").GizmoManager} */ ({});
	const mockPointerDevice = /** @type {import("../../../../../src/gizmos/GizmoPointerDevice.js").GizmoPointerDevice} */ ({});
	const mockCamera = /** @type {import("../../../../../src/mod.js").CameraComponent} */ ({
		worldToScreenPos(pos) {
			return worldToScreenPos(pos, camProjectionMatrix, camWorldMatrix);
		},
		screenToWorldPos(pos) {
			return screenToWorldPos(pos, camProjectionMatrix, camWorldMatrix);
		},
	});

	return {
		mockGizmoManager,
		mockPointerDevice,
		mockCamera,
	};
}
