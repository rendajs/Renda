export {default as ComponentProperty} from "./ComponentProperty.js";
import ComponentPropertyFloat from "./ComponentPropertyFloat.js";
import ComponentPropertyBool from "./ComponentPropertyBool.js";
import ComponentPropertyAsset from "./ComponentPropertyAsset.js";
import ComponentPropertyArray from "./ComponentPropertyArray.js";
import ComponentPropertyMat4 from "./ComponentPropertyMat4.js";

export {
	ComponentPropertyFloat,
	ComponentPropertyBool,
	ComponentPropertyAsset,
	ComponentPropertyArray,
	ComponentPropertyMat4,
};

export const autoRegisterComponentProperties = [
	ComponentPropertyFloat,
	ComponentPropertyBool,
	ComponentPropertyAsset,
	ComponentPropertyArray,
	ComponentPropertyMat4,
];
