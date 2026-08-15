import { render, screen } from "@testing-library/react-native";
import { DifficultyTag } from "@/components/molecules/DifficultyTag";

describe("DifficultyTag", () => {
  it("renders level, score and review count", async () => {
    await render(<DifficultyTag level="dificil" score={4.3} reviewCount={142} />);
    expect(screen.getByText("Difícil · 4.3/5 (142 avaliações)")).toBeTruthy();
  });
});
