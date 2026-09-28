import { fireEvent, render, screen } from "@testing-library/react-native";
import { InsightCard } from "@/components/organisms/InsightCard";

const props = {
	summary:
		"IA analisou os slides e a gravação enviados pelo professor no Classroom.",
	coverageText: "Baseado em 2 de 4 materiais analisados",
	points: [
		"Princípios SOLID aplicados a microsserviços",
		"Padrão Circuit Breaker citado nos slides (pág. 14)",
	],
	onGenerateQuiz: jest.fn(),
};

describe("InsightCard", () => {
	it("renders the summary, coverage text and every point", async () => {
		await render(<InsightCard {...props} />);
		expect(screen.getByText(props.summary)).toBeTruthy();
		expect(screen.getByText(props.coverageText)).toBeTruthy();
		for (const point of props.points) {
			expect(screen.getByText(point)).toBeTruthy();
		}
	});

	it("calls onGenerateQuiz when the quiz button is pressed", async () => {
		const onGenerateQuiz = jest.fn();
		await render(<InsightCard {...props} onGenerateQuiz={onGenerateQuiz} />);
		fireEvent.press(screen.getByText("Gerar quiz de revisão"));
		expect(onGenerateQuiz).toHaveBeenCalledTimes(1);
	});
});
