import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { NotificationRow } from "@/components/molecules/NotificationRow";

describe("NotificationRow", () => {
	it("renders title, description and time", async () => {
		await render(
			<NotificationRow
				icon={<Text>ICON</Text>}
				iconTone="accent"
				title="Ônibus a 5 min"
				description="Chegando no ponto UCSAL"
				timeAgo="agora"
				read={false}
			/>,
		);
		expect(screen.getByText("Ônibus a 5 min")).toBeTruthy();
		expect(screen.getByText("Chegando no ponto UCSAL")).toBeTruthy();
		expect(screen.getByText("agora")).toBeTruthy();
	});

	it("shows an unread dot when read is false", async () => {
		await render(
			<NotificationRow
				icon={<Text>ICON</Text>}
				iconTone="accent"
				title="Ônibus a 5 min"
				description="Chegando no ponto UCSAL"
				timeAgo="agora"
				read={false}
				testID="row"
			/>,
		);
		expect(screen.getByTestId("unread-dot")).toBeTruthy();
	});

	it("hides the unread dot when read is true", async () => {
		await render(
			<NotificationRow
				icon={<Text>ICON</Text>}
				iconTone="accent"
				title="Novo material"
				description="Prof. Ana Silva enviou Slides"
				timeAgo="2h"
				read
			/>,
		);
		expect(screen.queryByTestId("unread-dot")).toBeNull();
	});
});
