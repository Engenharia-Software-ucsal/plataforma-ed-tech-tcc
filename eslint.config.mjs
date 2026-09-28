import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

export default tseslint.config(
	js.configs.recommended,
	...tseslint.configs.recommended,
	eslintPluginPrettierRecommended,
	{
		rules: {
			"@typescript-eslint/no-unused-vars": "warn",
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/ban-ts-comment": "warn",
			"@typescript-eslint/no-require-imports": "off",
			"no-undef": "off",
		},
	},
	{
		ignores: ["**/dist/**", "**/.expo/**", "**/node_modules/**", "**/coverage/**"],
	},
);
