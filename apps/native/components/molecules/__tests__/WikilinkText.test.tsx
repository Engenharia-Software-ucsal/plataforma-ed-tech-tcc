import { fireEvent, render, screen } from "@testing-library/react-native";
import { WikilinkText } from "@/components/molecules/WikilinkText";

describe("WikilinkText", () => {
	it("renders plain text without wikilinks", async () => {
		await render(<WikilinkText content="Texto simples sem links" />);
		expect(screen.getByText("Texto simples sem links")).toBeTruthy();
	});

	it("parses and renders wikilinks correctly", async () => {
		const onPress = jest.fn();
		await render(
			<WikilinkText
				content="Estude sobre [[Arquitetura Hexagonal]] e também [[DIP|Princípio de Inversão]]."
				onPressWikilink={onPress}
			/>,
		);

		expect(screen.getByText("[[Arquitetura Hexagonal]]")).toBeTruthy();
		expect(screen.getByText("[[Princípio de Inversão]]")).toBeTruthy();

		fireEvent.press(screen.getByTestId("wikilink-Arquitetura Hexagonal"));
		expect(onPress).toHaveBeenCalledWith("Arquitetura Hexagonal");

		fireEvent.press(screen.getByTestId("wikilink-DIP"));
		expect(onPress).toHaveBeenCalledWith("DIP");
	});
});
