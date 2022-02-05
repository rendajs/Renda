import {assert, assertEquals, assertNotEquals} from "asserts";
import {CameraComponent} from "../../../../../src/components/builtIn/CameraComponent.js";
import {Vec3} from "../../../../../src/Math/Vec3.js";
import {Entity} from "../../../../../src/core/Entity.js";

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
