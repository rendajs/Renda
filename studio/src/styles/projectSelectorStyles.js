// @ts-ignore
import initialLoad from "./initialLoad.css" with {type: "css"};
// @ts-ignore
import variables from "./variables.css" with {type: "css"};
// @ts-ignore
import projectSelector from "../projectSelector/projectSelector.css" with {type: "css"};

document.adoptedStyleSheets = [
	...document.adoptedStyleSheets,
	initialLoad,
	variables,
	projectSelector,
];
