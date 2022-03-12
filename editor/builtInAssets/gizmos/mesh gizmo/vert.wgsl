// file://./../../shaders/wgsl/materials/structs/modelUniforms.wgsl
// @import 08a38e5b-b2b9-44be-9194-f404f815445f

struct VertexInput {
	@location(0) position : vec3<f32>;
	@location(1) color : vec3<f32>;
};

struct VertexOutput {
	@builtin(position) position : vec4<f32>;
	@location(0) color : vec3<f32>;
};

@stage(vertex)
fn main(input : VertexInput) -> VertexOutput {
	var vertOut : VertexOutput;
	vertOut.position = modelUniforms.mvp * vec4<f32>(input.position, 1.0);
	vertOut.color = input.color;
	return vertOut;
}
