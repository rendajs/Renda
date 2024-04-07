import { Entity } from "../../core/Entity.js";

/**
 * Parses a list of scenes and puts them into a single entity.
 * @param {import("./gltfParsing.js").GltfSceneData[]} scenes
 * @param {import("./gltfParsing.js").GltfNodeData[]} nodes
 * @param {import("./gltfParsing.js").ParseGltfHooks} hooks
 */
export function parseScenes(scenes, nodes, hooks) {
	const entity = new Entity();
	/** @type {Map<Entity, number>} */
	const entityNodeIds = new Map();
	for (const scene of scenes) {
		const { sceneEntity, createdEntities } = parseScene(scene, nodes, hooks);
		entity.add(sceneEntity);
		for (const [nodeId, node] of createdEntities) {
			entityNodeIds.set(node, nodeId);
		}
	}
	return { entity, entityNodeIds };
}

/**
 * Creates a single entity representing a scene and fills in its children.
 * @param {import("./gltfParsing.js").GltfSceneData} scene
 * @param {import("./gltfParsing.js").GltfNodeData[]} nodes
 * @param {import("./gltfParsing.js").ParseGltfHooks} hooks
 */
export function parseScene(scene, nodes, hooks) {
	const sceneEntity = new Entity({
		name: scene.name ?? "Scene",
	});

	/** @type {Map<number, Entity>} */
	const createdEntities = new Map();
	if (scene.nodes) {
		for (const nodeId of scene.nodes) {
			const child = parseNodeRecursive(nodeId, nodes, createdEntities, hooks);
			if (child.parent) {
				const node = nodes[nodeId];
				let nodeText;
				if (node.name) {
					nodeText = `"${node.name}"`;
				} else {
					nodeText = `Node ${nodeId}`;
				}
				throw new Error(`Failed to load glTF. ${nodeText} is referenced multiple times.`);
			}
			sceneEntity.add(child);
		}
	}
	return {
		sceneEntity,
		createdEntities,
	};
}

/**
 * @param {number} nodeId
 * @param {import("./gltfParsing.js").GltfNodeData[]} nodes
 * @param {Map<number, Entity>} createdEntities
 * @param {import("./gltfParsing.js").ParseGltfHooks} hooks
 */
function parseNodeRecursive(nodeId, nodes, createdEntities, hooks) {
	const existing = createdEntities.get(nodeId);
	if (existing) return existing;

	if (nodeId < 0 || nodeId >= nodes.length) {
		throw new Error(`Failed to load glTF. Pointer to node with index ${nodeId} does not exist.`);
	}
	const nodeData = nodes[nodeId];
	/** @type {import("../../core/Entity.js").CreateEntityOptions} */
	const entityOptions = {};
	if (nodeData.name !== undefined) {
		entityOptions.name = nodeData.name;
	}
	const entity = new Entity(entityOptions);
	createdEntities.set(nodeId, entity);

	if (nodeData.matrix) {
		entity.localMatrix.set(nodeData.matrix);
	} else {
		if (nodeData.translation) {
			entity.pos.set(nodeData.translation);
		}
		if (nodeData.scale) {
			entity.scale.set(nodeData.scale);
		}
		if (nodeData.rotation) {
			entity.rot.set(nodeData.rotation);
		}
	}

	if (nodeData.children) {
		for (const childId of nodeData.children) {
			const child = parseNodeRecursive(childId, nodes, createdEntities, hooks);
			entity.add(child);
		}
	}

	if (hooks.node) {
		hooks.node({ entity, nodeData, nodeId });
	}

	return entity;
}
