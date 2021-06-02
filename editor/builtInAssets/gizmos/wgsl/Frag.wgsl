struct FragmentInput {
	[[location(0)]] color : vec3<f32>;
};

struct FragmentOutput {
	[[location(0)]] color : vec4<f32>;
};

[[stage(fragment)]]
fn main(input : FragmentInput) -> FragmentOutput {
	var fragOut : FragmentOutput;
	fragOut.color = vec4<f32>(input.color, 1.0);
	return fragOut;
}
