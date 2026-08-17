import { render, screen } from "@testing-library/react-native";
import { ClassCard } from "@/components/organisms/ClassCard";
import type { ClassSession } from "@/features/aulas/aulas.model";

const session: ClassSession = {
	id: "class-eng-sw",
	startTime: "08:00",
	endTime: "09:30",
	subject: "Engenharia de Software",
	professor: "Prof. Ana Silva",
	room: "Sala 302 · BL-A",
	difficulty: { level: "dificil", score: 4.3, reviewCount: 142 },
};

describe("ClassCard", () => {
	it("renders subject, professor, room and time", async () => {
		await render(<ClassCard session={session} />);
		expect(screen.getByText("Engenharia de Software")).toBeTruthy();
		expect(screen.getByText("Prof. Ana Silva")).toBeTruthy();
		expect(screen.getByText("Sala 302 · BL-A")).toBeTruthy();
		expect(screen.getByText("08:00")).toBeTruthy();
	});

	it("renders the difficulty tag", async () => {
		await render(<ClassCard session={session} />);
		expect(screen.getByText("Difícil · 4.3/5 (142 avaliações)")).toBeTruthy();
	});
});
