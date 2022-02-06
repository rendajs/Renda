import {assert, assertEquals} from "asserts";
import {Mat4, Vec2, Vec3} from "../../../../src/mod.js";
import {getRaycastRayFromScreenPos, worldToScreenPos} from "../../../../src/util/cameraUtil.js";

Deno.test({
	name: "worldToScreenPos, with world matrix",
	fn: () => {
		const projectionMatrix = Mat4.createPerspective(90, 0.01, 1000);
		const worldMatrix = Mat4.createTranslation(0, 1, 0);

		const pos = worldToScreenPos(new Vec3(0, 1, 1), projectionMatrix, worldMatrix);

		assertEquals([pos.x, pos.y], [0, 0]);
	},
});

Deno.test({
	name: "worldToScreenPos, no world matrix",
	fn: () => {
		const projectionMatrix = Mat4.createPerspective(90, 0.01, 1000);

		const pos = worldToScreenPos(new Vec3(0, 0, 1), projectionMatrix);

		assertEquals([pos.x, pos.y], [0, 0]);
	},
});

Deno.test({
	name: "worldToScreenPos, slightly up",
	fn: () => {
		const projectionMatrix = Mat4.createPerspective(90, 0.01, 1000);

		const pos = worldToScreenPos(new Vec3(0, 0.1, 1), projectionMatrix);

		assertEquals(pos.x, 0);
		assert(pos.y > 0, "pos.y > 0");
	},
});

Deno.test({
	name: "worldToScreenPos, slightly down",
	fn: () => {
		const projectionMatrix = Mat4.createPerspective(90, 0.01, 1000);

		const pos = worldToScreenPos(new Vec3(0, -0.1, 1), projectionMatrix);

		assertEquals(pos.x, 0);
		assert(pos.y < 0, "pos.y < 0");
	},
});

Deno.test({
	name: "worldToScreenPos, slightly left",
	fn: () => {
		const projectionMatrix = Mat4.createPerspective(90, 0.01, 1000);

		const pos = worldToScreenPos(new Vec3(-0.1, 0, 1), projectionMatrix);

		assert(pos.x < 0, "pos.x < 0");
		assertEquals(pos.y, 0);
	},
});

Deno.test({
	name: "worldToScreenPos, slightly right",
	fn: () => {
		const projectionMatrix = Mat4.createPerspective(90, 0.01, 1000);

		const pos = worldToScreenPos(new Vec3(0.1, 0, 1), projectionMatrix);

		assert(pos.x > 0, "pos.x > 0");
		assertEquals(pos.y, 0);
	},
});

Deno.test({
	name: "getRaycastRayFromScreenPos, with world matrix",
	fn: () => {
		const worldMatrix = Mat4.createTranslation(0, 1, 0);
		const projectionMatrix = Mat4.createPerspective(90, 1, 10);
		const {start, dir} = getRaycastRayFromScreenPos(new Vec2(0.5, 0.5), projectionMatrix, worldMatrix);

		assert(start.x > 0.49 && start.x < 0.51, "start.x is not near 0.5");
		assert(start.y > 1.49 && start.y < 1.51, "start.y is not near 1.5");
		assert(start.z > 0.99 && start.z < 1.01, "start.z is not near 1.0");

		assert(dir.magnitude > 0.99 && dir.magnitude < 1.01, "dir.magnitude is not normalized");

		assert(dir.x > 0.3 && dir.x < 0.5, "dir.x is not near 0.4");
		assert(dir.y > 0.3 && dir.y < 0.5, "dir.y is not near 0.4");
		assert(dir.z > 0.7 && dir.z < 0.9, "dir.z is not near 0.8");
	},
});

Deno.test({
	name: "getRaycastRayFromScreenPos, no world matrix",
	fn: () => {
		const projectionMatrix = Mat4.createPerspective(90, 1, 10);
		const {start, dir} = getRaycastRayFromScreenPos(new Vec2(0.5, 0.5), projectionMatrix);

		assert(start.x > 0.49 && start.x < 0.51, "start.x is not near 0.5");
		assert(start.y > 0.49 && start.y < 0.51, "start.y is not near 0.5");
		assert(start.z > 0.99 && start.z < 1.01, "start.z is not near 1.0");

		assert(dir.magnitude > 0.99 && dir.magnitude < 1.01, "dir.magnitude is not normalized");

		assert(dir.x > 0.3 && dir.x < 0.5, "dir.x is not near 0.4");
		assert(dir.y > 0.3 && dir.y < 0.5, "dir.y is not near 0.4");
		assert(dir.z > 0.7 && dir.z < 0.9, "dir.z is not near 0.8");
	},
});
