[[location(0)]] var<in> vertexColor : vec3<f32>;
[[location(0)]] var<out> outColor : vec4<f32>;

[[stage(fragment)]]
fn main() -> void {
	outColor = vec4<f32>(vertexColor, 1.0);
	return;
}
