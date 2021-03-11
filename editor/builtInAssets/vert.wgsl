[[block]] struct Uniforms {
	[[offset(0)]] mvp : mat4x4<f32>;
};

[[binding(0), group(0)]] var<uniform> uniforms : Uniforms;

[[location(0)]] var<in> position : vec4<f32>;

[[builtin(position)]] var<out> Position : vec4<f32>;
[[location(0)]] var<out> normal : vec3<f32>;

[[stage(vertex)]]
fn main() -> void {
	Position = uniforms.mvp * position;
	normal = position.xyz;
	return;
}
