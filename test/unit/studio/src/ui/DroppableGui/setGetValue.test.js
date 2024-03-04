import { assertEquals, assertStrictEquals } from "std/testing/asserts.ts";
import { BASIC_ASSET_UUID, DEFAULTASSETLINK_LINK_UUID, createBasicGui } from "./shared.js";
import { createOnChangeEventSpy } from "../shared.js";
import { assertSpyCall, assertSpyCalls } from "std/testing/mock.ts";

Deno.test({
	name: "setValue() to null",
	fn() {
		const { gui, uninstall } = createBasicGui();
		const onChangeSpy = createOnChangeEventSpy(gui);

		try {
			gui.setValue(null);

			assertEquals(gui.projectAssetValue, null);
			assertEquals(gui.defaultAssetLink, null);
			assertEquals(gui.defaultAssetLinkUuid, null);
			assertSpyCalls(onChangeSpy, 1);
			assertSpyCall(onChangeSpy, 0, {
				args: [
					{
						value: null,
						trigger: "application",
					},
				],
			});
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "setValue() with an uuid",
	fn() {
		const { gui, mockProjectAsset, uninstall } = createBasicGui();
		const onChangeSpy = createOnChangeEventSpy(gui);

		try {
			gui.setValue(BASIC_ASSET_UUID);

			assertStrictEquals(gui.projectAssetValue, mockProjectAsset);
			assertEquals(gui.defaultAssetLink, null);
			assertEquals(gui.defaultAssetLinkUuid, null);
			assertSpyCalls(onChangeSpy, 1);
			assertSpyCall(onChangeSpy, 0, {
				args: [
					{
						value: BASIC_ASSET_UUID,
						trigger: "application",
					},
				],
			});
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "setValue() with an invalid uuid",
	fn() {
		const { gui, uninstall } = createBasicGui();
		const onChangeSpy = createOnChangeEventSpy(gui);

		try {
			gui.setValue("invalid");

			assertEquals(gui.projectAssetValue, null);
			assertEquals(gui.defaultAssetLink, null);
			assertEquals(gui.defaultAssetLinkUuid, null);

			// TODO: Make sure this doesn't fire maybe?
			assertSpyCalls(onChangeSpy, 1);
			assertSpyCall(onChangeSpy, 0, {
				args: [
					{
						value: null,
						trigger: "application",
					},
				],
			});
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "setValue() with an uuid and isDiskData = true",
	fn() {
		const { gui, mockProjectAsset, uninstall } = createBasicGui();
		const onChangeSpy = createOnChangeEventSpy(gui);

		try {
			gui.setValue(BASIC_ASSET_UUID, { isDiskData: true });

			assertStrictEquals(gui.projectAssetValue, mockProjectAsset);
			assertEquals(gui.defaultAssetLink, null);
			assertEquals(gui.defaultAssetLinkUuid, null);
			assertSpyCalls(onChangeSpy, 1);
			assertSpyCall(onChangeSpy, 0, {
				args: [
					{
						value: BASIC_ASSET_UUID,
						trigger: "application",
					},
				],
			});
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "setValue() with an assetlink uuid",
	fn() {
		const { gui, mockProjectAsset, mockDefaultAssetLink, uninstall } = createBasicGui();
		const onChangeSpy = createOnChangeEventSpy(gui);

		try {
			gui.setValue(DEFAULTASSETLINK_LINK_UUID);

			assertStrictEquals(gui.projectAssetValue, mockProjectAsset);
			assertStrictEquals(gui.defaultAssetLink, mockDefaultAssetLink);
			assertEquals(gui.defaultAssetLinkUuid, DEFAULTASSETLINK_LINK_UUID);
			assertSpyCalls(onChangeSpy, 1);
			assertSpyCall(onChangeSpy, 0, {
				args: [
					{
						value: DEFAULTASSETLINK_LINK_UUID,
						trigger: "application",
					},
				],
			});
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "setValue() using a ProjectAsset",
	fn() {
		const { gui, mockProjectAsset, uninstall } = createBasicGui();
		const onChangeSpy = createOnChangeEventSpy(gui);

		try {
			gui.setValue(mockProjectAsset);

			assertStrictEquals(gui.projectAssetValue, mockProjectAsset);
			assertEquals(gui.defaultAssetLink, null);
			assertEquals(gui.defaultAssetLinkUuid, null);
			assertSpyCalls(onChangeSpy, 1);
			assertSpyCall(onChangeSpy, 0, {
				args: [
					{
						value: BASIC_ASSET_UUID,
						trigger: "application",
					},
				],
			});
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "setValue() using a ProjectAsset and isDiskData = true",
	fn() {
		const { gui, mockProjectAsset, uninstall } = createBasicGui();
		const onChangeSpy = createOnChangeEventSpy(gui);

		try {
			gui.setValue(mockProjectAsset, { isDiskData: true });

			assertStrictEquals(gui.projectAssetValue, mockProjectAsset);
			assertEquals(gui.defaultAssetLink, null);
			assertEquals(gui.defaultAssetLinkUuid, null);
			assertSpyCalls(onChangeSpy, 1);
			assertSpyCall(onChangeSpy, 0, {
				args: [
					{
						value: BASIC_ASSET_UUID,
						trigger: "application",
					},
				],
			});
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "setValue() using a live asset",
	fn() {
		const { gui, mockLiveAsset, mockProjectAsset, uninstall } = createBasicGui();
		const onChangeSpy = createOnChangeEventSpy(gui);

		try {
			gui.setValue(mockLiveAsset);

			assertStrictEquals(gui.projectAssetValue, mockProjectAsset);
			assertEquals(gui.defaultAssetLink, null);
			assertEquals(gui.defaultAssetLinkUuid, null);
			assertSpyCalls(onChangeSpy, 1);
			assertSpyCall(onChangeSpy, 0, {
				args: [
					{
						value: BASIC_ASSET_UUID,
						trigger: "application",
					},
				],
			});
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "getValue() without parameters",
	fn() {
		const { gui, uninstall } = createBasicGui();

		try {
			const result = gui.getValue();

			assertEquals(result, BASIC_ASSET_UUID);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "getValue() without parameters and no value set",
	fn() {
		const { gui, uninstall } = createBasicGui({ valueType: "none" });

		try {
			const result = gui.getValue();

			assertEquals(result, null);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "getValue() without parameters and asset link",
	fn() {
		const { gui, uninstall } = createBasicGui({ valueType: "defaultAssetLink" });

		try {
			const result = gui.getValue();

			assertEquals(result, DEFAULTASSETLINK_LINK_UUID);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "getValue() with asset link and resolveDefaultAssetLinks = true",
	fn() {
		const { gui, uninstall } = createBasicGui({ valueType: "defaultAssetLink" });

		try {
			const result = gui.getValue({ resolveDefaultAssetLinks: true });

			assertEquals(result, BASIC_ASSET_UUID);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "getValue() with returnLiveAsset = true",
	fn() {
		const { gui, mockLiveAsset, uninstall } = createBasicGui({
			needsLiveAssetPreload: false,
		});

		try {
			const result = gui.getValue({ returnLiveAsset: true });

			assertStrictEquals(result, mockLiveAsset);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "getValue() with returnLiveAsset = true and no value set",
	fn() {
		const { gui, uninstall } = createBasicGui({ valueType: "none" });

		try {
			const result = gui.getValue({ returnLiveAsset: true });

			assertEquals(result, null);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "getValue() with purpose 'fileStorage'",
	fn() {
		const { gui, uninstall } = createBasicGui();

		try {
			const result = gui.getValue({ purpose: "fileStorage" });

			assertEquals(result, BASIC_ASSET_UUID);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "getValue() with purpose 'binarySerialization'",
	fn() {
		const { gui, uninstall } = createBasicGui();

		try {
			const result = gui.getValue({ purpose: "binarySerialization" });

			assertEquals(result, BASIC_ASSET_UUID);
		}	finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "getValue() with purpose 'script'",
	fn() {
		const { gui, mockLiveAsset, uninstall } = createBasicGui({
			needsLiveAssetPreload: false,
		});

		try {
			const result = gui.getValue({ purpose: "script" });

			assertStrictEquals(result, mockLiveAsset);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "getValue() with no parameters and an embedded asset",
	fn() {
		const { gui, uninstall } = createBasicGui({
			valueType: "embedded",
		});

		try {
			const result = gui.getValue();

			assertEquals(/** @type {unknown} */(result), {
				num: 42,
				str: "foo",
			});
		} finally {
			uninstall();
		}
	},
});
