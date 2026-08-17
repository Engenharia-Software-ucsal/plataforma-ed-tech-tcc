import { render, screen } from "@testing-library/react-native";
import { NextClassHero } from "@/components/organisms/NextClassHero";
import type { ClassSession } from "@/features/aulas/aulas.model";

const session: ClassSession = {
	id: "class-eng-sw",
	startTime: "08:00",
	endTime: "09:30",
	subject: "Engenharia de Software",
	professor: "Prof. Ana Silva",
	room: "Sala 302 · Bloco A",
	difficulty: { level: "dificil", score: 4.3, reviewCount: 142 },
};

describe("NextClassHero", () => {
	it("renders the subject and room", async () => {
		await render(<NextClassHero session={session} />);
		expect(screen.getByText("Engenharia de Software")).toBeTruthy();
		expect(screen.getByText("Sala 302 · Bloco A")).toBeTruthy();
	});
});
