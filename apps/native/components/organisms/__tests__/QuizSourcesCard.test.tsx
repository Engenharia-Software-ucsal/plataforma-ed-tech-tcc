import { fireEvent, render, screen } from "@testing-library/react-native";
import { QuizSourcesCard } from "@/components/organisms/QuizSourcesCard";

const sources = [
	{ id: "m1", name: "Slides BPMN.pdf" },
	{ id: "m2", name: "Manual Canvas.pdf" },
];

describe("QuizSourcesCard", () => {
	it("lista um botão por arquivo", async () => {
		await render(
			<QuizSourcesCard
				sources={sources}
				onGenerateAll={jest.fn()}
				onGenerateFromSource={jest.fn()}
			/>,
		);
		expect(screen.getByText("Slides BPMN.pdf")).toBeTruthy();
		expect(screen.getByText("Manual Canvas.pdf")).toBeTruthy();
		expect(screen.getAllByText("Gerar quiz")).toHaveLength(2);
	});

	it("gera o quiz de todos os materiais", async () => {
		const onGenerateAll = jest.fn();
		const onGenerateFromSource = jest.fn();
		await render(
			<QuizSourcesCard
				sources={sources}
				onGenerateAll={onGenerateAll}
				onGenerateFromSource={onGenerateFromSource}
			/>,
		);
		fireEvent.press(screen.getByText("Quiz com todos os materiais"));
		expect(onGenerateAll).toHaveBeenCalledTimes(1);
		expect(onGenerateFromSource).not.toHaveBeenCalled();
	});

	it("gera o quiz de um único arquivo, com o ID dele", async () => {
		const onGenerateFromSource = jest.fn();
		await render(
			<QuizSourcesCard
				sources={sources}
				onGenerateAll={jest.fn()}
				onGenerateFromSource={onGenerateFromSource}
			/>,
		);
		fireEvent.press(screen.getByTestId("quiz-source-m2"));
		expect(onGenerateFromSource).toHaveBeenCalledWith("m2");
	});
});
