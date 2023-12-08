import {assertEquals, assertNotEquals} from "std/testing/asserts.ts";
import {CameraComponent, Entity, Vec2, Vec3} from "../../../../../src/mod.js";
import {assertAlmostEquals, assertVecAlmostEquals} from "../../../shared/asserts.js";

Deno.test({
	name: "updateProjectionMatrixIfEnabled, autoUpdateProjectionMatrix is true",
	fn: () => {
		const cam = new CameraComponent({
			autoUpdateProjectionMatrix: true,
		});
		cam.updateProjectionMatrixIfEnabled();

		assertNotEquals(cam.projectionMatrix.getFlatArray(), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
	},
});

Deno.test({
	name: "updateProjectionMatrixIfEnabled, autoUpdateProjectionMatrix is false",
	fn: () => {
		const cam = new CameraComponent({
			autoUpdateProjectionMatrix: false,
		});
		cam.updateProjectionMatrixIfEnabled();

		assertEquals(cam.projectionMatrix.getFlatArray(), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
	},
});

Deno.test({
	name: "worldToScreenPos, should update the projection matrix",
	fn: () => {
		const entity = new Entity();
		entity.pos.set(0, 1, 0);
		const cam = entity.addComponent(CameraComponent);

		cam.worldToScreenPos(new Vec3(0, 1, 1));

		assertNotEquals(cam.projectionMatrix.getFlatArray(), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
	},
});

Deno.test({
	name: "worldToScreenPos, with entity",
	fn: () => {
		const entity = new Entity();
		entity.pos.set(0, 1, 0);
		const cam = entity.addComponent(CameraComponent);

		const pos = cam.worldToScreenPos(new Vec3(0, 1, 1));

		assertVecAlmostEquals(pos, [0.5, 0.5, -1]);
	},
});

Deno.test({
	name: "worldToScreenPos, no entity",
	fn: () => {
		const cam = new CameraComponent();

		const pos = cam.worldToScreenPos(new Vec3(0, 0, 1));

		assertVecAlmostEquals(pos, [0.5, 0.5, -1]);
	},
});

Deno.test({
	name: "worldToScreenPos, slightly up",
	fn: () => {
		const cam = new CameraComponent();

		const pos = cam.worldToScreenPos(new Vec3(0, 0.1, 1));

		assertVecAlmostEquals(pos, [0.5, 0.55, -1], 0.01);
	},
});

Deno.test({
	name: "screenToWorldPos, should update the projection matrix",
	fn: () => {
		const entity = new Entity();
		entity.pos.set(0, 1, 0);
		const cam = entity.addComponent(CameraComponent);

		cam.screenToWorldPos(new Vec3(0, 1, 1));

		assertNotEquals(cam.projectionMatrix.getFlatArray(), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
	},
});

Deno.test({
	name: "screenToWorldPos, with entity",
	fn: () => {
		const entity = new Entity();
		entity.pos.set(0, 1, 0);
		const cam = entity.addComponent(CameraComponent);

		const pos = cam.screenToWorldPos(new Vec3(0.5, 0.5, 1));

		assertVecAlmostEquals(pos, [0, 1, -1]);
	},
});

Deno.test({
	name: "screenToWorldPos, no entity",
	fn: () => {
		const cam = new CameraComponent();

		const pos = cam.screenToWorldPos(new Vec3(0.5, 0.5, 1));

		assertVecAlmostEquals(pos, [0, 0, -1]);
	},
});

Deno.test({
	name: "screenToWorldPos, slightly up",
	fn: () => {
		const cam = new CameraComponent();

		const pos = cam.screenToWorldPos(new Vec3(0.5, 0.45, 1));

		assertVecAlmostEquals(pos, [0, 0.1, -1], 0.01);
	},
});

Deno.test({
	name: "getRaycastRayFromScreenPos, should update the projection matrix",
	fn: () => {
		const entity = new Entity();
		entity.pos.set(0, 1, 0);
		const cam = entity.addComponent(CameraComponent);

		cam.getRaycastRayFromScreenPos(new Vec2(0.5, 0.5));

		assertNotEquals(cam.projectionMatrix.getFlatArray(), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
	},
});

Deno.test({
	name: "getRaycastRayFromScreenPos, with entity",
	fn: () => {
		const entity = new Entity();
		entity.pos.set(0, 1, 0);
		const cam = entity.addComponent(CameraComponent);
		cam.fov = 90;
		cam.clipNear = 1;
		cam.clipFar = 10;

		const {start, dir} = cam.getRaycastRayFromScreenPos(new Vec2(0.75, 0.75));

		assertVecAlmostEquals(start, [0.5, 1.5, -1]);
		assertAlmostEquals(dir.magnitude, 1, 0.00001, "dir is not normalized");
		assertVecAlmostEquals(dir, [0.4, -0.4, -0.8], 0.1);
	},
});

Deno.test({
	name: "getRaycastRayFromScreenPos, no entity",
	fn: () => {
		const cam = new CameraComponent();
		cam.fov = 90;
		cam.clipNear = 1;
		cam.clipFar = 10;

		const {start, dir} = cam.getRaycastRayFromScreenPos(new Vec2(0.75, 0.75));

		assertVecAlmostEquals(start, [0.5, 0.5, -1], 0.0001);
		assertAlmostEquals(dir.magnitude, 1, 0.00001, "dir is not normalized");
		assertVecAlmostEquals(dir, [0.4, -0.4, -0.8], 0.1);
	},
});
