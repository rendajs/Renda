import {Mesh} from "../../core/Mesh.js";
import {Vec2} from "../../math/Vec2.js";
import {Vec3} from "../../math/Vec3.js";

/**
 * @param {Object} options
 * @param {import("../../rendering/VertexState.js").VertexState?} [options.vertexState]
 * @param {number} [options.widthSegments]
 * @param {number} [options.heightSegments]
 */
export function createUvSphere({
	vertexState = null,
	widthSegments = 32,
	heightSegments = 16,
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

	for (let i = 0; i < widthSegments; i++) {
		const isLastColumn = i == widthSegments - 1;

		for (let j = 0; j < heightSegments; j++) {
			const phi = j / (heightSegments - 1) * Math.PI;
			const isFirstRow = j == 0;
			const isLastRow = j == heightSegments - 1;
			const isFirstOrLastRow = isFirstRow || isLastRow;

			// The first and last row will be triangles rather than quads, so we
			// we need to adjust the normal and uv for these vertices.
			// We'll do this by adjusting theta by half a column.
			const thetaExtra = isFirstOrLastRow ? 0 : 0.5;
			const theta = (i + thetaExtra) / (widthSegments - 1) * Math.PI * 2;

			// We want phi to reach from 0 to 2PI, so we'll use
			// heightSegments - 1 to make the last segment go to 2PI.
			const x = Math.cos(theta) * Math.sin(phi);
			const y = Math.cos(phi);
			const z = Math.sin(theta) * Math.sin(phi);
			positions.push(new Vec3(x, y, z));
			normals.push(new Vec3(x, y, z));
			const uv = new Vec2(i / (widthSegments - 1), 1 - j / (heightSegments - 1));
			uvs.push(uv);

			const tangentX = -Math.cos(theta) * Math.cos(phi);
			const tangentY = Math.sin(phi);
			const tangentZ = -Math.sin(theta) * Math.cos(phi);
			tangents.push(new Vec3(tangentX, tangentY, tangentZ));

			const bitangentX = -Math.sin(theta);
			const bitangentY = 0;
			const bitangentZ = Math.cos(theta);
			bitangents.push(new Vec3(bitangentX, bitangentY, bitangentZ));

			const currentIndex = i * heightSegments + j;
			// We don't want any faces for the bottom row since these are already
			// included in the previous row.
			if (!isLastRow) {
				const indexBelow = currentIndex + 1;
				// If this is the second to last column, we want the quad to
				// wrap around the sphere and use the indices from the first column.
				const indexRight = isLastColumn ? j : currentIndex + heightSegments;
				const indexDiagonal = indexRight + 1;
				if (isFirstRow) {
					indices.push(currentIndex, indexBelow, indexDiagonal);
				} else {
					indices.push(currentIndex, indexBelow, indexRight);
					indices.push(indexBelow, indexDiagonal, indexRight);
				}
			}
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
