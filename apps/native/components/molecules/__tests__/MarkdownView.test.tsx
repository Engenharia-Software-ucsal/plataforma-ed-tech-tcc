import { fireEvent, render, screen } from "@testing-library/react-native";
import { MarkdownView } from "@/components/molecules/MarkdownView";

const CONTENT = [
	"# Título",
	"",
	"Texto com **negrito**, *itálico* e `código`.",
	"",
	"- [x] Feito",
	"- [ ] Pendente com [[Outra Nota]]",
	"",
	"> citação",
	"",
	"```",
	"[[Dentro do código]]",
	"```",
].join("\n");

describe("MarkdownView", () => {
	it("renderiza blocos e trechos de Markdown", async () => {
		await render(<MarkdownView content={CONTENT} />);
		expect(screen.getByText("Título")).toBeTruthy();
		expect(screen.getByText("negrito")).toBeTruthy();
		expect(screen.getByText("código")).toBeTruthy();
		expect(screen.getByText("Feito")).toBeTruthy();
		expect(screen.getByText("citação")).toBeTruthy();
		// Wikilink dentro de bloco de código fica como texto.
		expect(screen.getByText("[[Dentro do código]]")).toBeTruthy();
		expect(screen.queryByTestId("wikilink-Dentro do código")).toBeNull();
	});

	it("chama o callback ao tocar num wikilink e marca os pendentes", async () => {
		const onPress = jest.fn();
		await render(
			<MarkdownView
				content="Ver [[Existe|apelido]] e [[Não existe]]"
				onPressWikilink={onPress}
				isWikilinkResolved={(target) => target === "Existe"}
			/>,
		);

		const resolved = screen.getByTestId("wikilink-Existe");
		expect(screen.getByText("apelido")).toBeTruthy();
		expect(resolved.props.accessibilityHint).toBe("Abre a nota");
		expect(
			screen.getByTestId("wikilink-Não existe").props.accessibilityHint,
		).toContain("criar");

		await fireEvent.press(resolved);
		expect(onPress).toHaveBeenCalledWith("Existe");
	});

	it("mostra um aviso para nota vazia", async () => {
		await render(<MarkdownView content="" />);
		expect(screen.getByText(/Nota vazia/)).toBeTruthy();
	});
});
