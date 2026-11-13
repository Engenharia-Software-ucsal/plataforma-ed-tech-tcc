import { fireEvent, render, screen } from "@testing-library/react-native";
import {
	flattenFolderTree,
	MoveToSheet,
} from "@/components/organisms/MoveToSheet";
import { MOCK_FOLDERS } from "@/features/notas/notas.model";

describe("flattenFolderTree", () => {
	it("lista as pastas em ordem de árvore com a profundidade", () => {
		expect(
			flattenFolderTree(MOCK_FOLDERS).map((row) => [row.folder.id, row.depth]),
		).toEqual([
			["folder-arq", 0],
			["folder-solid", 1],
			["folder-bd", 0],
		]);
	});
});

describe("MoveToSheet", () => {
	it("desabilita a pasta atual e os destinos bloqueados", async () => {
		const onSelect = jest.fn();
		await render(
			<MoveToSheet
				visible
				itemName="Arquitetura de Software"
				folders={MOCK_FOLDERS}
				currentParentId={null}
				disabledFolderIds={["folder-arq", "folder-solid"]}
				onSelect={onSelect}
				onClose={jest.fn()}
			/>,
		);

		await fireEvent.press(screen.getByTestId("move-to-sheet-raiz"));
		await fireEvent.press(screen.getByTestId("move-to-sheet-folder-solid"));
		await fireEvent.press(screen.getByTestId("move-to-sheet-folder-bd"));
		expect(onSelect).toHaveBeenCalledTimes(1);
		expect(onSelect).toHaveBeenCalledWith("folder-bd");
	});
});
