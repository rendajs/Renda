import {Mesh} from "../../../../../src/mod.js";

export class FakeVertexState {
	/**
	 * @param {unknown[]} buffers
	 */
	constructor(buffers) {
		this.buffers = buffers;
	}
}

export const mockVertexStateSingleAttribute = /** @type {import("../../../../../src/mod.js").VertexState} */ (new FakeVertexState([
	{
		attributes: new Map([
			[
				Mesh.AttributeType.POSITION,
				{
					attributeType: Mesh.AttributeType.POSITION,
					offset: 0,
					format: Mesh.AttributeFormat.FLOAT32,
					componentCount: 3,
				},
			],
		]),
	},
]));

export const mockVertexStateTwoAttributes = /** @type {import("../../../../../src/mod.js").VertexState} */ (new FakeVertexState([
	{
		attributes: new Map([
			[
				Mesh.AttributeType.POSITION,
				{
					attributeType: Mesh.AttributeType.POSITION,
					offset: 0,
					format: Mesh.AttributeFormat.FLOAT32,
					componentCount: 3,
				},
			],
			[
				Mesh.AttributeType.NORMAL,
				{
					attributeType: Mesh.AttributeType.NORMAL,
					offset: 12,
					format: Mesh.AttributeFormat.FLOAT32,
					componentCount: 3,
				},
			],
		]),
	},
]));

export const mockVertexStateUv = /** @type {import("../../../../../src/mod.js").VertexState} */ (new FakeVertexState([
	{
		attributes: new Map([
			[
				Mesh.AttributeType.UV1,
				{
					attributeType: Mesh.AttributeType.UV1,
					offset: 0,
					format: Mesh.AttributeFormat.FLOAT32,
					componentCount: 2,
				},
			],
		]),
	},
]));

export const mockVertexStateColor = /** @type {import("../../../../../src/mod.js").VertexState} */ (new FakeVertexState([
	{
		attributes: new Map([
			[
				Mesh.AttributeType.COLOR,
				{
					attributeType: Mesh.AttributeType.COLOR,
					offset: 0,
					format: Mesh.AttributeFormat.FLOAT32,
					componentCount: 4,
				},
			],
		]),
	},
]));
