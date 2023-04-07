import {Vec2} from "../../math/Vec2.js";
import {Vec3} from "../../math/Vec3.js";
import {Mesh} from "../../core/Mesh.js";

/**
 * @param {object} options
 * @param {import("../../rendering/VertexState.js").VertexState?} [options.vertexState]
 * @param {number} [options.width]
 * @param {number} [options.height]
 * @param {number} [options.widthSegments]
 * @param {number} [options.heightSegments]
 */
export function createPlane({
	vertexState = null,
	width = 1,
	height = 1,
	widthSegments = 1,
	heightSegments = 1,
} = {}) {
	/** @type {Vec3[]} */
	const positions = [];
	/** @type {Vec3[]} */
	const normals = [];
	/** @type {Vec2[]} */
	const uvs = [];
	/** @type {number[]} */
	const indices = [];
	/** @type {Vec3[]} */
	const tangents = [];
	/** @type {Vec3[]} */
	const bitangents = [];

	for (let x = 0; x <= widthSegments; x++) {
		for (let y = 0; y <= heightSegments; y++) {
			const u = x / widthSegments;
			const v = y / heightSegments;

			const xPos = (u - 0.5) * width;
			const yPos = (v - 0.5) * height;
			const pos = new Vec3(xPos, 0, yPos);
			positions.push(pos);

			normals.push(new Vec3(0, 1, 0));
			uvs.push(new Vec2(u, v));
			tangents.push(new Vec3(1, 0, 0));
			bitangents.push(new Vec3(0, 0, -1));
		}
	}

	for (let x = 0; x < widthSegments; x++) {
		for (let y = 0; y < heightSegments; y++) {
			const bottomLeft = y + x * (heightSegments + 1);
			const topLeft = bottomLeft + 1;
			const bottomRight = bottomLeft + heightSegments + 1;
			const topRight = bottomRight + 1;
			indices.push(
				bottomLeft, topLeft, bottomRight,
				topLeft, topRight, bottomRight
			);
		}
	}

	const mesh = new Mesh();
	mesh.setVertexCount(positions.length);
	if (vertexState) mesh.setVertexState(vertexState);
	mesh.setIndexData(indices);
	mesh.setVertexData(Mesh.AttributeType.POSITION, positions, {unusedFormat: Mesh.AttributeFormat.FLOAT32, unusedComponentCount: 3});
	mesh.setVertexData(Mesh.AttributeType.NORMAL, normals, {unusedFormat: Mesh.AttributeFormat.FLOAT32, unusedComponentCount: 3});
	mesh.setVertexData(Mesh.AttributeType.UV1, uvs, {unusedFormat: Mesh.AttributeFormat.FLOAT32, unusedComponentCount: 2});
	mesh.setVertexData(Mesh.AttributeType.TANGENT, tangents, {unusedFormat: Mesh.AttributeFormat.FLOAT32, unusedComponentCount: 3});
	mesh.setVertexData(Mesh.AttributeType.BITANGENT, bitangents, {unusedFormat: Mesh.AttributeFormat.FLOAT32, unusedComponentCount: 3});
	return mesh;
}
