import {Mat4, Quat, Vec2, Vec3} from "../../../../src/mod.js";
import {domSpaceToScreenSpace, getRaycastRayFromScreenPos, screenSpaceToDomSpace, screenToWorldPos, worldToScreenPos} from "../../../../src/util/cameraUtil.js";
import {assertAlmostEquals, assertVecAlmostEquals} from "../../shared/asserts.js";
import {HtmlElement} from "fake-dom/FakeHtmlElement.js";

Deno.test({
	name: "worldToScreenPos, with world matrix",
	fn() {
		const projectionMatrix = Mat4.createPerspective(90, 0.01, 1000);
		const worldMatrix = Mat4.createTranslation(0, 1, 0);

		const pos = worldToScreenPos(new Vec3(0, 1, 1000), projectionMatrix, worldMatrix);

		assertVecAlmostEquals(pos, [0.5, 0.5, 1000]);
	},
});

Deno.test({
	name: "worldToScreenPos, no world matrix",
	fn() {
		const projectionMatrix = Mat4.createPerspective(90, 0.01, 1000);

		const pos = worldToScreenPos(new Vec3(0, 0, 1000), projectionMatrix);

		assertVecAlmostEquals(pos, [0.5, 0.5, 1000]);
	},
});

Deno.test({
	name: "worldToScreenPos, z close to nearClip",
	fn() {
		const projectionMatrix = Mat4.createPerspective(90, 1, 1000);

		const pos = worldToScreenPos(new Vec3(0, 0, 1), projectionMatrix);

		assertVecAlmostEquals(pos, [0.5, 0.5, 1]);
	},
});

Deno.test({
	name: "worldToScreenPos, z halfway between nearClip and farClip",
	fn() {
		const projectionMatrix = Mat4.createPerspective(90, 1, 1000);

		const pos = worldToScreenPos(new Vec3(0, 0, 500), projectionMatrix);

		assertVecAlmostEquals(pos, [0.5, 0.5, 500]);
	},
});

Deno.test({
	name: "worldToScreenPos, slightly up",
	fn: () => {
		const projectionMatrix = Mat4.createPerspective(90, 0.01, 1000);

		const pos = worldToScreenPos(new Vec3(0, 0.5, 1), projectionMatrix);

		assertVecAlmostEquals(pos, [0.5, 0.25, 1]);
	},
});

Deno.test({
	name: "worldToScreenPos, slightly down",
	fn: () => {
		const projectionMatrix = Mat4.createPerspective(90, 0.01, 1000);

		const pos = worldToScreenPos(new Vec3(0, -0.5, 1), projectionMatrix);

		assertVecAlmostEquals(pos, [0.5, 0.75, 1]);
	},
});

Deno.test({
	name: "worldToScreenPos, slightly left",
	fn: () => {
		const projectionMatrix = Mat4.createPerspective(90, 0.01, 1000);

		const pos = worldToScreenPos(new Vec3(-0.5, 0, 1), projectionMatrix);

		assertVecAlmostEquals(pos, [0.25, 0.5, 1]);
	},
});

Deno.test({
	name: "worldToScreenPos, slightly right",
	fn: () => {
		const projectionMatrix = Mat4.createPerspective(90, 0.01, 1000);

		const pos = worldToScreenPos(new Vec3(0.5, 0, 1), projectionMatrix);

		assertVecAlmostEquals(pos, [0.75, 0.5, 1]);
	},
});

Deno.test({
	name: "screenToWorldPos, with world matrix",
	fn() {
		const projectionMatrix = Mat4.createPerspective(90, 0.01, 1000);
		const worldMatrix = Mat4.createTranslation(0, 1, 0);

		const pos = screenToWorldPos(new Vec3(0.5, 0.5, 1000), projectionMatrix, worldMatrix);

		assertVecAlmostEquals(pos, [0, 1, 1000]);
	},
});

Deno.test({
	name: "screenToWorldPos, no world matrix",
	fn() {
		const projectionMatrix = Mat4.createPerspective(90, 0.01, 1000);

		const pos = screenToWorldPos(new Vec3(0.5, 0.5, 1000), projectionMatrix);

		assertVecAlmostEquals(pos, [0, 0, 1000]);
	},
});

Deno.test({
	name: "screenToWorldPos, z close to nearClip",
	fn() {
		const projectionMatrix = Mat4.createPerspective(90, 1, 1000);

		const pos = screenToWorldPos(new Vec3(0.5, 0.5, 1), projectionMatrix);

		assertVecAlmostEquals(pos, [0, 0, 1]);
	},
});

Deno.test({
	name: "screenToWorldPos, z halfway between nearClip and farClip",
	fn() {
		const projectionMatrix = Mat4.createPerspective(90, 1, 1000);

		const pos = screenToWorldPos(new Vec3(0.5, 0.5, 500), projectionMatrix);

		assertVecAlmostEquals(pos, [0, 0, 500]);
	},
});

Deno.test({
	name: "screenToWorldPos, slightly up",
	fn: () => {
		const projectionMatrix = Mat4.createPerspective(90, 0.01, 1000);

		const pos = screenToWorldPos(new Vec3(0.5, 0.25, 1), projectionMatrix);

		assertVecAlmostEquals(pos, [0, 0.5, 1]);
	},
});

Deno.test({
	name: "screenToWorldPos, slightly down",
	fn: () => {
		const projectionMatrix = Mat4.createPerspective(90, 0.01, 1000);

		const pos = screenToWorldPos(new Vec3(0.5, 0.75, 1), projectionMatrix);

		assertVecAlmostEquals(pos, [0, -0.5, 1]);
	},
});

Deno.test({
	name: "screenToWorldPos, slightly left",
	fn: () => {
		const projectionMatrix = Mat4.createPerspective(90, 0.01, 1000);

		const pos = screenToWorldPos(new Vec3(0.25, 0.5, 1), projectionMatrix);

		assertVecAlmostEquals(pos, [-0.5, 0, 1]);
	},
});

Deno.test({
	name: "screenToWorldPos, slightly right",
	fn: () => {
		const projectionMatrix = Mat4.createPerspective(90, 0.01, 1000);

		const pos = screenToWorldPos(new Vec3(0.75, 0.5, 1), projectionMatrix);

		assertVecAlmostEquals(pos, [0.5, 0, 1]);
	},
});

Deno.test({
	name: "worldToScreenPos should stay the same when converting back with screenToWorldPos",
	fn() {
		const projectionMatrix = Mat4.createPerspective(90, 1, 1000);

		const worldMatrices = [
			{worldPos: [0, 0, 0], worldRot: [0, 0, 0, 1]},
			{worldPos: [0, 1, 0], worldRot: [0, 0, 0, 1]},
			{worldPos: [0, 0, -1], worldRot: [0, 0, 0, 1]},
			{worldPos: [3, 0, -2], worldRot: [0, 0.2474, 0, 0.9689]},
		];
		const positions = [
			[0.5, 0, 1],
			[0, 1, 1],
			[0, -0.5, 2],
			[3, 0, 10],
		];
		for (const {worldPos, worldRot} of worldMatrices) {
			const worldMatrix = Mat4.createPosRotScale(new Vec3(worldPos), new Quat(worldRot), new Vec3(1, 1, 1));

			for (const position of positions) {
				const pos = new Vec3(position);
				const pos2 = worldToScreenPos(pos, projectionMatrix, worldMatrix);
				const pos3 = screenToWorldPos(pos2, projectionMatrix, worldMatrix);
				assertVecAlmostEquals(pos3, pos);
			}
		}
	},
});

Deno.test({
	name: "getRaycastRayFromScreenPos, with world matrix",
	fn: () => {
		const worldMatrix = Mat4.createTranslation(0, 1, 0);
		const projectionMatrix = Mat4.createPerspective(90, 1, 10);
		const {start, dir} = getRaycastRayFromScreenPos(new Vec2(0.75, 0.75), projectionMatrix, worldMatrix);

		assertVecAlmostEquals(start, [0.5, 1.5, 1]);
		assertAlmostEquals(dir.magnitude, 1, 0.00001, "dir.magnitude is not normalized");
		assertVecAlmostEquals(dir, [0.4, -0.5, 0.8], 0.1);
	},
});

Deno.test({
	name: "getRaycastRayFromScreenPos, no world matrix",
	fn: () => {
		const projectionMatrix = Mat4.createPerspective(90, 1, 10);
		const {start, dir} = getRaycastRayFromScreenPos(new Vec2(0.75, 0.75), projectionMatrix);

		assertVecAlmostEquals(start, [0.5, 0.5, 1]);
		assertAlmostEquals(dir.magnitude, 1, 0.00001, "dir.magnitude is not normalized");
		assertVecAlmostEquals(dir, [0.4, -0.4, 0.8], 0.1);
	},
});

Deno.test({
	name: "domSpaceToScreenSpace()",
	fn: () => {
		const el = new HtmlElement({
			x: 100,
			y: 100,
			clientWidth: 100,
			clientHeight: 100,
		});

		const screen1 = domSpaceToScreenSpace(el, 150, 150);
		assertVecAlmostEquals(screen1, [0.5, 0.5]);

		const screen2 = domSpaceToScreenSpace(el, [100, 100]);
		assertVecAlmostEquals(screen2, [0, 0]);

		const screen3 = domSpaceToScreenSpace(el, new Vec2(200, 200));
		assertVecAlmostEquals(screen3, [1, 1]);
	},
});

Deno.test({
	name: "domSpaceToScreenSpace() out of bounds",
	fn: () => {
		const el = new HtmlElement({
			x: 100,
			y: 100,
			clientWidth: 100,
			clientHeight: 100,
		});

		const screen = domSpaceToScreenSpace(el, 250, 250);
		assertVecAlmostEquals(screen, [1.5, 1.5]);
	},
});

Deno.test({
	name: "domSpaceToScreenSpace() with padding, left top",
	fn: () => {
		const el = new HtmlElement({
			x: 100,
			y: 100,
			clientWidth: 100,
			clientHeight: 100,
		});
		el.style.paddingLeft = "50px";
		el.style.paddingTop = "50px";

		const screen1 = domSpaceToScreenSpace(el, 100, 100);
		assertVecAlmostEquals(screen1, [-0.5, -0.5]);
	},
});

Deno.test({
	name: "domSpaceToScreenSpace() with padding, right bottom",
	fn: () => {
		const el = new HtmlElement({
			x: 100,
			y: 100,
			clientWidth: 100,
			clientHeight: 100,
		});
		el.style.paddingRight = "50px";
		el.style.paddingBottom = "50px";

		const screen1 = domSpaceToScreenSpace(el, 200, 200);
		assertVecAlmostEquals(screen1, [1, 1]);
	},
});

Deno.test({
	name: "screenSpaceToDomSpace()",
	fn: () => {
		const el = new HtmlElement({
			x: 100,
			y: 100,
			clientWidth: 100,
			clientHeight: 100,
		});

		const domPos1 = screenSpaceToDomSpace(el, 0.5, 0.5);
		assertVecAlmostEquals(domPos1, [150, 150]);

		const domPos2 = screenSpaceToDomSpace(el, [0, 0]);
		assertVecAlmostEquals(domPos2, [100, 100]);

		const domPos3 = screenSpaceToDomSpace(el, new Vec2(1, 1));
		assertVecAlmostEquals(domPos3, [200, 200]);
	},
});

Deno.test({
	name: "screenSpaceToDomSpace() out of bounds",
	fn: () => {
		const el = new HtmlElement({
			x: 100,
			y: 100,
			clientWidth: 100,
			clientHeight: 100,
		});

		const domPos = screenSpaceToDomSpace(el, 1.5, 1.5);
		assertVecAlmostEquals(domPos, [250, 250]);
	},
});

Deno.test({
	name: "screenSpaceToDomSpace() with padding, left top",
	fn: () => {
		const el = new HtmlElement({
			x: 100,
			y: 100,
			clientWidth: 100,
			clientHeight: 100,
		});
		el.style.paddingLeft = "50px";
		el.style.paddingTop = "50px";

		const domPos = screenSpaceToDomSpace(el, -0.5, -0.5);
		assertVecAlmostEquals(domPos, [100, 100]);
	},
});

Deno.test({
	name: "screenSpaceToDomSpace() with padding, right bottom",
	fn: () => {
		const el = new HtmlElement({
			x: 100,
			y: 100,
			clientWidth: 100,
			clientHeight: 100,
		});
		el.style.paddingRight = "50px";
		el.style.paddingBottom = "50px";

		const domPos = screenSpaceToDomSpace(el, 1, 1);
		assertVecAlmostEquals(domPos, [200, 200]);
	},
});
