import {Mesh} from "../../core/Mesh.js";
import {Vec2} from "../../math/Vec2.js";
import {Vec3} from "../../math/Vec3.js";

/**
 * @param {object} options
 * @param {import("../../rendering/VertexState.js").VertexState?} [options.vertexState]
 */
export function createCube({
	vertexState = null,
} = {}) {
	const mesh = new Mesh();
	mesh.setVertexCount(24);
	if (vertexState) mesh.setVertexState(vertexState);
	mesh.setIndexData([0, 1, 2, 1, 2, 3, 4, 5, 6, 5, 6, 7, 8, 9, 10, 9, 10, 11, 12, 13, 14, 13, 14, 15, 16, 17, 18, 17, 18, 19, 20, 21, 22, 21, 22, 23]);
	mesh.setVertexData(Mesh.AttributeType.POSITION, [
		new Vec3(-1, -1, -1),
		new Vec3(-1, -1, 1),
		new Vec3(-1, 1, -1),
		new Vec3(-1, 1, 1),

		new Vec3(1, -1, -1),
		new Vec3(1, -1, 1),
		new Vec3(1, 1, -1),
		new Vec3(1, 1, 1),

		new Vec3(-1, -1, -1),
		new Vec3(-1, -1, 1),
		new Vec3(1, -1, -1),
		new Vec3(1, -1, 1),

		new Vec3(-1, 1, -1),
		new Vec3(-1, 1, 1),
		new Vec3(1, 1, -1),
		new Vec3(1, 1, 1),

		new Vec3(-1, -1, -1),
		new Vec3(-1, 1, -1),
		new Vec3(1, -1, -1),
		new Vec3(1, 1, -1),

		new Vec3(-1, -1, 1),
		new Vec3(-1, 1, 1),
		new Vec3(1, -1, 1),
		new Vec3(1, 1, 1),
	], {unusedFormat: Mesh.AttributeFormat.FLOAT32, unusedComponentCount: 3});
	mesh.setVertexData(Mesh.AttributeType.NORMAL, [
		new Vec3(-1, 0, 0),
		new Vec3(-1, 0, 0),
		new Vec3(-1, 0, 0),
		new Vec3(-1, 0, 0),

		new Vec3(1, 0, 0),
		new Vec3(1, 0, 0),
		new Vec3(1, 0, 0),
		new Vec3(1, 0, 0),

		new Vec3(0, -1, 0),
		new Vec3(0, -1, 0),
		new Vec3(0, -1, 0),
		new Vec3(0, -1, 0),

		new Vec3(0, 1, 0),
		new Vec3(0, 1, 0),
		new Vec3(0, 1, 0),
		new Vec3(0, 1, 0),

		new Vec3(0, 0, -1),
		new Vec3(0, 0, -1),
		new Vec3(0, 0, -1),
		new Vec3(0, 0, -1),

		new Vec3(0, 0, 1),
		new Vec3(0, 0, 1),
		new Vec3(0, 0, 1),
		new Vec3(0, 0, 1),
	], {unusedFormat: Mesh.AttributeFormat.FLOAT32, unusedComponentCount: 3});
	mesh.setVertexData(Mesh.AttributeType.UV1, [
		new Vec2(1, 0),
		new Vec2(0, 0),
		new Vec2(1, 1),
		new Vec2(0, 1),

		new Vec2(0, 0),
		new Vec2(1, 0),
		new Vec2(0, 1),
		new Vec2(1, 1),

		new Vec2(0, 0),
		new Vec2(1, 0),
		new Vec2(0, 1),
		new Vec2(1, 1),

		new Vec2(1, 0),
		new Vec2(0, 0),
		new Vec2(1, 1),
		new Vec2(0, 1),

		new Vec2(0, 0),
		new Vec2(0, 1),
		new Vec2(1, 0),
		new Vec2(1, 1),

		new Vec2(1, 0),
		new Vec2(1, 1),
		new Vec2(0, 0),
		new Vec2(0, 1),
	], {unusedFormat: Mesh.AttributeFormat.FLOAT32, unusedComponentCount: 2});
	return mesh;
}
