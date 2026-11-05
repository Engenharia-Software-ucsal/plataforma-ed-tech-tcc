import { renderHook } from "@testing-library/react-native";
import { useAulasViewModel } from "@/features/aulas/aulas.viewmodel";

describe("useAulasViewModel", () => {
	it("exposes filtered sessions for default semester 2026.2, semesters list, and the first one as next", async () => {
		const { result } = await renderHook(() => useAulasViewModel());
		expect(result.current.sessions.length).toBe(5);
		expect(result.current.semesters).toEqual(["2026.2", "2026.1"]);
		expect(result.current.selectedSemester).toBe("2026.2");
		expect(result.current.next.id).toBe(result.current.sessions[0].id);
	});
});
