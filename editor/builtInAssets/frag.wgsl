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

[[stage(fragment)]]
fn main() -> void {
	var color : vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
	for(var i : i32 = 0; i < 2; i = i + 1){
		const light : Light = lights.lights[i];
		const deltaLightPos : vec3<f32> = light.pos - vWorldPos;
		const lightDir : vec3<f32> = normalize(deltaLightPos);
		const lightDist : f32 = length(deltaLightPos);
		const attenuation : f32 = 1.0 / (lightDist * lightDist);

		const NdotL : f32 = max(dot(normal, lightDir), 0.0);

		color = color + light.col * NdotL * attenuation;
	}

	var gamma : f32 = 1.0/2.2;
	color = pow(color, vec3<f32>(gamma, gamma, gamma));
	outColor = vec4<f32>(color, 1.0);
	return;
}
