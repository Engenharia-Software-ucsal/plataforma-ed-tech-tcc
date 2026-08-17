import { render, screen } from "@testing-library/react-native";
import { AppText } from "@/components/atoms/AppText";

describe("AppText", () => {
	it("renders children", async () => {
		await render(<AppText>Próxima aula</AppText>);
		expect(screen.getByText("Próxima aula")).toBeTruthy();
	});

	it("applies the heading font by default", async () => {
		await render(<AppText testID="txt">Título</AppText>);
		const node = screen.getByTestId("txt");
		expect(node.props.className).toContain("font-heading");
	});

	it("applies the mono font and accent tone when requested", async () => {
		await render(
			<AppText testID="txt" variant="mono" tone="accent">
				08:00
			</AppText>,
		);
		const node = screen.getByTestId("txt");
		expect(node.props.className).toContain("font-mono");
		expect(node.props.className).toContain("text-accent-primary");
	});
});
