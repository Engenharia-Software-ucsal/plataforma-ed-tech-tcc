jest.mock(
	"react-native-safe-area-context",
	() => require("react-native-safe-area-context/jest/mock").default,
);

jest.mock("@react-native-google-signin/google-signin", () => ({
	GoogleSignin: {
		configure: jest.fn(),
		hasPlayServices: jest.fn().mockResolvedValue(true),
		signIn: jest
			.fn()
			.mockResolvedValue({ data: { serverAuthCode: "mock-auth-code" } }),
	},
	statusCodes: { SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED" },
	isErrorWithCode: jest.fn().mockReturnValue(false),
}));
