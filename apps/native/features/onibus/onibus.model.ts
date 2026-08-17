export type BusStop = "UCSAL" | "PITUACU";

export type OccupancyLevel = "vazio" | "moderado" | "cheio";

export type BusDeparture = {
	id: string;
	time: string;
	stop: BusStop;
	route: string;
	status: string;
	occupancy: OccupancyLevel;
	delayMinutes: number;
};

export const BUS_DEPARTURES: BusDeparture[] = [
	{
		id: "bus-0800",
		time: "08:00",
		stop: "UCSAL",
		route: "UCSAL → Estação",
		status: "Saída do campus",
		occupancy: "vazio",
		delayMinutes: 0,
	},
	{
		id: "bus-0830",
		time: "08:30",
		stop: "PITUACU",
		route: "Estação → UCSAL",
		status: "Chegada no campus",
		occupancy: "moderado",
		delayMinutes: 5,
	},
	{
		id: "bus-0915",
		time: "09:15",
		stop: "UCSAL",
		route: "UCSAL → Estação",
		status: "Saída do campus",
		occupancy: "cheio",
		delayMinutes: 0,
	},
	{
		id: "bus-1000",
		time: "10:00",
		stop: "PITUACU",
		route: "Estação → UCSAL",
		status: "Chegada no campus",
		occupancy: "vazio",
		delayMinutes: 0,
	},
	{
		id: "bus-1130",
		time: "11:30",
		stop: "UCSAL",
		route: "UCSAL → Estação",
		status: "Saída do campus",
		occupancy: "moderado",
		delayMinutes: 3,
	},
];
