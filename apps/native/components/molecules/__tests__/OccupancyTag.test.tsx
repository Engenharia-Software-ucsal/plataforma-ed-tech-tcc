import { render, screen } from "@testing-library/react-native";
import { OccupancyTag } from "@/components/molecules/OccupancyTag";

describe("OccupancyTag", () => {
	it.each([
		["vazio", "Vazio"],
		["moderado", "Moderada"],
		["cheio", "Cheio"],
	] as const)("renders %s as %s", async (level, label) => {
		await render(<OccupancyTag level={level} />);
		expect(screen.getByText(label)).toBeTruthy();
	});
});
