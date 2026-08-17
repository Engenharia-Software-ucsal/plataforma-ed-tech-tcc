import { render, screen } from "@testing-library/react-native";
import { NextBusHero } from "@/components/organisms/NextBusHero";
import type { BusDeparture } from "@/features/onibus/onibus.model";

const departure: BusDeparture = {
	id: "bus-0730",
	time: "07:30",
	stop: "UCSAL",
	route: "UCSAL → Estação da Lapa",
	status: "em 25 min",
	occupancy: "vazio",
	delayMinutes: 3,
};

describe("NextBusHero", () => {
	it("renders the next departure time and route", async () => {
		await render(<NextBusHero departure={departure} />);
		expect(screen.getByText("07:30")).toBeTruthy();
		expect(screen.getByText("UCSAL → Estação da Lapa")).toBeTruthy();
	});

	it("shows the delay badge when late", async () => {
		await render(<NextBusHero departure={departure} />);
		expect(screen.getByText("Atrasado 3 min")).toBeTruthy();
	});
});
