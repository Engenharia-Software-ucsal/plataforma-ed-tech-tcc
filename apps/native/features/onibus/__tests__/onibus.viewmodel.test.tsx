import { act, renderHook } from "@testing-library/react-native";
import { Provider as JotaiProvider } from "jotai";
import { useOnibusViewModel } from "@/features/onibus/onibus.viewmodel";

function wrapper({ children }: { children: React.ReactNode }) {
	return <JotaiProvider>{children}</JotaiProvider>;
}

describe("useOnibusViewModel", () => {
	it("defaults the filter to Todos and exposes all departures", async () => {
		const { result } = await renderHook(() => useOnibusViewModel(), {
			wrapper,
		});
		expect(result.current.filter).toBe("Todos");
		expect(result.current.filtered.length).toBeGreaterThan(0);
	});

	it("filters departures by stop when the filter changes", async () => {
		const { result } = await renderHook(() => useOnibusViewModel(), {
			wrapper,
		});
		await act(async () => result.current.setFilter("UCSAL"));
		expect(result.current.filtered.every((d) => d.stop === "UCSAL")).toBe(true);
	});

	it("toggles a departure's favorite state", async () => {
		const { result } = await renderHook(() => useOnibusViewModel(), {
			wrapper,
		});
		const id = result.current.filtered[0].id;
		expect(result.current.isFavorite(id)).toBe(false);
		await act(async () => result.current.toggleFavorite(id));
		expect(result.current.isFavorite(id)).toBe(true);
		await act(async () => result.current.toggleFavorite(id));
		expect(result.current.isFavorite(id)).toBe(false);
	});

	it("exposes the earliest departure as next", async () => {
		const { result } = await renderHook(() => useOnibusViewModel(), {
			wrapper,
		});
		expect(result.current.next.id).toBe(result.current.filtered[0].id);
	});
});
