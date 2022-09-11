import {assertEquals} from "std/testing/asserts.ts";
import "../../../shared/initializeEditor.js";
import {TaskRunMultiple} from "../../../../../../editor/src/tasks/task/TaskRunMultiple.js";

Deno.test({
	name: "transformUiToAssetData()",
	fn() {
		/** @type {{input: Parameters<TaskRunMultiple.transformUiToAssetData>[0], expected: ReturnType<TaskRunMultiple.transformUiToAssetData>}[]} */
		const tests = [
			{
				input: undefined,
				expected: undefined,
			},
			{
				input: {
					// @ts-expect-error Remove this when #118 is fixed
					taskGroup: {
						parallel: false,
					},
				},
				expected: {
					taskGroup: {
						parallel: false,
					},
				},
			},
			{
				input: {
					// @ts-expect-error Remove this when #118 is fixed
					taskGroup: {
						subTasks: [
							{
								task: "uuid",
							},
						],
					},
				},
				expected: {
					taskGroup: {
						tasks: ["uuid"],
					},
				},
			},
			{
				input: {
					// @ts-expect-error Remove this when #118 is fixed
					taskGroup: {
						task: "uuid",
					},
				},
				expected: {
					taskGroup: {
						tasks: ["uuid"],
					},
				},
			},
		];

		for (const {input, expected} of tests) {
			const actual = TaskRunMultiple.transformUiToAssetData(input);
			assertEquals(actual, expected);
		}
	},
});

Deno.test({
	name: "transformAssetToUiData",
	fn() {
		/** @type {{input: Parameters<TaskRunMultiple.transformAssetToUiData>[0], expected: ReturnType<TaskRunMultiple.transformAssetToUiData>}[]} */
		const tests = [
			{
				input: {
					taskGroup: {
						parallel: true,
						tasks: [
							"uuid",
							{
								parallel: false,
								tasks: [
									"sub uuid",
									{
										tasks: [],
									},
								],
							},
							"uuid2",
						],
					},
				},
				expected: {
					// @ts-expect-error Remove this when #118 is fixed
					taskGroup: {
						parallel: true,
						subTasks: [
							{
								task: "uuid",
							},
							{
								parallel: false,
								subTasks: [
									{
										task: "sub uuid",
									},
									{},
								],
							},
							{
								task: "uuid2",
							},
						],
					},
				},
			},
		];

		for (const {input, expected} of tests) {
			const actual = TaskRunMultiple.transformAssetToUiData(input);
			assertEquals(actual, expected);
		}
	},
});
