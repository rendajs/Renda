import {Mat4, Quat, Vec3, Vec4} from "../../../../../src/mod.js";
import {getRaycastRayFromScreenPos, screenToWorldPos, worldToScreenPos} from "../../../../../src/util/cameraUtil.js";

export function basicSetup() {
	const camWorldMatrix = Mat4.createPosRotScale(new Vec3(0, 0, -5), Quat.fromAxisAngle(new Vec3(0, 1, 0), 0.1), new Vec3(1, 1, 1));
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
		getRaycastRayFromScreenPos(...screenPos) {
			const vec = new Vec4(...screenPos);
			return getRaycastRayFromScreenPos(vec, camProjectionMatrix, camWorldMatrix);
		},
	});

	return {
		mockGizmoManager,
		mockPointerDevice,
		mockCamera,
	};
}
