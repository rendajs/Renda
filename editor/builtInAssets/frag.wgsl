[[block]] struct Light {
	[[offset(0)]] pos : vec3<f32>;
	[[offset(16)]] col : vec3<f32>;
};
[[block]] struct Lights {
	[[offset(0)]] lights : [[stride(32)]] array<Light, 2>;
};
[[group(0), binding(1)]] var<storage_buffer> lights : [[access(read)]] Lights;

[[location(0)]] var<in> vWorldPos : vec3<f32>;
[[location(1)]] var<in> normal : vec3<f32>;

[[location(0)]] var<out> outColor : vec4<f32>;

const lightDir : vec3<f32> = vec3<f32>(0.0, 1.0, 1.0);

[[stage(fragment)]]
fn main() -> void {
	var color : vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
	for(var i : i32 = 0; i < 2; i = i + 1){
		var light : Light = lights.lights[i];
		var dist : f32 = length(light.pos - vWorldPos);
		var attenuation : f32 = 1.0 / (dist * dist);
		color = color + vec3<f32>(attenuation, attenuation, attenuation) * light.col;
	}

	var gamma : f32 = 1.0/2.2;
	color = pow(color, vec3<f32>(gamma, gamma, gamma));
	outColor = vec4<f32>(color, 1.0);
	return;
}
