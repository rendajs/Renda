import {assertEquals} from "std/testing/asserts.ts";
import {Entity, Mat4, Quat, Vec3} from "../../../../../src/mod.js";
import {assertMatAlmostEquals, assertVecAlmostEquals} from "../../../shared/asserts.js";

// ==== Local transformations ==================================================

Deno.test({
	name: "get and set position",
	fn() {
		const entity = new Entity();

		entity.pos = new Vec3(1, 2, 3);

		assertVecAlmostEquals(entity.pos, [1, 2, 3]);
	},
});

Deno.test({
	name: "get and set rotation",
	fn() {
		const entity = new Entity();

		entity.rot = Quat.fromAxisAngle(new Vec3(1, 0, 0), Math.PI / 2);

		assertVecAlmostEquals(entity.rot.toAxisAngle(), [Math.PI / 2, 0, 0]);
	},
});

Deno.test({
	name: "get and set scale",
	fn() {
		const entity = new Entity();

		entity.scale = new Vec3(1, 2, 3);

		assertVecAlmostEquals(entity.scale, [1, 2, 3]);
	},
});

// ==== World position =========================================================

Deno.test({
	name: "set world position",
	fn() {
		const parent = new Entity();
		parent.pos.set(1, 2, 3);
		const child = parent.add(new Entity());

		child.worldPos = new Vec3(0, 0, 0);

		assertVecAlmostEquals(child.pos, [-1, -2, -3]);

		child.worldPos = new Vec3(1, 2, 3);

		assertVecAlmostEquals(child.pos, [0, 0, 0]);
	},
});

Deno.test({
	name: "update world position",
	fn() {
		const parent = new Entity();
		parent.pos.set(1, 2, 3);
		const child = parent.add(new Entity());

		child.worldPos.set(0, 0, 0);

		assertVecAlmostEquals(child.pos, [-1, -2, -3]);

		child.worldPos.x = 1;

		assertVecAlmostEquals(child.pos, [0, -2, -3]);
	},
});

Deno.test({
	name: "get world position",
	fn() {
		const parent = new Entity();
		parent.pos.set(1, 2, 3);
		const child = parent.add(new Entity());

		assertVecAlmostEquals(child.worldPos, [1, 2, 3]);

		child.pos.set(-1, -2, -3);

		assertVecAlmostEquals(child.worldPos, [0, 0, 0]);
	},
});

Deno.test({
	name: "set world position on a single component",
	fn() {
		const parent = new Entity();
		parent.pos.set(1, 2, 3);
		const child = parent.add(new Entity());

		const ref = child.worldPos;
		parent.pos.set(0, 0, 0);
		ref.x = 1;

		assertVecAlmostEquals(child.pos, [1, 0, 0]);
	},
});

// ==== World rotation =========================================================

// TODO: These are broken right now, presumably because in the localMatrix
// getter from Entity, the call to Mat4.createPosRotScale seems to result in an
// incorrect local rotation value:
//

Deno.test({
	name: "set world rotation",
	fn() {
		const parent = new Entity();
		parent.rot.setFromAxisAngle(new Vec3(1, 0, 0), Math.PI / 2);
		const child = parent.add(new Entity());

		child.worldRot = new Quat();

		assertVecAlmostEquals(child.rot.toAxisAngle(), [-Math.PI / 2, 0, 0]);

		child.worldRot = Quat.fromAxisAngle(new Vec3(1, 0, 0), Math.PI / 2);

		assertVecAlmostEquals(child.rot.toAxisAngle(), [0, 0, 0]);
	},
});

Deno.test({
	name: "update world rotation",
	fn() {
		const parent = new Entity();
		parent.rot.setFromAxisAngle(new Vec3(1, 0, 0), Math.PI / 2);
		const child = parent.add(new Entity());

		child.worldRot.set(new Quat());

		assertVecAlmostEquals(child.rot.toAxisAngle(), [-Math.PI / 2, 0, 0]);

		child.worldRot.set(Quat.fromAxisAngle(new Vec3(1, 0, 0), Math.PI / 2));

		assertVecAlmostEquals(child.rot.toAxisAngle(), [0, 0, 0]);
	},
});

Deno.test({
	name: "get world rotation",
	fn() {
		const parent = new Entity();
		parent.rot.setFromAxisAngle(new Vec3(1, 0, 0), Math.PI / 2);
		const child = parent.add(new Entity());

		assertVecAlmostEquals(child.worldRot.toAxisAngle(), [Math.PI / 2, 0, 0]);

		child.rot.set(Quat.fromAxisAngle(new Vec3(1, 0, 0), -Math.PI / 2));

		assertVecAlmostEquals(child.worldRot.toAxisAngle(), [0, 0, 0]);
	},
});

// ==== World scale ============================================================

Deno.test({
	name: "set world scale",
	fn() {
		const parent = new Entity();
		parent.scale.set(2, 2, 2);
		const child = parent.add(new Entity());

		child.worldScale = new Vec3(1, 1, 1);

		assertVecAlmostEquals(child.scale, [0.5, 0.5, 0.5]);

		child.worldScale = new Vec3(2, 2, 2);

		assertVecAlmostEquals(child.scale, [1, 1, 1]);
	},
});

Deno.test({
	name: "update world scale",
	fn() {
		const parent = new Entity();
		parent.scale.set(2, 2, 2);
		const child = parent.add(new Entity());

		child.worldScale.set(1, 1, 1);

		assertVecAlmostEquals(child.scale, [0.5, 0.5, 0.5]);

		child.worldScale.x = 2;

		assertVecAlmostEquals(child.scale, [1, 0.5, 0.5]);
	},
});

Deno.test({
	name: "get world scale",
	fn() {
		const parent = new Entity();
		parent.scale.set(2, 2, 2);
		const child = parent.add(new Entity());

		assertVecAlmostEquals(child.worldScale, [2, 2, 2]);

		child.scale.set(0.5, 0.5, 0.5);

		assertVecAlmostEquals(child.worldScale, [1, 1, 1]);
	},
});

Deno.test({
	name: "set world scale on a single component",
	fn() {
		const parent = new Entity();
		parent.scale.set(2, 2, 2);
		const child = parent.add(new Entity());

		const ref = child.worldScale;
		parent.scale.set(1, 1, 1);
		ref.x = 3;

		assertVecAlmostEquals(child.scale, [3, 1, 1]);
	},
});

// ==== local matrix ===========================================================

Deno.test({
	name: "localMatrix is identiy by default",
	fn() {
		const entity = new Entity();
		assertMatAlmostEquals(entity.worldMatrix, new Mat4());
	},
});

Deno.test({
	name: "setting local matrix via constructor options",
	fn() {
		const matrix = Mat4.createPosRotScale(new Vec3(1, 2, 3), Quat.fromAxisAngle(new Vec3(1, 0, 0), Math.PI / 2), new Vec3(4, 5, 6));
		const entity = new Entity({matrix});
		assertEquals(entity.localMatrix.toArray(), matrix.toArray());
		assertVecAlmostEquals(entity.pos, [1, 2, 3]);
		assertVecAlmostEquals(entity.rot.toAxisAngle(), [Math.PI / 2, 0, 0]);
		assertVecAlmostEquals(entity.scale, [4, 5, 6]);
	},
});

Deno.test({
	name: "setting local matrix after creation",
	fn() {
		const matrix = Mat4.createPosRotScale(new Vec3(1, 2, 3), Quat.fromAxisAngle(new Vec3(1, 0, 0), Math.PI / 2), new Vec3(4, 5, 6));
		const entity = new Entity();
		entity.localMatrix = matrix;
		assertEquals(entity.localMatrix.toArray(), matrix.toArray());
		assertVecAlmostEquals(entity.pos, [1, 2, 3]);
		assertVecAlmostEquals(entity.rot.toAxisAngle(), [Math.PI / 2, 0, 0]);
		assertVecAlmostEquals(entity.scale, [4, 5, 6]);
	},
});

Deno.test({
	name: "compute localMatrix when position is set",
	fn() {
		const entity = new Entity();
		entity.pos = new Vec3(1, 2, 3);
		assertMatAlmostEquals(entity.localMatrix, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 2, 3, 1]);
	},
});

Deno.test({
	name: "compute localMatrix when position is changed",
	fn() {
		const entity = new Entity();
		entity.pos.set(1, 2, 3);
		assertMatAlmostEquals(entity.localMatrix, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 2, 3, 1]);
	},
});

Deno.test({
	name: "compute localMatrix when rotation is set",
	fn() {
		const entity = new Entity();
		entity.rot = Quat.fromAxisAngle(new Vec3(1, 0, 0), Math.PI / 2);
		assertMatAlmostEquals(entity.localMatrix, [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1]);
	},
});

Deno.test({
	name: "compute localMatrix when rotation is changed",
	fn() {
		const entity = new Entity();
		const rot = Quat.fromAxisAngle(new Vec3(1, 0, 0), Math.PI / 2);
		entity.rot.set(rot);
		assertMatAlmostEquals(entity.localMatrix, [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1]);
	},
});

Deno.test({
	name: "compute localMatrix when scale is set",
	fn() {
		const entity = new Entity();
		entity.scale = new Vec3(1, 2, 3);
		assertMatAlmostEquals(entity.localMatrix, [1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 3, 0, 0, 0, 0, 1]);
	},
});

Deno.test({
	name: "compute localMatrix when scale is changed",
	fn() {
		const entity = new Entity();
		entity.scale.set(1, 2, 3);
		assertMatAlmostEquals(entity.localMatrix, [1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 3, 0, 0, 0, 0, 1]);
	},
});

// ==== world matrix ===========================================================

Deno.test({
	name: "worldMatrix is identiy by default",
	fn() {
		const entity = new Entity();
		assertMatAlmostEquals(entity.worldMatrix, new Mat4());
	},
});

Deno.test({
	name: "compute worldMatrix when position is set",
	fn() {
		const entity = new Entity();
		entity.pos = new Vec3(1, 2, 3);
		assertMatAlmostEquals(entity.worldMatrix, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 2, 3, 1]);
	},
});

Deno.test({
	name: "compute worldMatrix when position is changed",
	fn() {
		const entity = new Entity();
		entity.pos.set(1, 2, 3);
		assertMatAlmostEquals(entity.worldMatrix, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 2, 3, 1]);
	},
});

Deno.test({
	name: "compute worldMatrix when rotation is set",
	fn() {
		const entity = new Entity();
		entity.rot = Quat.fromAxisAngle(new Vec3(1, 0, 0), Math.PI / 2);
		assertMatAlmostEquals(entity.worldMatrix, [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1]);
	},
});

Deno.test({
	name: "compute worldMatrix when rotation is changed",
	fn() {
		const entity = new Entity();
		const rot = Quat.fromAxisAngle(new Vec3(1, 0, 0), Math.PI / 2);
		entity.rot.set(rot);
		assertMatAlmostEquals(entity.worldMatrix, [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1]);
	},
});

Deno.test({
	name: "compute worldMatrix when scale is set",
	fn() {
		const entity = new Entity();
		entity.scale = new Vec3(1, 2, 3);
		assertMatAlmostEquals(entity.worldMatrix, [1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 3, 0, 0, 0, 0, 1]);
	},
});

Deno.test({
	name: "compute worldMatrix when scale is changed",
	fn() {
		const entity = new Entity();
		entity.scale.set(1, 2, 3);
		assertMatAlmostEquals(entity.worldMatrix, [1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 3, 0, 0, 0, 0, 1]);
	},
});

Deno.test({
	name: "compute worldMatrix when parent position is set",
	fn() {
		const parent = new Entity();
		const entity = new Entity();
		parent.add(entity);
		parent.pos = new Vec3(1, 2, 3);
		assertMatAlmostEquals(entity.worldMatrix, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 2, 3, 1]);
	},
});

Deno.test({
	name: "compute worldMatrix when parent position is changed",
	fn() {
		const parent = new Entity();
		const entity = new Entity();
		parent.add(entity);
		parent.pos.set(1, 2, 3);
		assertMatAlmostEquals(entity.worldMatrix, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 2, 3, 1]);
	},
});

Deno.test({
	name: "compute worldMatrix when parent rotation is set",
	fn() {
		const parent = new Entity();
		const entity = new Entity();
		parent.add(entity);
		parent.rot = Quat.fromAxisAngle(new Vec3(1, 0, 0), Math.PI / 2);
		assertMatAlmostEquals(entity.worldMatrix, [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1]);
	},
});

Deno.test({
	name: "compute worldMatrix when parent rotation is changed",
	fn() {
		const parent = new Entity();
		const entity = new Entity();
		parent.add(entity);
		const rot = Quat.fromAxisAngle(new Vec3(1, 0, 0), Math.PI / 2);
		parent.rot.set(rot);
		assertMatAlmostEquals(entity.worldMatrix, [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1]);
	},
});

Deno.test({
	name: "compute worldMatrix when parent scale is set",
	fn() {
		const parent = new Entity();
		const entity = new Entity();
		parent.add(entity);
		parent.scale = new Vec3(1, 2, 3);
		assertMatAlmostEquals(entity.worldMatrix, [1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 3, 0, 0, 0, 0, 1]);
	},
});

Deno.test({
	name: "compute worldMatrix when parent scale is changed",
	fn() {
		const parent = new Entity();
		const entity = new Entity();
		parent.add(entity);
		parent.scale.set(1, 2, 3);
		assertMatAlmostEquals(entity.worldMatrix, [1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 3, 0, 0, 0, 0, 1]);
	},
});

Deno.test({
	name: "compute worldMatrix when entity is added as child",
	fn() {
		const parent = new Entity();
		parent.pos.set(1, 2, 3);
		const entity = new Entity();
		parent.add(entity);
		assertMatAlmostEquals(entity.worldMatrix, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 2, 3, 1]);
	},
});

Deno.test({
	name: "compute worldMatrix when the parent is set",
	fn() {
		const parent = new Entity();
		parent.pos.set(1, 2, 3);
		const entity = new Entity();
		entity.parent = parent;
		assertMatAlmostEquals(entity.worldMatrix, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 2, 3, 1]);
	},
});

Deno.test({
	name: "compute worldMatrix when the parent is removed",
	fn() {
		const parent = new Entity();
		parent.pos.set(1, 2, 3);
		const entity = new Entity();
		entity.parent = parent;
		entity.parent = null;
		assertMatAlmostEquals(entity.worldMatrix, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
	},
});

Deno.test({
	name: "??",
	fn() {
		const entity = new Entity({
			matrix: new Mat4([
				[0.23185248938019934, 7.831232006951038e-16, 0.9727509563877509, 0],
				[5.952468856531243e-16, 0.9999999999989068, -9.469357669400846e-16, 0],
				[-0.9727509563873817, 7.985763921546837e-16, 0.23185248938011135, 0],
				[4.63563934158383, -3.7913191723642954e-15, -1.1048917651091632, 1],
			]),
		});
		entity.worldPos.set(4.63563934158383, -3.7913191723642954e-15, -1.1048917651091632);
		entity.worldRot.set(0.7848096869247758, -5.56030392249633e-16, -0.6197368435949532, 5.984774979834381e-17);
		entity.worldScale.set(0.9999999999925395, 0.9999999999989068, 0.99999999999216);
		/* eslint-disable-next-line no-unused-expressions */
		entity.worldMatrix;
	},
});
