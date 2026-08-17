import { act, renderHook } from "@testing-library/react-native";
import { useQuizViewModel } from "@/features/quiz/quiz.viewmodel";

describe("useQuizViewModel", () => {
	it("starts at the first question with nothing selected", async () => {
		const { result } = await renderHook(() => useQuizViewModel());
		expect(result.current.index).toBe(0);
		expect(result.current.selectedOptionId).toBeNull();
	});

	it("selects an option", async () => {
		const { result } = await renderHook(() => useQuizViewModel());
		const optionId = result.current.question.options[1].id;
		await act(async () => result.current.selectOption(optionId));
		expect(result.current.selectedOptionId).toBe(optionId);
	});

	it("advances to the next question and resets the selection", async () => {
		const { result } = await renderHook(() => useQuizViewModel());
		await act(async () =>
			result.current.selectOption(result.current.question.options[0].id),
		);
		await act(async () => result.current.goNext());
		expect(result.current.index).toBe(1);
		expect(result.current.selectedOptionId).toBeNull();
	});
});
