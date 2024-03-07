import { assertEquals, assertThrows } from "std/testing/asserts.ts";
import { assertSpyCalls, spy, stub } from "std/testing/mock.ts";
import { Entity, Mat4, Quat, Vec3 } from "../../../../../src/mod.js";
import { assertMatAlmostEquals, assertQuatAlmostEquals, assertVecAlmostEquals } from "../../../shared/asserts.js";

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
		const entity = new Entity({ localMatrix: matrix });
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
	name: "changing local matrix in place",
	fn() {
		const entity = new Entity();
		const localMatrix = entity.localMatrix;
		localMatrix.set(Mat4.createTranslation(2, 2, 2));

		assertEquals(entity.localMatrix.toArray(), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 2, 2, 2, 1]);
		assertVecAlmostEquals(entity.pos, [2, 2, 2]);
		assertVecAlmostEquals(entity.worldPos, [2, 2, 2]);

		entity.pos.set(3, 3, 3);
		assertVecAlmostEquals(entity.pos, [3, 3, 3]);

		entity.localMatrix.set(Mat4.createTranslation(4, 4, 4));
		assertEquals(entity.localMatrix.toArray(), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 4, 4, 4, 1]);
		assertVecAlmostEquals(entity.pos, [4, 4, 4]);
		assertVecAlmostEquals(entity.worldPos, [4, 4, 4]);

		localMatrix.set(Mat4.createTranslation(5, 5, 5));
		assertEquals(entity.localMatrix.toArray(), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 5, 5, 5, 1]);
		assertVecAlmostEquals(entity.pos, [5, 5, 5]);
		assertVecAlmostEquals(entity.worldPos, [5, 5, 5]);
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
	name: "setting world matrix via constructor options",
	fn() {
		const matrix = Mat4.createPosRotScale(new Vec3(1, 2, 3), Quat.fromAxisAngle(new Vec3(1, 0, 0), Math.PI / 2), new Vec3(4, 5, 6));
		const entity = new Entity({ worldMatrix: matrix });
		assertEquals(entity.worldMatrix.toArray(), matrix.toArray());
		assertVecAlmostEquals(entity.pos, [1, 2, 3]);
		assertVecAlmostEquals(entity.rot.toAxisAngle(), [Math.PI / 2, 0, 0]);
		assertVecAlmostEquals(entity.scale, [4, 5, 6]);
	},
});

Deno.test({
	name: "setting world matrix via constructor options with a translated parent",
	fn() {
		const parent = new Entity();
		parent.pos.set(1, 2, 3);

		const matrix = Mat4.createTranslation(4, 5, 6);
		const entity = new Entity({ worldMatrix: matrix, parent });

		assertVecAlmostEquals(entity.pos, [3, 3, 3]);
		assertVecAlmostEquals(entity.worldPos, [4, 5, 6]);
	},
});

Deno.test({
	name: "setting world matrix after creation",
	fn() {
		const matrix = Mat4.createPosRotScale(new Vec3(1, 2, 3), Quat.fromAxisAngle(new Vec3(1, 0, 0), Math.PI / 2), new Vec3(4, 5, 6));
		const entity = new Entity();
		entity.worldMatrix = matrix;
		assertEquals(entity.worldMatrix.toArray(), matrix.toArray());
		assertVecAlmostEquals(entity.pos, [1, 2, 3]);
		assertVecAlmostEquals(entity.rot.toAxisAngle(), [Math.PI / 2, 0, 0]);
		assertVecAlmostEquals(entity.scale, [4, 5, 6]);
	},
});

Deno.test({
	name: "setting world matrix after creation with a translated parent",
	fn() {
		const parent = new Entity();
		parent.pos.set(1, 2, 3);

		const entity = new Entity({ parent });

		entity.worldMatrix = Mat4.createTranslation(4, 5, 6);

		assertVecAlmostEquals(entity.pos, [3, 3, 3]);
		assertVecAlmostEquals(entity.worldPos, [4, 5, 6]);
	},
});

Deno.test({
	name: "changing world matrix in place",
	fn() {
		const entity = new Entity();
		const worldMatrix = entity.worldMatrix;
		worldMatrix.set(Mat4.createTranslation(2, 2, 2));

		assertEquals(entity.worldMatrix.toArray(), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 2, 2, 2, 1]);
		assertVecAlmostEquals(entity.pos, [2, 2, 2]);
		assertVecAlmostEquals(entity.worldPos, [2, 2, 2]);

		entity.pos.set(3, 3, 3);
		assertVecAlmostEquals(entity.pos, [3, 3, 3]);

		entity.worldMatrix.set(Mat4.createTranslation(4, 4, 4));
		assertEquals(entity.worldMatrix.toArray(), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 4, 4, 4, 1]);
		assertVecAlmostEquals(entity.pos, [4, 4, 4]);
		assertVecAlmostEquals(entity.worldPos, [4, 4, 4]);

		worldMatrix.set(Mat4.createTranslation(5, 5, 5));
		assertEquals(entity.worldMatrix.toArray(), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 5, 5, 5, 1]);
		assertVecAlmostEquals(entity.pos, [5, 5, 5]);
		assertVecAlmostEquals(entity.worldPos, [5, 5, 5]);
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
	name: "The local scale and rotation of negatively scaled entities doesn't change when setting the rotation",
	fn() {
		const root = new Entity("root");
		const entity = root.add(new Entity());
		entity.scale.set(-1, 1, 1);
		assertMatAlmostEquals(entity.worldMatrix, [-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

		// When we rotate the object slightly, the world scale and rot match the local transformation.
		entity.rot.set(Quat.fromAxisAngle(0, 1, 0, 0.1));
		assertVecAlmostEquals(entity.worldScale, [-1, 1, 1]);
		assertQuatAlmostEquals(entity.worldRot, Quat.fromAxisAngle(0, 1, 0, 0.1));
		assertVecAlmostEquals(entity.scale, [-1, 1, 1]);
		assertQuatAlmostEquals(entity.rot, Quat.fromAxisAngle(0, 1, 0, 0.1));

		// But when we rotate too far, the worldScale will change.
		// This is because the worldScale and worldRot get extracted from the world matrix,
		// which doesn't contain information about which axis the object was scaled on.
		// The local rotation and scale, however, should never be changed in this case.
		// The only thing that is allowed to change local position/rotation/scale is when setting
		// the localMatrix or worldMatrix.
		entity.rot.set(Quat.fromAxisAngle(0, 1, 0, 2));
		assertVecAlmostEquals(entity.worldScale, [1, 1, -1]);
		assertQuatAlmostEquals(entity.worldRot, Quat.fromAxisAngle(0, 1, 0, 2 - Math.PI));
		assertVecAlmostEquals(entity.scale, [-1, 1, 1]);
		assertQuatAlmostEquals(entity.rot, Quat.fromAxisAngle(0, 1, 0, 2));
	},
});

Deno.test({
	name: "setting the a local matrix with a negative scale maintains that scale where possible",
	fn() {
		const entity = new Entity();
		entity.localMatrix.set(Mat4.createScale(new Vec3(-1, 1, 1)));
		assertVecAlmostEquals(entity.scale, [-1, 1, 1]);
		entity.localMatrix.set(Mat4.createScale(new Vec3(1, -1, 1)));
		assertVecAlmostEquals(entity.scale, [1, -1, 1]);
		entity.localMatrix.set(Mat4.createScale(new Vec3(1, 1, -1)));
		assertVecAlmostEquals(entity.scale, [1, 1, -1]);
		entity.localMatrix.set(Mat4.createScale(new Vec3(-1, -1, -1)));
		assertVecAlmostEquals(entity.scale, [-1, -1, -1]);
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
	name: "Passing both local and world matrix to constructor options throws",
	fn() {
		const localMatrix = Mat4.createTranslation(1, 2, 3);
		const worldMatrix = Mat4.createTranslation(4, 5, 6);

		assertThrows(() => {
			new Entity({
				localMatrix,
				worldMatrix,
			});
		}, Error, "Both a localMatrix and worldMatrix option was provided which is not supported.");
	},
});

Deno.test({
	name: "Issue #132: Stackoverflow when getting world matrix",
	fn() {
		// When passing the result from Mat4.compose() back in to Mat4.decompose()
		// the values might not always be exactly the same, probably due to
		// floating point errors.
		// To simulate this behaviour we make Mat4.decompose return a different
		// value every time it is called.
		// When all components of pos/rot/scale are changed, the entity simply
		// replaces the entire vec3/quat. But if one of the components stay
		// the same, a special path is taken where the entity tries to only
		// update the changed components. This was where issue #132 used to happen.
		// That is why we only increment the first component of the decompose result.
		let i = 0;
		const decomposeStub = stub(Mat4.prototype, "decompose", () => {
			return {
				pos: new Vec3(i++, 0, 0),
				rot: new Quat(i++, 0, 0, 1),
				scale: new Vec3(i++, 1, 1),
			};
		});

		try {
			const entity = new Entity();
			entity.worldPos.set(1, 2, 3);
			/* eslint-disable-next-line no-unused-expressions */
			entity.worldMatrix;
		} finally {
			decomposeStub.restore();
		}
	},
});

Deno.test({
	name: "setting world matrix affects children",
	fn() {
		const root = new Entity("root");
		const childA = root.add(new Entity("A")); // The entity we will be moving up
		const childB = childA.add(new Entity("B")); // The entity we will reset (i.e. move down again)
		const childC = childB.add(new Entity("C")); // The entity that should have the identity matrix

		childA.worldMatrix.set(Mat4.createTranslation(0, 1, 0));
		assertMatAlmostEquals(childB.worldMatrix, Mat4.createTranslation(0, 1, 0));
		assertMatAlmostEquals(childC.worldMatrix, Mat4.createTranslation(0, 1, 0));

		childB.worldMatrix.set(new Mat4());
		assertMatAlmostEquals(childC.worldMatrix, new Mat4());
	},
});

Deno.test({
	name: "setting world matrix affects children when scaling negatively",
	fn() {
		// At the time of writing, decomposing negatively scaled matrices means the sign is lost.
		// So Mat4.createScale(-1, 1, 1) and Mat4.createScale(1, 1, 1) both return a scale of (1,1,1) when calling decompose()
		// As a result changing the scale of a Entity.worldMatrix doesn't cause the worldmatrices
		// of children to get marked as dirty.
		const root = new Entity("root");
		const childA = root.add(new Entity("A")); // The entity we will be moving up
		const childB = childA.add(new Entity("B")); // The entity we will reset (i.e. move down again)

		childA.worldMatrix.set(Mat4.createScale(-1, 1, 1));
		assertMatAlmostEquals(childB.worldMatrix, Mat4.createScale(-1, 1, 1));

		childA.worldMatrix.set(new Mat4());
		assertMatAlmostEquals(childB.worldMatrix, new Mat4());
	},
});

Deno.test({
	name: "setting world matrix affects local position",
	fn() {
		const root = new Entity("root");
		const childA = root.add(new Entity("A")); // The entity we will be moving up
		const childB = childA.add(new Entity("B")); // The entity we will reset (i.e. move down again)

		childA.worldMatrix.set(Mat4.createTranslation(0, 1, 0));
		assertVecAlmostEquals(childB.pos, [0, 0, 0]);

		childB.worldMatrix.set(new Mat4());
		assertVecAlmostEquals(childB.pos, [0, -1, 0]);
	},
});

Deno.test({
	name: "setting world matrix affects world position",
	fn() {
		const root = new Entity("root");
		const childA = root.add(new Entity("A")); // The entity we will be moving up
		const childB = childA.add(new Entity("B")); // The entity we will reset (i.e. move down again)

		childA.worldMatrix.set(Mat4.createTranslation(0, 1, 0));
		assertVecAlmostEquals(childB.worldPos, [0, 1, 0]);

		childB.worldMatrix.set(new Mat4());
		assertVecAlmostEquals(childB.worldPos, [0, 0, 0]);
	},
});

Deno.test({
	name: "Issue #203: Changing parent transformation shouldn't adjust local transformation from children",
	fn() {
		const parent = new Entity("parent");
		const child = new Entity("child");
		parent.add(child);
		const originalLocalRot = new Quat();
		originalLocalRot.setFromAxisAngle(Vec3.up, 0.5);
		child.rot.set(originalLocalRot);
		child.scale.set(0.1, 0.2, 0.3);

		const rotChangeSpy = spy();
		child.rot.onChange(rotChangeSpy);

		parent.rot.setFromAxisAngle(Vec3.up, 0.5);
		/* eslint-disable-next-line no-unused-expressions */
		parent.worldRot;
		/* eslint-disable-next-line no-unused-expressions */
		child.worldRot;

		assertSpyCalls(rotChangeSpy, 0);
		assertVecAlmostEquals(child.rot.toAxisAngle(), originalLocalRot.toAxisAngle());
	},
});

