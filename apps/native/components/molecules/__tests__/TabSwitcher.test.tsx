import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { TabSwitcher } from "@/components/molecules/TabSwitcher";

const TABS = [
	{ key: "materiais", label: "Materiais", icon: <Text>📁</Text> },
	{ key: "ia", label: "IA", icon: <Text>✨</Text> },
] as const;

describe("TabSwitcher", () => {
	it("renders every tab label", async () => {
		await render(<TabSwitcher tabs={TABS} activeKey="materiais" onChange={jest.fn()} />);
		expect(screen.getByText("Materiais")).toBeTruthy();
		expect(screen.getByText("IA")).toBeTruthy();
	});

	it("calls onChange with the pressed tab key", async () => {
		const onChange = jest.fn();
		await render(<TabSwitcher tabs={TABS} activeKey="materiais" onChange={onChange} />);
		fireEvent.press(screen.getByTestId("tab-ia"));
		expect(onChange).toHaveBeenCalledWith("ia");
	});

	it("marks the active tab with the accent background class", async () => {
		await render(<TabSwitcher tabs={TABS} activeKey="ia" onChange={jest.fn()} />);
		expect(screen.getByTestId("tab-ia").props.className).toContain("bg-accent-primary");
	});
});
