import {assertEquals, assertNotStrictEquals, assertThrows} from "std/testing/asserts.ts";
import {parseScene, parseScenes} from "../../../../../src/util/gltf/parseNodeHierarchy.js";
import {assertQuatAlmostEquals, assertVecAlmostEquals} from "../../../shared/asserts.js";

Deno.test({
	name: "basic scene",
	fn() {
		const {entity, entityNodeIds} = parseScenes([
			{
				name: "Scene",
				nodes: [0, 1],
			},
		], [
			{
				name: "Node 0",
			},
			{
				name: "Node 1",
				children: [2],
			},
			{
				name: "Node 2",
			},
		], {});

		assertEquals(entity.childCount, 1);
		const scene = entity.children[0];

		assertEquals(scene.name, "Scene");
		assertEquals(scene.childCount, 2);

		const node0 = scene.children[0];
		assertEquals(node0.name, "Node 0");
		assertEquals(node0.childCount, 0);

		const node1 = scene.children[1];
		assertEquals(node1.name, "Node 1");
		assertEquals(node1.childCount, 1);

		const node2 = node1.children[0];
		assertEquals(node2.name, "Node 2");
		assertEquals(node2.childCount, 0);

		assertEquals(entityNodeIds.size, 3);
		assertEquals(entityNodeIds.get(node0), 0);
		assertEquals(entityNodeIds.get(node1), 1);
		assertEquals(entityNodeIds.get(node2), 2);
	},
});

Deno.test({
	name: "Translated entity",
	fn() {
		const {entity} = parseScenes([
			{
				name: "Scene",
				nodes: [0],
			},
		], [
			{
				name: "Node 0",
				translation: [1, 2, 3],
			},
		], {});

		const node0 = entity.children[0].children[0];
		assertEquals(node0.name, "Node 0");
		assertVecAlmostEquals(node0.pos, [1, 2, 3]);
	},
});

Deno.test({
	name: "Scaled entity",
	fn() {
		const {entity} = parseScenes([
			{
				name: "Scene",
				nodes: [0],
			},
		], [
			{
				name: "Node 0",
				scale: [1, 2, 3],
			},
		], {});

		const node0 = entity.children[0].children[0];
		assertEquals(node0.name, "Node 0");
		assertVecAlmostEquals(node0.scale, [1, 2, 3]);
	},
});

Deno.test({
	name: "Rotated entity",
	fn() {
		const {entity} = parseScenes([
			{
				name: "Scene",
				nodes: [0],
			},
		], [
			{
				name: "Node 0",
				rotation: [0, 0, 1, 0],
			},
		], {});

		const node0 = entity.children[0].children[0];
		assertEquals(node0.name, "Node 0");
		assertQuatAlmostEquals(node0.rot, [0, 0, 1, 0]);
	},
});

Deno.test({
	name: "Entity with matrix",
	fn() {
		const {entity} = parseScenes([
			{
				name: "Scene",
				nodes: [0],
			},
		], [
			{
				name: "Node 0",
				matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 2, 3, 1],
			},
		], {});

		const node0 = entity.children[0].children[0];
		assertEquals(node0.name, "Node 0");
		assertVecAlmostEquals(node0.pos, [1, 2, 3]);
	},
});

Deno.test({
	name: "Matrix takes precedence when both a matrix and scale have been set",
	fn() {
		const {entity} = parseScenes([
			{
				name: "Scene",
				nodes: [0],
			},
		], [
			{
				name: "Node 0",
				scale: [1, 2, 3],
				matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 2, 3, 1],
			},
		], {});

		const node0 = entity.children[0].children[0];
		assertEquals(node0.name, "Node 0");
		assertVecAlmostEquals(node0.scale, [1, 1, 1]);
		assertVecAlmostEquals(node0.pos, [1, 2, 3]);
	},
});

Deno.test({
	name: "two scenes",
	fn() {
		const {entity, entityNodeIds} = parseScenes([
			{
				name: "Scene 0",
				nodes: [0],
			},
			{
				name: "Scene 1",
				nodes: [1],
			},
		], [
			{
				name: "Node 0",
			},
			{
				name: "Node 1",
			},
		], {});

		assertEquals(entity.childCount, 2);
		const scene1 = entity.children[0];
		const scene2 = entity.children[1];

		assertEquals(scene1.name, "Scene 0");
		assertEquals(scene1.childCount, 1);

		const node0 = scene1.children[0];
		assertEquals(node0.name, "Node 0");
		assertEquals(node0.childCount, 0);

		assertEquals(scene2.name, "Scene 1");
		assertEquals(scene2.childCount, 1);

		const node1 = scene2.children[0];
		assertEquals(node1.name, "Node 1");
		assertEquals(node1.childCount, 0);

		assertEquals(entityNodeIds.size, 2);
		assertEquals(entityNodeIds.get(node0), 0);
		assertEquals(entityNodeIds.get(node1), 1);
	},
});

Deno.test({
	name: "two scenes with shared root nodes",
	fn() {
		const {entity, entityNodeIds} = parseScenes([
			{
				name: "Scene 0",
				nodes: [0, 1],
			},
			{
				name: "Scene 1",
				nodes: [0, 2],
			},
		], [
			{
				name: "Node 0",
			},
			{
				name: "Node 1",
			},
			{
				name: "Node 2",
			},
		], {});

		assertEquals(entity.childCount, 2);
		const scene0 = entity.children[0];
		const scene1 = entity.children[1];

		assertEquals(scene0.name, "Scene 0");
		assertEquals(scene0.childCount, 2);
		const scene0node0 = scene0.children[0];
		const scene0node1 = scene0.children[1];
		assertEquals(scene0node0.name, "Node 0");
		assertEquals(scene0node0.childCount, 0);
		assertEquals(scene0node1.name, "Node 1");
		assertEquals(scene0node1.childCount, 0);

		assertEquals(scene1.name, "Scene 1");
		assertEquals(scene1.childCount, 2);
		const scene1node0 = scene1.children[0];
		const scene1node2 = scene1.children[1];
		assertEquals(scene1node0.name, "Node 0");
		assertEquals(scene1node0.childCount, 0);
		assertEquals(scene1node2.name, "Node 2");
		assertEquals(scene1node2.childCount, 0);

		assertNotStrictEquals(scene0.children[0], scene1.children[0]);

		assertEquals(entityNodeIds.size, 4);
		assertEquals(entityNodeIds.get(scene0node0), 0);
		assertEquals(entityNodeIds.get(scene0node1), 1);
		assertEquals(entityNodeIds.get(scene1node0), 0);
		assertEquals(entityNodeIds.get(scene1node2), 2);
	},
});

Deno.test({
	name: "pointer to non existent node",
	fn() {
		assertThrows(() => {
			parseScene({
				nodes: [1],
			}, [{}], {});
		}, Error, "Failed to load glTF. Pointer to node with index 1 does not exist.");
	},
});

Deno.test({
	name: "circular reference",
	fn() {
		assertThrows(() => {
			parseScene({
				nodes: [0],
			}, [
				{
					children: [1],
				},
				{
					children: [0],
				},
			], {});
		}, Error, `Failed to load glTF. Node 0 is referenced multiple times.`);
	},
});

Deno.test({
	name: "circular reference with node names",
	fn() {
		assertThrows(() => {
			parseScene({
				nodes: [0],
			}, [
				{
					name: "Named node 0",
					children: [1],
				},
				{
					name: "Named node 1",
					children: [0],
				},
			], {});
		}, Error, `Failed to load glTF. "Named node 0" is referenced multiple times.`);
	},
});

// Files are not allowed to have nodes as root in one scene and not in another
// but our parser supports loading this anyway.
Deno.test({
	name: "node that is root in one scene and not in another",
	fn() {
		const {entity, entityNodeIds} = parseScenes([
			{
				name: "Scene 0",
				nodes: [0],
			},
			{
				name: "Scene 1",
				nodes: [1],
			},
		], [
			{
				name: "Node 0",
			},
			{
				name: "Node 1",
				children: [0],
			},
		], {});

		assertEquals(entity.childCount, 2);
		const scene0 = entity.children[0];
		const scene1 = entity.children[1];

		assertEquals(scene0.name, "Scene 0");
		assertEquals(scene0.childCount, 1);
		const node0 = scene0.children[0];
		assertEquals(node0.name, "Node 0");
		assertEquals(node0.childCount, 0);

		assertEquals(scene1.name, "Scene 1");
		assertEquals(scene1.childCount, 1);
		const node1 = scene1.children[0];
		assertEquals(node1.name, "Node 1");
		assertEquals(node1.childCount, 1);
		const node0Child = node1.children[0];
		assertEquals(node0Child.name, "Node 0");
		assertEquals(node0Child.childCount, 0);

		assertEquals(entityNodeIds.size, 3);
		assertEquals(entityNodeIds.get(node0), 0);
		assertEquals(entityNodeIds.get(node1), 1);
		assertEquals(entityNodeIds.get(node0Child), 0);
	},
});
