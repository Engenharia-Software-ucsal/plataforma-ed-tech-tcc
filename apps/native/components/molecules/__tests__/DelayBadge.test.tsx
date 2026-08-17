import { render, screen } from "@testing-library/react-native";
import { DelayBadge } from "@/components/molecules/DelayBadge";

describe("DelayBadge", () => {
	it("renders the delay in minutes", async () => {
		await render(<DelayBadge minutes={5} />);
		expect(screen.getByText("Atrasado 5 min")).toBeTruthy();
	});

	it("renders nothing when there is no delay", async () => {
		await render(<DelayBadge minutes={0} />);
		expect(screen.queryByText(/Atrasado/)).toBeNull();
	});
});
