#include 41eaba39-e2aa-48a3-8deb-47f410542bc2
#include 08a38e5b-b2b9-44be-9194-f404f815445f

[[location(0)]] var<in> vertexPos : vec3<f32>;
[[location(1)]] var<in> vertexColor : vec3<f32>;

[[builtin(position)]] var<out> outPos : vec4<f32>;
[[location(0)]] var<out> vertexColorOut : vec3<f32>;

[[stage(vertex)]]
fn main() -> void {
	var objPos : vec4<f32> = modelUniforms.m[3];
	outPos = modelUniforms.vp * objPos;
	const w : f32 = outPos.w;
	outPos = outPos / vec4<f32>(w,w,w,w);
	outPos.x = outPos.x + vertexPos.x / viewUniforms.screenSize.x;
	outPos.y = outPos.y + vertexPos.y / viewUniforms.screenSize.y;
	outPos.z = outPos.z + vertexPos.z / viewUniforms.screenSize.z;
	outPos = vec4<f32>(outPos.xyz, 1.0);
	vertexColorOut = vertexColor;
	return;
}
