[[block]] struct Light {
	[[offset(0)]] pos : vec3<f32>;
};
[[block]] struct Lights {
	[[offset(0)]] lights : [[stride(16)]] array<Light, 2>;
};
[[group(0), binding(1)]] var<storage_buffer> lights : [[access(read)]] Lights;

[[location(0)]] var<in> normal : vec3<f32>;

[[location(0)]] var<out> outColor : vec4<f32>;

const lightDir : vec3<f32> = vec3<f32>(0.0, 1.0, 1.0);

[[stage(fragment)]]
fn main() -> void {
	var brightness : f32 = 0.0;
	for(var i : i32 = 0; i < 2; i = i + 1){
		var dist : f32 = length(lights.lights[i].pos - normal);
		brightness = brightness + max(0.0, 1.0 - dist);
	}
	outColor = vec4<f32>(brightness, brightness, brightness, 1.0);
	return;
}
