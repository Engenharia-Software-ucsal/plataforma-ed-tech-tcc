import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { FileRow } from "@/components/molecules/FileRow";

describe("FileRow", () => {
	it("renders name and meta", async () => {
		await render(
			<FileRow icon={<Text>ICON</Text>} name="Slides - Aula 04.pdf" meta="2.4 MB · PDF" />,
		);
		expect(screen.getByText("Slides - Aula 04.pdf")).toBeTruthy();
		expect(screen.getByText("2.4 MB · PDF")).toBeTruthy();
	});

	it("renders a novo badge when requested", async () => {
		await render(
			<FileRow icon={<Text>ICON</Text>} name="Lista.xlsx" meta="180 KB" badge="novo" />,
		);
		expect(screen.getByText("novo")).toBeTruthy();
	});

	it("calls onPress when tapped", async () => {
		const onPress = jest.fn();
		await render(
			<FileRow
				icon={<Text>ICON</Text>}
				name="Lista.xlsx"
				meta="180 KB"
				onPress={onPress}
				testID="row"
			/>,
		);
		fireEvent.press(screen.getByTestId("row"));
		expect(onPress).toHaveBeenCalledTimes(1);
	});
});
