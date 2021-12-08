/** @type {import("@playwright/test").PlaywrightTestConfig} */
const config = {
	projects: [
		{
			name: "editor - chromium",
			use: {
				baseURL: "http://localhost:8080/editor/dist/",
			},
		},
	],
};

export default config;
