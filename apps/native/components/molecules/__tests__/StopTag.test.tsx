import { render, screen } from "@testing-library/react-native";
import { StopTag } from "@/components/molecules/StopTag";

describe("StopTag", () => {
  it("shows UCSAL label for the campus stop", async () => {
    await render(<StopTag stop="UCSAL" />);
    expect(screen.getByText("UCSAL")).toBeTruthy();
  });

  it("shows Est. Pituaçu label for the station stop", async () => {
    await render(<StopTag stop="PITUACU" />);
    expect(screen.getByText("Est. Pituaçu")).toBeTruthy();
  });
});
