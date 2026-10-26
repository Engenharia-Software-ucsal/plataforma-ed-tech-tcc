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
});
