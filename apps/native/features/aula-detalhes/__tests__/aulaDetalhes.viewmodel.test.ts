import { act, renderHook } from "@testing-library/react-native";
import { Provider } from "jotai";
import { useAulaDetalhesViewModel } from "@/features/aula-detalhes/aulaDetalhes.viewmodel";

describe("useAulaDetalhesViewModel", () => {
	it("defaults the active tab to materiais", async () => {
		const { result } = await renderHook(() => useAulaDetalhesViewModel(), {
			wrapper: Provider,
		});
		expect(result.current.activeTab).toBe("materiais");
	});

	it("switches to the ia tab", async () => {
		const { result } = await renderHook(() => useAulaDetalhesViewModel(), {
			wrapper: Provider,
		});
		await act(async () => result.current.setActiveTab("ia"));
		expect(result.current.activeTab).toBe("ia");
	});

	it("exposes the mock class data with source references on insights", async () => {
		const { result } = await renderHook(() => useAulaDetalhesViewModel(), {
			wrapper: Provider,
		});
		expect(result.current.data.subject).toBe("Engenharia de Software");
		expect(result.current.data.files.length).toBeGreaterThan(0);
		expect(result.current.data.insights.length).toBeGreaterThan(0);
		for (const insight of result.current.data.insights) {
			expect(insight.sourceReference).toBeTruthy();
		}
	});

	it("loads details for a specific classId and updates schedule", async () => {
		const { result } = await renderHook(
			() => useAulaDetalhesViewModel("class-bd2"),
			{
				wrapper: Provider,
			},
		);
		expect(result.current.data.subject).toBe("Banco de Dados II");

		await act(async () => {
			await result.current.updateSchedule({
				startTime: "18:30",
				endTime: "21:10",
				room: "Sala 420 · Bloco B",
			});
		});

		expect(result.current.data.schedule).toBe("18:30 - 21:10");
		expect(result.current.data.room).toBe("Sala 420 · Bloco B");
	});
});
