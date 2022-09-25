import {assertSpyCall, assertSpyCalls} from "std/testing/mock.ts";
import {registerOnChangeSpy} from "../shared.js";
import {createBasicFs} from "./shared.js";

Deno.test({
	name: "setRootName should fire onChange event",
	async fn() {
		const fs = await createBasicFs();
		const onChangeSpy = registerOnChangeSpy(fs);

		await fs.setRootName("new root name");

		assertSpyCalls(onChangeSpy, 1);
		assertSpyCall(onChangeSpy, 0, {
			args: [
				{
					external: false,
					kind: "directory",
					path: [],
					type: "changed",
				},
			],
		});
	},
});
