import {assert, assertEquals} from "asserts";
import {Mat4} from "../../../../src/Math/Mat4.js";
import {Vec3} from "../../../../src/Math/Vec3.js";
import {worldToScreenPos} from "../../../../src/util/worldToScreenPos.js";

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
