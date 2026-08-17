import { render, screen } from "@testing-library/react-native";
import { ScoreRing } from "@/components/molecules/ScoreRing";

describe("ScoreRing", () => {
	it("renders the score fraction and caption", async () => {
		await render(<ScoreRing correct={4} total={5} />);
		expect(screen.getByText("4/5")).toBeTruthy();
		expect(screen.getByText("acertos")).toBeTruthy();
	});
});
