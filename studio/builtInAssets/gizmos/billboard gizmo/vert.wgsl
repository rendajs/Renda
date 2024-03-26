// file://./../../shaders/wgsl/materials/structs/viewUniforms.wgsl
// @import 41eaba39-e2aa-48a3-8deb-47f410542bc2
// file://./../../shaders/wgsl/materials/structs/modelUniforms.wgsl
// @import 08a38e5b-b2b9-44be-9194-f404f815445f

struct VertexInput {
	@location(0) position : vec3<f32>,
	@location(1) color : vec3<f32>,
};

struct VertexOutput {
	@builtin(position) position : vec4<f32>,
	@location(0) color : vec3<f32>,
};

@vertex
fn main(input : VertexInput) -> VertexOutput {
	var vertOut : VertexOutput;
	var objPos = modelUniforms.modelMatrix[3];
	var screenPos = viewUniforms.viewProjectionMatrix * objPos;
	screenPos /= screenPos.w;
	vertOut.position = vec4<f32>(screenPos.xy + input.position.xy / viewUniforms.screenSize.xy, 0.0, 1.0);
	vertOut.color = input.color;
	return vertOut;
}
