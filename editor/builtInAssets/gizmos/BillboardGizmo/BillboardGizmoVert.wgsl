// file://./../../shaders/wgsl/materials/structs/viewUniforms.wgsl
// @import 41eaba39-e2aa-48a3-8deb-47f410542bc2
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
	var objPos : vec4<f32> = modelUniforms.m[3];
	vertOut.position = modelUniforms.vp * objPos;
	var w : f32 = vertOut.position.w;
	vertOut.position = vertOut.position / vec4<f32>(w,w,w,w);
	vertOut.position.x = vertOut.position.x + input.position.x / viewUniforms.screenSize.x;
	vertOut.position.y = vertOut.position.y + input.position.y / viewUniforms.screenSize.y;
	vertOut.position.z = vertOut.position.z + input.position.z / viewUniforms.screenSize.z;
	vertOut.position = vec4<f32>(vertOut.position.xyz, 1.0);
	vertOut.color = input.color;
	return vertOut;
}
