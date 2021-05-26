[[block]] struct ViewUniforms {
	[[offset(0)]] screenSize : vec2<f32>;
};
[[group(0), binding(0)]] var<uniform> viewUniforms : ViewUniforms;

[[block]] struct ObjectUniforms {
	[[offset(0)]] mvp : mat4x4<f32>;
	[[offset(64)]] vp : mat4x4<f32>;
	[[offset(128)]] m : mat4x4<f32>;
};
[[group(2), binding(0)]] var<uniform> objectUniforms : ObjectUniforms;

[[location(0)]] var<in> vertexPos : vec3<f32>;
[[location(1)]] var<in> vertexColor : vec3<f32>;

[[builtin(position)]] var<out> outPos : vec4<f32>;
[[location(0)]] var<out> vertexColorOut : vec3<f32>;

[[stage(vertex)]]
fn main() -> void {
	var objPos : vec4<f32> = objectUniforms.m[3];
	outPos = objectUniforms.vp * objPos;
	const w : f32 = outPos.w;
	outPos = outPos / vec4<f32>(w,w,w,w);
	outPos.x = outPos.x + vertexPos.x / viewUniforms.screenSize.x;
	outPos.y = outPos.y + vertexPos.y / viewUniforms.screenSize.y;
	outPos = vec4<f32>(outPos.xy, 0.0, 1.0);
	vertexColorOut = vertexColor;
	return;
}
