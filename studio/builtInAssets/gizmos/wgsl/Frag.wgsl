struct MaterialUniforms {
	colorMultiplier : vec3<f32>,
};
@group(1) @binding(0)
var<uniform> materialUniforms : MaterialUniforms;

struct FragmentInput {
	@location(0) color : vec3<f32>,
};

struct FragmentOutput {
	@location(0) color : vec4<f32>,
};

@fragment
fn main(input : FragmentInput) -> FragmentOutput {
	var fragOut : FragmentOutput;
	fragOut.color = vec4<f32>(input.color * materialUniforms.colorMultiplier, 1.0);
	return fragOut;
}
