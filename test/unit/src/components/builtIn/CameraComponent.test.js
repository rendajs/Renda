import {assert, assertEquals, assertNotEquals} from "asserts";
import {CameraComponent, Entity, Vec2, Vec3} from "../../../../../src/mod.js";

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

		assertEquals([pos.x, pos.y], [0, 0]);
	},
});

Deno.test({
	name: "worldToScreenPos, no entity",
	fn: () => {
		const cam = new CameraComponent();

		const pos = cam.worldToScreenPos(new Vec3(0, 0, 1));

		assertEquals([pos.x, pos.y], [0, 0]);
	},
});

Deno.test({
	name: "worldToScreenPos, slightly up",
	fn: () => {
		const cam = new CameraComponent();

		const pos = cam.worldToScreenPos(new Vec3(0, 0.1, 1));

		assertEquals(pos.x, 0);
		assert(pos.y > 0, "pos.y > 0");
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

		const {start, dir} = cam.getRaycastRayFromScreenPos(new Vec2(0.5, 0.5));

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
	name: "getRaycastRayFromScreenPos, no entity",
	fn: () => {
		const cam = new CameraComponent();
		cam.fov = 90;
		cam.clipNear = 1;
		cam.clipFar = 10;

		const {start, dir} = cam.getRaycastRayFromScreenPos(new Vec2(0.5, 0.5));

		assert(start.x > 0.49 && start.x < 0.51, "start.x is not near 0.5");
		assert(start.y > 0.49 && start.y < 0.51, "start.y is not near 0.5");
		assert(start.z > 0.99 && start.z < 1.01, "start.z is not near 1.0");

		assert(dir.magnitude > 0.99 && dir.magnitude < 1.01, "dir.magnitude is not normalized");

		assert(dir.x > 0.3 && dir.x < 0.5, "dir.x is not near 0.4");
		assert(dir.y > 0.3 && dir.y < 0.5, "dir.y is not near 0.4");
		assert(dir.z > 0.7 && dir.z < 0.9, "dir.z is not near 0.8");
	},
});
