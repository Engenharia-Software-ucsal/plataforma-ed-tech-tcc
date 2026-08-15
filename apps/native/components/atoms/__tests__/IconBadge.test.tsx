import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { IconBadge } from "@/components/atoms/IconBadge";

describe("IconBadge", () => {
  it("renders its icon child", async () => {
    await render(<IconBadge testID="badge" icon={<Text>ICON</Text>} />);
    expect(screen.getByText("ICON")).toBeTruthy();
  });

  it("defaults to a 36px square", async () => {
    await render(<IconBadge testID="badge" icon={<Text>ICON</Text>} />);
    expect(screen.getByTestId("badge").props.className).toContain("h-9");
  });
});
