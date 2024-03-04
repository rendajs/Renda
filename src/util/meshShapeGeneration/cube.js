import { Mesh } from "../../core/Mesh.js";
import { Vec2 } from "../../math/Vec2.js";
import { Vec3 } from "../../math/Vec3.js";

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
	mesh.setIndexData([0, 1, 2, 1, 3, 2, 4, 6, 5, 5, 6, 7, 8, 10, 9, 9, 10, 11, 12, 13, 14, 13, 15, 14, 16, 17, 18, 17, 19, 18, 20, 22, 21, 21, 22, 23]);
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
	], { unusedFormat: Mesh.AttributeFormat.FLOAT32, unusedComponentCount: 3 });
	mesh.setVertexData(Mesh.AttributeType.UV1, [
		new Vec2(0, 0),
		new Vec2(1, 0),
		new Vec2(0, 1),
		new Vec2(1, 1),

		new Vec2(1, 0),
		new Vec2(0, 0),
		new Vec2(1, 1),
		new Vec2(0, 1),

		new Vec2(1, 0),
		new Vec2(0, 0),
		new Vec2(1, 1),
		new Vec2(0, 1),

		new Vec2(0, 0),
		new Vec2(1, 0),
		new Vec2(0, 1),
		new Vec2(1, 1),

		new Vec2(1, 0),
		new Vec2(1, 1),
		new Vec2(0, 0),
		new Vec2(0, 1),

		new Vec2(0, 0),
		new Vec2(0, 1),
		new Vec2(1, 0),
		new Vec2(1, 1),
	], { unusedFormat: Mesh.AttributeFormat.FLOAT32, unusedComponentCount: 2 });

	const singleNormals = [
		new Vec3(-1, 0, 0),
		new Vec3(1, 0, 0),
		new Vec3(0, -1, 0),
		new Vec3(0, 1, 0),
		new Vec3(0, 0, -1),
		new Vec3(0, 0, 1),
	];
	const singleTangents = [
		new Vec3(0, 0, 1),
		new Vec3(0, 0, -1),
		new Vec3(0, 0, -1),
		new Vec3(0, 0, 1),
		new Vec3(-1, 0, 0),
		new Vec3(1, 0, 0),
	];
	const singleBitangents = [
		new Vec3(0, 1, 0),
		new Vec3(0, 1, 0),
		new Vec3(-1, 0, 0),
		new Vec3(1, 0, 0),
		new Vec3(0, -1, 0),
		new Vec3(0, -1, 0),
	];

	const normals = [];
	const tangents = [];
	const bitangents = [];
	for (let i = 0; i < 6; i++) {
		for (let j = 0; j < 4; j++) {
			normals.push(singleNormals[i]);
			tangents.push(singleTangents[i]);
			bitangents.push(singleBitangents[i]);
		}
	}
	mesh.setVertexData(Mesh.AttributeType.NORMAL, normals, { unusedFormat: Mesh.AttributeFormat.FLOAT32, unusedComponentCount: 3 });
	mesh.setVertexData(Mesh.AttributeType.TANGENT, tangents, { unusedFormat: Mesh.AttributeFormat.FLOAT32, unusedComponentCount: 3 });
	mesh.setVertexData(Mesh.AttributeType.BITANGENT, bitangents, { unusedFormat: Mesh.AttributeFormat.FLOAT32, unusedComponentCount: 3 });
	return mesh;
}
