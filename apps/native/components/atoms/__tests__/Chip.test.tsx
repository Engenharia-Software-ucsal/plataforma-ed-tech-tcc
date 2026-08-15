import { render, screen } from "@testing-library/react-native";
import { Chip } from "@/components/atoms/Chip";

describe("Chip", () => {
  it("renders the label", async () => {
    await render(<Chip label="UCSAL" />);
    expect(screen.getByText("UCSAL")).toBeTruthy();
  });

  it("applies the danger tone class", async () => {
    await render(<Chip label="Cheio" tone="danger" testID="chip" />);
    expect(screen.getByTestId("chip").props.className).toContain("bg-danger");
  });
});
