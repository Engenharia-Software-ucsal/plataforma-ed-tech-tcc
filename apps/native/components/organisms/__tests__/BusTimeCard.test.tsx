import { fireEvent, render, screen } from "@testing-library/react-native";
import { BusTimeCard } from "@/components/organisms/BusTimeCard";
import type { BusDeparture } from "@/features/onibus/onibus.model";

const departure: BusDeparture = {
	id: "bus-0800",
	time: "08:00",
	stop: "UCSAL",
	route: "UCSAL → Estação",
	status: "Saída do campus",
	occupancy: "vazio",
	delayMinutes: 0,
};

describe("BusTimeCard", () => {
	it("renders the time, route and status", async () => {
		await render(
			<BusTimeCard
				departure={departure}
				isFavorite={false}
				onToggleFavorite={jest.fn()}
			/>,
		);
		expect(screen.getByText("08:00")).toBeTruthy();
		expect(screen.getByText("UCSAL → Estação")).toBeTruthy();
		expect(screen.getByText("Saída do campus")).toBeTruthy();
	});

	it("calls onToggleFavorite with the departure id when the bell is pressed", async () => {
		const onToggleFavorite = jest.fn();
		await render(
			<BusTimeCard
				departure={departure}
				isFavorite={false}
				onToggleFavorite={onToggleFavorite}
			/>,
		);
		fireEvent.press(screen.getByTestId("favorite-button"));
		expect(onToggleFavorite).toHaveBeenCalledWith("bus-0800");
	});

	it("shows a delay badge when delayMinutes is positive", async () => {
		await render(
			<BusTimeCard
				departure={{ ...departure, delayMinutes: 5 }}
				isFavorite={false}
				onToggleFavorite={jest.fn()}
			/>,
		);
		expect(screen.getByText("Atrasado 5 min")).toBeTruthy();
	});
});
