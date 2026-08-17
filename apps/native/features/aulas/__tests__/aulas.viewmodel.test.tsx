import { renderHook } from "@testing-library/react-native";
import { useAulasViewModel } from "@/features/aulas/aulas.viewmodel";

describe("useAulasViewModel", () => {
	it("exposes all sessions and the first one as next", async () => {
		const { result } = await renderHook(() => useAulasViewModel());
		expect(result.current.sessions.length).toBe(5);
		expect(result.current.next.id).toBe(result.current.sessions[0].id);
	});
});
