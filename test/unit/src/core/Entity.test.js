import {assertEquals, assertStrictEquals, assertThrows} from "asserts";
import {Component, ComponentTypeManager, Entity, Mat4, Quat, Vec3} from "../../../../src/mod.js";
import {assertMatAlmostEquals, assertVecAlmostEquals} from "../../shared/asserts.js";

Deno.test({
	name: "Default name is 'Entity'",
	fn() {
		const entity = new Entity();
		assertEquals(entity.name, "Entity");
	},
});

Deno.test({
	name: "Setting name via constructor options",
	fn() {
		const entity = new Entity({name: "foo"});
		assertEquals(entity.name, "foo");
	},
});

Deno.test({
	name: "Setting name as single constructor argument",
	fn() {
		const entity = new Entity("foo");
		assertEquals(entity.name, "foo");
	},
});

Deno.test({
	name: "Has no parent by default",
	fn() {
		const entity = new Entity();
		assertEquals(entity.parent, null);
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

// ==== Components =============================================================

class ExtendedComponent extends Component {
	/**
	 * @param {...any} restArgs
	 */
	constructor(...restArgs) {
		super(...restArgs);
		this.restArgs = restArgs;
	}
}

class ExtendedComponent2 extends Component {}

Deno.test({
	name: "adding a component instance",
	fn() {
		const entity = new Entity();
		const component = new ExtendedComponent();
		const returnedComponent = entity.addComponent(component);
		assertEquals(entity.components.length, 1);
		assertStrictEquals(returnedComponent, component);
		assertStrictEquals(entity.components[0], component);
		assertStrictEquals(component.entity, entity);
	},
});

Deno.test({
	name: "adding a component constructor",
	fn() {
		const entity = new Entity();
		const component = entity.addComponent(ExtendedComponent, {
			foo: "bar",
		});
		assertEquals(entity.components.length, 1);
		assertStrictEquals(entity.components[0], component);
		assertStrictEquals(component.entity, entity);
		assertEquals(component.restArgs, [{foo: "bar"}]);
	},
});

class MockComponentTypeManager extends ComponentTypeManager {
	/**
	 * @param {import("../../../../src/mod.js").UuidString} uuid
	 */
	getComponentConstructorForUuid(uuid) {
		if (uuid == "existingUuid") {
			return ExtendedComponent;
		} else {
			return null;
		}
	}
}

const mockComponentTypeManager = new MockComponentTypeManager();

Deno.test({
	name: "adding a component uuid",
	fn() {
		const entity = new Entity();
		const component = entity.addComponent(mockComponentTypeManager, "existingUuid");
		assertEquals(entity.components.length, 1);
		assertStrictEquals(entity.components[0], component);
		assertStrictEquals(component.entity, entity);
	},
});

Deno.test({
	name: "adding a component uuid that doesn't exist throws an error",
	fn() {
		const entity = new Entity();
		assertThrows(() => {
			entity.addComponent(mockComponentTypeManager, "nonExistingUuid");
		});
	},
});

Deno.test({
	name: "add component that is already attached",
	fn() {
		const entity = new Entity();
		const component = new ExtendedComponent();
		entity.addComponent(component);
		const returnedComponent = entity.addComponent(component);
		assertEquals(entity.components.length, 1);
		assertStrictEquals(entity.components[0], component);
		assertStrictEquals(returnedComponent, component);
		assertStrictEquals(component.entity, entity);
	},
});

Deno.test({
	name: "add component that is already attached to a different entity should detach it",
	fn() {
		const oldEntity = new Entity();
		const entity = new Entity();
		const component = new ExtendedComponent();
		oldEntity.addComponent(component);
		const returnedComponent = entity.addComponent(component);
		assertEquals(oldEntity.components.length, 0);
		assertEquals(entity.components.length, 1);
		assertStrictEquals(entity.components[0], component);
		assertStrictEquals(returnedComponent, component);
		assertStrictEquals(component.entity, entity);
	},
});

Deno.test({
	name: "removeComponent",
	fn() {
		const entity = new Entity();
		const component = entity.addComponent(ExtendedComponent);
		entity.removeComponent(component);
		assertEquals(entity.components.length, 0);
		assertEquals(component.entity, null);
	},
});

Deno.test({
	name: "remove component that is already removed",
	fn() {
		const entity = new Entity();
		const component = entity.addComponent(ExtendedComponent);
		entity.removeComponent(component);
		entity.removeComponent(component);
		assertEquals(entity.components.length, 0);
		assertEquals(component.entity, null);
	},
});

Deno.test({
	name: "getComponent",
	fn() {
		const entity = new Entity();
		const component = entity.addComponent(ExtendedComponent);
		const component2 = entity.getComponent(ExtendedComponent);
		assertStrictEquals(component, component2);
	},
});

Deno.test({
	name: "getComponent that doesn't exist",
	fn() {
		const entity = new Entity();
		assertEquals(entity.getComponent(ExtendedComponent), null);
	},
});

Deno.test({
	name: "getComponents",
	fn() {
		const entity = new Entity();
		const component = entity.addComponent(ExtendedComponent);
		const components = Array.from(entity.getComponents(ExtendedComponent));
		assertEquals(components.length, 1);
		assertStrictEquals(components[0], component);
	},
});

Deno.test({
	name: "getComponents that doesn't exist",
	fn() {
		const entity = new Entity();
		const components = Array.from(entity.getComponents(ExtendedComponent));
		assertEquals(components.length, 0);
	},
});

Deno.test({
	name: "getComponents from a different constructor",
	fn() {
		const entity = new Entity();
		entity.addComponent(ExtendedComponent);
		const components = Array.from(entity.getComponents(ExtendedComponent2));
		assertEquals(components.length, 0);
	},
});

Deno.test({
	name: "getChildComponents",
	fn() {
		const entity = new Entity();
		const child = new Entity();
		entity.add(child);
		const component = child.addComponent(ExtendedComponent);
		const components = Array.from(entity.getChildComponents(ExtendedComponent));
		assertEquals(components.length, 1);
		assertStrictEquals(components[0], component);
	},
});

Deno.test({
	name: "getChildComponents that doesn't exist",
	fn() {
		const entity = new Entity();
		const child = new Entity();
		entity.add(child);
		const components = Array.from(entity.getChildComponents(ExtendedComponent));
		assertEquals(components.length, 0);
	},
});

Deno.test({
	name: "getChildComponents without children",
	fn() {
		const entity = new Entity();
		const components = Array.from(entity.getChildComponents(ExtendedComponent));
		assertEquals(components.length, 0);
	},
});

Deno.test({
	name: "getChildComponents from a different constructor",
	fn() {
		const entity = new Entity();
		const child = new Entity();
		entity.add(child);
		child.addComponent(ExtendedComponent);
		const components = Array.from(entity.getChildComponents(ExtendedComponent2));
		assertEquals(components.length, 0);
	},
});

Deno.test({
	name: "setting parent via constructor options",
	fn() {
		const parent = new Entity();
		const entity = new Entity({parent});
		assertStrictEquals(entity.parent, parent);
		assertEquals(parent.children.length, 1);
		assertStrictEquals(parent.children[0], entity);
	},
});

Deno.test({
	name: "get and set parent",
	fn() {
		const entity = new Entity();
		const parent = new Entity();
		entity.parent = parent;
		assertStrictEquals(entity.parent, parent);
		assertEquals(parent.children.length, 1);
		assertStrictEquals(parent.children[0], entity);
	},
});

Deno.test({
	name: "set parent that is already set",
	fn() {
		const entity = new Entity();
		const parent = new Entity();
		entity.parent = parent;
		entity.parent = parent;
		assertStrictEquals(entity.parent, parent);
		assertEquals(parent.children.length, 1);
		assertStrictEquals(parent.children[0], entity);
	},
});

Deno.test({
	name: "set parent to a new parent",
	fn() {
		const entity = new Entity();
		const oldParent = new Entity();
		const newParent = new Entity();
		entity.parent = oldParent;
		entity.parent = newParent;
		assertStrictEquals(entity.parent, newParent);
		assertEquals(oldParent.children.length, 0);
		assertEquals(newParent.children.length, 1);
		assertStrictEquals(newParent.children[0], entity);
	},
});

Deno.test({
	name: "set parent to null",
	fn() {
		const entity = new Entity();
		const parent = new Entity();
		entity.parent = parent;
		entity.parent = null;
		assertEquals(parent.children.length, 0);
		assertEquals(entity.parent, null);
	},
});

Deno.test({
	name: "isRoot",
	fn() {
		const entity = new Entity();
		assertEquals(entity.isRoot, true);
		const child = new Entity();
		entity.add(child);
		assertEquals(child.isRoot, false);
	},
});

Deno.test({
	name: "localMatrix is identiy by default",
	fn() {
		const entity = new Entity();
		assertMatAlmostEquals(entity.worldMatrix, new Mat4());
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
	name: "add a child",
	fn() {
		const parent = new Entity();
		const child = new Entity();

		const added = parent.add(child);

		assertEquals(parent.children.length, 1);
		assertStrictEquals(parent.children[0], child);
		assertStrictEquals(child.parent, parent);
		assertStrictEquals(added, child);
	},
});

Deno.test({
	name: "addAtIndex",
	fn() {
		const child1 = new Entity();
		const child2 = new Entity();
		const child3 = new Entity();
		const parent = new Entity();
		parent.add(child1);
		parent.add(child2);

		const added = parent.addAtIndex(child3, 1);

		assertEquals(parent.children.length, 3);
		assertStrictEquals(parent.children[0], child1);
		assertStrictEquals(parent.children[1], child3);
		assertStrictEquals(parent.children[2], child2);
		assertStrictEquals(added, child3);
		assertStrictEquals(child1.parent, parent);
		assertStrictEquals(child2.parent, parent);
		assertStrictEquals(child3.parent, parent);
	},
});

Deno.test({
	name: "remove child",
	fn() {
		const child1 = new Entity();
		const child2 = new Entity();
		const child3 = new Entity();
		const parent = new Entity();
		parent.add(child1);
		parent.add(child2);
		parent.add(child3);

		parent.remove(child2);

		assertEquals(parent.children.length, 2);
		assertStrictEquals(parent.children[0], child1);
		assertStrictEquals(parent.children[1], child3);
		assertStrictEquals(child1.parent, parent);
		assertStrictEquals(child3.parent, parent);
		assertEquals(child2.parent, null);
	},
});

Deno.test({
	name: "removeAtIndex",
	fn() {
		const child1 = new Entity();
		const child2 = new Entity();
		const child3 = new Entity();
		const parent = new Entity();
		parent.add(child1);
		parent.add(child2);
		parent.add(child3);

		parent.removeAtIndex(1);

		assertEquals(parent.children.length, 2);
		assertStrictEquals(parent.children[0], child1);
		assertStrictEquals(parent.children[1], child3);
		assertStrictEquals(child1.parent, parent);
		assertStrictEquals(child3.parent, parent);
		assertEquals(child2.parent, null);
	},
});

Deno.test({
	name: "detachParent",
	fn() {
		const child = new Entity();
		const parent = new Entity();
		parent.add(child);

		child.detachParent();

		assertEquals(child.parent, null);
		assertEquals(parent.children.length, 0);
	},
});

Deno.test({
	name: "getChildren()",
	fn() {
		const parent = new Entity();
		const child1 = parent.add(new Entity());
		const child2 = parent.add(new Entity());
		const child3 = parent.add(new Entity());

		const children = Array.from(parent.getChildren());

		assertEquals(children.length, 3);
		assertStrictEquals(children[0], child1);
		assertStrictEquals(children[1], child2);
		assertStrictEquals(children[2], child3);
	},
});

Deno.test({
	name: "childCount",
	fn() {
		const parent = new Entity();
		parent.add(new Entity());
		parent.add(new Entity());
		parent.add(new Entity());

		assertEquals(parent.childCount, 3);
	},
});

Deno.test({
	name: "modifying children array doesn't work",
	fn() {
		const child1 = new Entity();
		const child2 = new Entity();
		const parent = new Entity();
		parent.add(child1);

		parent.children.push(child2);

		assertEquals(parent.children.length, 1);
		assertStrictEquals(parent.children[0], child1);
	},
});

Deno.test({
	name: "getRoot()",
	fn() {
		const entity1 = new Entity();
		const entity2 = entity1.add(new Entity());
		const entity3 = entity2.add(new Entity());

		const root = entity3.getRoot();

		assertStrictEquals(root, entity1);
	},
});

Deno.test({
	name: "traverseDown()",
	fn() {
		const root = new Entity();

		const entity1 = root.add(new Entity());
		const entity1A = entity1.add(new Entity());
		const entity1B = entity1.add(new Entity());

		const entity2 = root.add(new Entity());

		const entity3 = root.add(new Entity());
		const entity3A = entity3.add(new Entity());
		const entity3B = entity3.add(new Entity());
		const entity3C = entity3.add(new Entity());

		const entities = Array.from(root.traverseDown());

		const expected = [
			root,
			entity1,
			entity1A,
			entity1B,
			entity2,
			entity3,
			entity3A,
			entity3B,
			entity3C,
		];
		assertEquals(entities.length, expected.length);
		for (let i = 0; i < entities.length; i++) {
			assertStrictEquals(entities[i], expected[i]);
		}
	},
});

Deno.test({
	name: "traverseUp()",
	fn() {
		const entity1 = new Entity();
		const entity2 = entity1.add(new Entity());
		const entity3 = entity2.add(new Entity());

		const entities = Array.from(entity3.traverseUp());

		assertEquals(entities.length, 3);
		assertStrictEquals(entities[0], entity3);
		assertStrictEquals(entities[1], entity2);
		assertStrictEquals(entities[2], entity1);
	},
});

Deno.test({
	name: "containsChild() true",
	fn() {
		const parent = new Entity();
		const child = parent.add(new Entity());

		const result = parent.containsChild(child);

		assertEquals(result, true);
	},
});

Deno.test({
	name: "containsChild() false",
	fn() {
		const parent = new Entity();
		const child = new Entity();

		const result = parent.containsChild(child);

		assertEquals(result, false);
	},
});

function createBasicStructure() {
	const root = new Entity("root");

	const child1 = root.add(new Entity("child1"));
	root.add(new Entity());

	const child2 = child1.add(new Entity("child2"));
	child1.add(new Entity());

	child2.add(new Entity());
	child2.add(new Entity());
	const child3 = child2.add(new Entity("child3"));

	return {root, child1, child2, child3};
}

Deno.test({
	name: "getEntityByIndicesPath()",
	fn() {
		const {root, child3} = createBasicStructure();

		const entity = root.getEntityByIndicesPath([0, 0, 2]);

		assertStrictEquals(entity, child3);
	},
});

Deno.test({
	name: "getEntityByIndicesPath() invalid indices",
	fn() {
		const {root} = createBasicStructure();

		const paths = [
			[0, 100],
			[0, -1],
			[-1],
			[0, 0, 2, 100],
		];

		for (const path of paths) {
			const result = root.getEntityByIndicesPath(path);

			assertEquals(result, null);
		}
	},
});

Deno.test({
	name: "getEntityByName()",
	fn() {
		const {root, child1, child2, child3} = createBasicStructure();

		const rootResult = root.getEntityByName("root");
		assertStrictEquals(rootResult, root);

		const child1Result = root.getEntityByName("child1");
		assertStrictEquals(child1Result, child1);

		const child2Result = root.getEntityByName("child2");
		assertStrictEquals(child2Result, child2);

		const child3Result = root.getEntityByName("child3");
		assertStrictEquals(child3Result, child3);

		const nonExistentResult = root.getEntityByName("non-existent");
		assertEquals(nonExistentResult, null);
	},
});
