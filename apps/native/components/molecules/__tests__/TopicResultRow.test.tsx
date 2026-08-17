import { render, screen } from "@testing-library/react-native";
import { TopicResultRow } from "@/components/molecules/TopicResultRow";

describe("TopicResultRow", () => {
	it("renders the label", async () => {
		await render(<TopicResultRow label="Princípios SOLID" correct />);
		expect(screen.getByText("Princípios SOLID")).toBeTruthy();
	});
});
