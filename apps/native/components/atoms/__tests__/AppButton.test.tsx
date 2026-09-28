import { fireEvent, render, screen } from "@testing-library/react-native";
import { AppButton } from "@/components/atoms/AppButton";

describe("AppButton", () => {
	it("renders the label", async () => {
		await render(<AppButton label="Entrar" onPress={() => {}} />);
		expect(screen.getByText("Entrar")).toBeTruthy();
	});

	it("calls onPress when tapped", async () => {
		const onPress = jest.fn();
		await render(<AppButton label="Entrar" onPress={onPress} testID="btn" />);
		fireEvent.press(screen.getByTestId("btn"));
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("does not call onPress when disabled", async () => {
		const onPress = jest.fn();
		await render(<AppButton label="Entrar" onPress={onPress} disabled testID="btn" />);
		fireEvent.press(screen.getByTestId("btn"));
		expect(onPress).not.toHaveBeenCalled();
	});
});
