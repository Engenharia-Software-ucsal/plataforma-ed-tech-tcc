import { fireEvent, render, screen } from "@testing-library/react-native";
import { BacklinkCard } from "@/components/molecules/BacklinkCard";

describe("BacklinkCard", () => {
	it("renders note title, manual badge, and reason", async () => {
		const onPress = jest.fn();
		await render(
			<BacklinkCard
				title="Inversão de Dependência (DIP)"
				linkType="manual"
				reason="DIP viabiliza portas e adaptadores."
				onPress={onPress}
				testID="backlink-card"
			/>,
		);

		expect(screen.getByText("Inversão de Dependência (DIP)")).toBeTruthy();
		expect(screen.getByText("Manual")).toBeTruthy();
		expect(
			screen.getByText('"DIP viabiliza portas e adaptadores."'),
		).toBeTruthy();

		fireEvent.press(screen.getByTestId("backlink-card-title-btn"));
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("renders IA badge, similarity score and handles delete callback", async () => {
		const onDelete = jest.fn();
		await render(
			<BacklinkCard
				title="Clean Architecture"
				linkType="ai_suggested"
				reason="Conexão sugerida pelo assistente de IA."
				similarityScore="0.88"
				onDelete={onDelete}
				testID="backlink-card-ia"
			/>,
		);

		expect(screen.getByText("Clean Architecture")).toBeTruthy();
		expect(screen.getByText("IA")).toBeTruthy();
		expect(screen.getByText("Afinidade: 0.88")).toBeTruthy();

		fireEvent.press(screen.getByTestId("backlink-card-ia-delete-btn"));
		expect(onDelete).toHaveBeenCalledTimes(1);
	});
});
