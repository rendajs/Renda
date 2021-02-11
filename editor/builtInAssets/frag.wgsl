[[location(0)]] var<in> normal : vec3<f32>;

[[location(0)]] var<out> outColor : vec4<f32>;

const lightDir : vec3<f32> = vec3<f32>(0.0, 1.0, 1.0);

[[stage(fragment)]]
fn main() -> void {
	var brightness : f32 = dot(normalize(normal), normalize(lightDir));
	outColor = vec4<f32>(brightness, brightness, brightness, 1.0);
	return;
}
