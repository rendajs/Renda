// file://./../../../shaders/wgsl/materials/structs/viewUniforms.wgsl
// @import 41eaba39-e2aa-48a3-8deb-47f410542bc2

struct FragmentInput {
	@location(0) vWorldPos : vec3<f32>,
};

struct FragmentOutput {
	@location(0) color : vec4<f32>,
};

/// Creates a curve used for fading out the grid lines.
fn grid1d(x: f32) -> f32 {
	// fwidth makes sure all the lines have the same thickness regardless of the distance of the camera.
	var fw = fwidth(x);

	var grid = 1.0 - abs(fract(x - 0.5) - 0.5) / fw;

	// var dist = length(viewUniforms.camPos - input.vWorldPos);
	// To reduce aliasing further, we make lines brighter the further away they are from the camera.
	// This way they quickly reach a brightness so that the mesh has one single color
	grid *= max(1.0, fw * 2.0);
	grid = clamp(grid, 0.0, 1.0);

	// Then we'll fade it out near the distance, otherwise it's way too bright
	grid *= clamp(1.0 - fw * 0.7, 0.5, 1.0);

	return grid;
}

@fragment
fn main(input: FragmentInput) -> FragmentOutput {
	var fragOut : FragmentOutput;

	var coord = input.vWorldPos.xz;
	var grid2d = vec2<f32>(grid1d(input.vWorldPos.x), grid1d(input.vWorldPos.z));
	var grid = max(grid2d.x, grid2d.y);

	var dist = length(viewUniforms.camPos - input.vWorldPos);
	var falloffStart = 3.0;
	var falloff = clamp(15.0 / max(dist - falloffStart, 0.0001), 0.0, 1.0);
	grid *= falloff;

	// TODO: Make the color configurable
	var color = vec3<f32>(0.5, 0.5, 0.5);
	fragOut.color = vec4<f32>(color.rgb * grid, 1.0);
	return fragOut;
}
