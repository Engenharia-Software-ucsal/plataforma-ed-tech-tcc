import { fireEvent, render, screen } from "@testing-library/react-native";
import { QuizOptionRow } from "@/components/molecules/QuizOptionRow";

describe("QuizOptionRow", () => {
	it("renders the letter and text", async () => {
		await render(
			<QuizOptionRow
				letter="B"
				text="Single Responsibility Principle"
				selected={false}
				onPress={jest.fn()}
			/>,
		);
		expect(screen.getByText("B")).toBeTruthy();
		expect(screen.getByText("Single Responsibility Principle")).toBeTruthy();
	});

	it("applies the accent border when selected", async () => {
		await render(
			<QuizOptionRow
				letter="B"
				text="SRP"
				selected
				testID="opt"
				onPress={jest.fn()}
			/>,
		);
		expect(screen.getByTestId("opt").props.className).toContain(
			"border-accent-primary",
		);
	});

	it("calls onPress when tapped", async () => {
		const onPress = jest.fn();
		await render(
			<QuizOptionRow
				letter="A"
				text="OCP"
				selected={false}
				onPress={onPress}
				testID="opt"
			/>,
		);
		fireEvent.press(screen.getByTestId("opt"));
		expect(onPress).toHaveBeenCalledTimes(1);
	});
});
