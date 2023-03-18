// @ts-ignore
import initialLoad from "./initialLoad.css" assert {type: "css"};
// @ts-ignore
import variables from "./variables.css" assert {type: "css"};
// @ts-ignore
import projectSelector from "../projectSelector/projectSelector.css" assert {type: "css"};

document.adoptedStyleSheets = [
	...document.adoptedStyleSheets,
	initialLoad,
	variables,
	projectSelector,
];
