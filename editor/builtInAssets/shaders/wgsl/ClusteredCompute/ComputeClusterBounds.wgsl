// file://./../materials/structs/viewUniforms.wgsl
// @import 41eaba39-e2aa-48a3-8deb-47f410542bc2

// file://./../materials/structs/lightUniforms.wgsl
// @import 8cd64104-1d45-4536-972a-5685a2523725

// file://./ClusterBoundsStruct.wgsl
// @import 26ace8e7-7181-4e44-b507-f723b3567e9d

const clusterCount : vec3<u32> = vec3<u32>(${clusterCountX}u, ${clusterCountY}u, ${clusterCountZ}u);

fn screen2View(screen : vec2<f32>) -> vec3<f32> {
	let flippedScreen : vec2<f32> = vec2<f32>(screen.x, 1.0 - screen.y);
	let clip : vec4<f32> = vec4<f32>(flippedScreen.xy * 2.0 - vec2<f32>(1.0, 1.0), 1.0, 1.0);
	var view : vec4<f32> = viewUniforms.inverseProjectionMatrix * clip;
	view = view / vec4<f32>(view.w, view.w, view.w, view.w);
	return view.xyz;
}

//todo: use a more efficient workgroup size
@compute @workgroup_size(1u,1u,1u)
fn main(@builtin(global_invocation_id) globalId : vec3<u32>) {
	let clusterSize : vec3<f32> = vec3<f32>(1.0, 1.0, 1.0) / vec3<f32>(clusterCount.xyz);

	let minPointScreen : vec2<f32> = vec2<f32>(globalId.xy) * clusterSize.xy;
	let maxPointScreen : vec2<f32> = (vec2<f32>(globalId.xy) + vec2<f32>(1.0, 1.0)) * clusterSize.xy;

	let minPointView : vec3<f32> = screen2View(minPointScreen);
	let maxPointView : vec3<f32> = screen2View(maxPointScreen);

	let near : f32 = viewUniforms.clippingPanes.x;
	let far : f32 = viewUniforms.clippingPanes.y;
	let clusterNear : f32 = near * pow(far / near, f32(globalId.z) / f32(clusterCount.z));
	let clusterFar : f32 = near * pow(far / near, f32(globalId.z + 1u) / f32(clusterCount.z));

	let minNear : vec3<f32> = minPointView * (clusterNear / far);
	let maxNear : vec3<f32> = maxPointView * (clusterNear / far);
	let minFar : vec3<f32> = minPointView * (clusterFar / far);
	let maxFar : vec3<f32> = maxPointView * (clusterFar / far);

	let clusterIndex : u32 = globalId.x + globalId.y * clusterCount.x + globalId.z * clusterCount.x * clusterCount.y;
	clusterBounds.bounds[clusterIndex].min = min(min(minNear, maxNear),min(minFar, maxFar));
	clusterBounds.bounds[clusterIndex].max = max(max(minNear, maxNear),max(minFar, maxFar));
	return;
}
