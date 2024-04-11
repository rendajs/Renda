// file://./../../shaders/wgsl/materials/structs/modelUniforms.wgsl
// @import 08a38e5b-b2b9-44be-9194-f404f815445f

struct VertexInput {
	@location(0) position : vec3<f32>,
};

struct VertexOutput {
	@builtin(position) position : vec4<f32>,
	@location(0) vWorldPos : vec3<f32>,
};

@vertex
fn main(input : VertexInput) -> VertexOutput {
	var vertOut : VertexOutput;
	var modelPos = vec4<f32>(input.position, 1.0);
	vertOut.position = modelUniforms.mvpMatrix * modelPos;
	vertOut.vWorldPos = (modelUniforms.modelMatrix * modelPos).xyz;
	return vertOut;
}
