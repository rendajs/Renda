import {assertEquals, assertStrictEquals} from "asserts";
import {BASIC_ASSET_UUID, DEFAULTASSETLINK_LINK_UUID, createBasicGui} from "./shared.js";

Deno.test({
	name: "setValue() to null",
	fn() {
		const {gui, uninstall} = createBasicGui();

		gui.setValue(null);

		assertEquals(gui.projectAssetValue, null);
		assertEquals(gui.defaultAssetLink, null);
		assertEquals(gui.defaultAssetLinkUuid, null);

		uninstall();
	},
});

Deno.test({
	name: "setValue() with an uuid",
	fn() {
		const {gui, mockProjectAsset, uninstall} = createBasicGui();

		gui.setValue(BASIC_ASSET_UUID);

		assertStrictEquals(gui.projectAssetValue, mockProjectAsset);
		assertEquals(gui.defaultAssetLink, null);
		assertEquals(gui.defaultAssetLinkUuid, null);

		uninstall();
	},
});

Deno.test({
	name: "setValue() with an uuid and isDiskData = true",
	fn() {
		const {gui, mockProjectAsset, uninstall} = createBasicGui();

		try {
			gui.setValue(BASIC_ASSET_UUID, {isDiskData: true});

			assertStrictEquals(gui.projectAssetValue, mockProjectAsset);
			assertEquals(gui.defaultAssetLink, null);
			assertEquals(gui.defaultAssetLinkUuid, null);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "setValue() with an assetlink uuid",
	fn() {
		const {gui, mockProjectAsset, mockDefaultAssetLink, uninstall} = createBasicGui();

		gui.setValue(DEFAULTASSETLINK_LINK_UUID);

		assertStrictEquals(gui.projectAssetValue, mockProjectAsset);
		assertStrictEquals(gui.defaultAssetLink, mockDefaultAssetLink);
		assertEquals(gui.defaultAssetLinkUuid, DEFAULTASSETLINK_LINK_UUID);

		uninstall();
	},
});

Deno.test({
	name: "setValue() using a ProjectAsset",
	fn() {
		const {gui, mockProjectAsset, uninstall} = createBasicGui();

		gui.setValue(mockProjectAsset);

		assertStrictEquals(gui.projectAssetValue, mockProjectAsset);
		assertEquals(gui.defaultAssetLink, null);
		assertEquals(gui.defaultAssetLinkUuid, null);

		uninstall();
	},
});

Deno.test({
	name: "setValue() using a ProjectAsset and isDiskData = true",
	fn() {
		const {gui, mockProjectAsset, uninstall} = createBasicGui();

		try {
			gui.setValue(mockProjectAsset, {isDiskData: true});

			assertStrictEquals(gui.projectAssetValue, mockProjectAsset);
			assertEquals(gui.defaultAssetLink, null);
			assertEquals(gui.defaultAssetLinkUuid, null);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "setValue() using a live asset",
	fn() {
		const {gui, mockLiveAsset, mockProjectAsset, uninstall} = createBasicGui();

		gui.setValue(mockLiveAsset);

		assertStrictEquals(gui.projectAssetValue, mockProjectAsset);
		assertEquals(gui.defaultAssetLink, null);
		assertEquals(gui.defaultAssetLinkUuid, null);

		uninstall();
	},
});

Deno.test({
	name: "getValue() without parameters",
	fn() {
		const {gui, uninstall} = createBasicGui();

		const result = gui.getValue();

		assertEquals(result, BASIC_ASSET_UUID);

		uninstall();
	},
});

Deno.test({
	name: "getValue() without parameters and no value set",
	fn() {
		const {gui, uninstall} = createBasicGui({valueType: "none"});

		const result = gui.getValue();

		assertEquals(result, null);

		uninstall();
	},
});

Deno.test({
	name: "getValue() without parameters and asset link",
	fn() {
		const {gui, uninstall} = createBasicGui({valueType: "defaultAssetLink"});

		const result = gui.getValue();

		assertEquals(result, DEFAULTASSETLINK_LINK_UUID);

		uninstall();
	},
});

Deno.test({
	name: "getValue() with asset link and resolveDefaultAssetLinks = true",
	fn() {
		const {gui, uninstall} = createBasicGui({valueType: "defaultAssetLink"});

		const result = gui.getValue({resolveDefaultAssetLinks: true});

		assertEquals(result, BASIC_ASSET_UUID);

		uninstall();
	},
});

Deno.test({
	name: "getValue() with returnLiveAsset = true",
	fn() {
		const {gui, mockLiveAsset, uninstall} = createBasicGui({
			needsLiveAssetPreload: false,
		});

		const result = gui.getValue({returnLiveAsset: true});

		assertStrictEquals(result, mockLiveAsset);

		uninstall();
	},
});

Deno.test({
	name: "getValue() with returnLiveAsset = true and no value set",
	fn() {
		const {gui, uninstall} = createBasicGui({valueType: "none"});

		const result = gui.getValue({returnLiveAsset: true});

		assertEquals(result, null);

		uninstall();
	},
});

Deno.test({
	name: "getValue() with purpose 'fileStorage'",
	fn() {
		const {gui, uninstall} = createBasicGui();

		const result = gui.getValue({purpose: "fileStorage"});

		assertEquals(result, BASIC_ASSET_UUID);

		uninstall();
	},
});

Deno.test({
	name: "getValue() with purpose 'binaryComposer'",
	fn() {
		const {gui, uninstall} = createBasicGui();

		const result = gui.getValue({purpose: "binaryComposer"});

		assertEquals(result, BASIC_ASSET_UUID);

		uninstall();
	},
});

Deno.test({
	name: "getValue() with purpose 'script'",
	fn() {
		const {gui, mockLiveAsset, uninstall} = createBasicGui({
			needsLiveAssetPreload: false,
		});

		const result = gui.getValue({purpose: "script"});

		assertStrictEquals(result, mockLiveAsset);

		uninstall();
	},
});

Deno.test({
	name: "getValue() with no parameters and an embedded asset",
	fn() {
		const {gui, uninstall} = createBasicGui({
			valueType: "embedded",
		});

		const result = gui.getValue();

		assertEquals(result, {
			num: 42,
			str: "foo",
		});

		uninstall();
	},
});
