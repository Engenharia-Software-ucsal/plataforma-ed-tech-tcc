import { fireEvent, render, screen } from "@testing-library/react-native";
import { SegmentedFilter } from "@/components/molecules/SegmentedFilter";

const OPTIONS = ["Todos", "UCSAL", "Pituaçu"] as const;

describe("SegmentedFilter", () => {
  it("renders all option labels", async () => {
    await render(<SegmentedFilter options={OPTIONS} value="Todos" onChange={jest.fn()} />);
    for (const option of OPTIONS) {
      expect(screen.getByText(option)).toBeTruthy();
    }
  });

  it("calls onChange with the pressed option", async () => {
    const onChange = jest.fn();
    await render(<SegmentedFilter options={OPTIONS} value="Todos" onChange={onChange} />);
    fireEvent.press(screen.getByTestId("filter-UCSAL"));
    expect(onChange).toHaveBeenCalledWith("UCSAL");
  });

  it("marks the active option's container with the accent background class", async () => {
    await render(<SegmentedFilter options={OPTIONS} value="UCSAL" onChange={jest.fn()} />);
    expect(screen.getByTestId("filter-UCSAL").props.className).toContain("bg-accent-primary");
  });
});
