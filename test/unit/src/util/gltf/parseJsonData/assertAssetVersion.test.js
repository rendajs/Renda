import {assertRejects} from "std/testing/asserts.ts";
import {parseJsonData} from "../../../../../../src/util/gltf/parseJsonData.js";
import {getBasicOptions} from "./shared.js";

Deno.test({
	name: "version 2.0 no minVersion",
	async fn() {
		await parseJsonData({
			asset: {
				version: "2.0",
			},
		}, getBasicOptions());
	},
});

Deno.test({
	name: "version 2.0 minVersion 2.0",
	async fn() {
		await parseJsonData({
			asset: {
				version: "2.0",
				minVersion: "2.0",
			},
		}, getBasicOptions());
	},
});

Deno.test({
	name: "invalid version string",
	async fn() {
		await assertRejects(async () => {
			await parseJsonData({
				asset: {
					version: "notanumber",
				},
			}, getBasicOptions());
		}, Error, "Failed to parse glTF version string: notanumber");
	},
});

Deno.test({
	name: "invalid minVersion string",
	async fn() {
		await assertRejects(async () => {
			await parseJsonData({
				asset: {
					version: "2.0",
					minVersion: "notanumber",
				},
			}, getBasicOptions());
		}, Error, "Failed to parse glTF version string: notanumber");
	},
});

Deno.test({
	name: "higher major version",
	async fn() {
		await assertRejects(async () => {
			await parseJsonData({
				asset: {
					version: "3.0",
				},
			}, getBasicOptions());
		}, Error, "The asset targets a higher major glTF version: 3.0");
	},
});

Deno.test({
	name: "higher minor version",
	async fn() {
		await parseJsonData({
			asset: {
				version: "2.1",
			},
		}, getBasicOptions());
	},
});

Deno.test({
	name: "higher major minVersion",
	async fn() {
		await assertRejects(async () => {
			await parseJsonData({
				asset: {
					version: "2.0",
					minVersion: "3.0",
				},
			}, getBasicOptions());
		}, Error, "The asset requires a newer glTF version: 3.0");
	},
});

Deno.test({
	name: "higher minor minVersion",
	async fn() {
		await assertRejects(async () => {
			await parseJsonData({
				asset: {
					version: "2.0",
					minVersion: "2.1",
				},
			}, getBasicOptions());
		}, Error, "The asset requires a newer glTF version: 2.1");
	},
});
