import { act, fireEvent, render, screen } from "@testing-library/react-native";
import {
	type QuizSource,
	QuizSourcesCard,
} from "@/components/organisms/QuizSourcesCard";

const sources = [
	{ id: "m1", name: "Slides BPMN.pdf" },
	{ id: "m2", name: "Manual Canvas.pdf" },
];

describe("QuizSourcesCard", () => {
	it("lista um botão por arquivo", async () => {
		await render(
			<QuizSourcesCard
				sources={sources}
				onGenerateAll={jest.fn()}
				onGenerateFromSource={jest.fn()}
			/>,
		);
		expect(screen.getByText("Slides BPMN.pdf")).toBeTruthy();
		expect(screen.getByText("Manual Canvas.pdf")).toBeTruthy();
		expect(screen.getAllByText("Gerar")).toHaveLength(2);
	});

	it("gera o quiz de todos os materiais", async () => {
		const onGenerateAll = jest.fn();
		const onGenerateFromSource = jest.fn();
		await render(
			<QuizSourcesCard
				sources={sources}
				onGenerateAll={onGenerateAll}
				onGenerateFromSource={onGenerateFromSource}
			/>,
		);
		fireEvent.press(screen.getByText("Quiz com todos · 2 PDFs"));
		expect(onGenerateAll).toHaveBeenCalledTimes(1);
		expect(onGenerateFromSource).not.toHaveBeenCalled();
	});

	it("gera o quiz de um único arquivo, com o ID dele", async () => {
		const onGenerateFromSource = jest.fn();
		await render(
			<QuizSourcesCard
				sources={sources}
				onGenerateAll={jest.fn()}
				onGenerateFromSource={onGenerateFromSource}
			/>,
		);
		fireEvent.press(screen.getByTestId("quiz-source-m2"));
		expect(onGenerateFromSource).toHaveBeenCalledWith("m2");
	});
});

describe("QuizSourcesCard — andamento da leitura", () => {
	const withStatus: QuizSource[] = [
		{ id: "ok", name: "Pronto.pdf", status: "ready" as const },
		{ id: "lendo", name: "Lendo.pdf", status: "processing" as const },
		{ id: "fila", name: "Fila.pdf", status: "pending" as const },
		{ id: "falhou", name: "Falhou.pdf", status: "failed" as const, reason: "error" as const },
		{ id: "scan", name: "Scan.pdf", status: "unsupported" as const, reason: "scanned" as const },
		{ id: "zip", name: "Pasta.pdf", status: "unsupported" as const, reason: "format" as const },
		{ id: "sem", name: "Sem.pdf", status: "unsupported" as const, reason: "no_file" as const },
	];

	function renderCard(sources: QuizSource[] = withStatus, handlers: Record<string, jest.Mock> = {}) {
		return render(
			<QuizSourcesCard
				sources={sources}
				onGenerateAll={handlers.all ?? jest.fn()}
				onGenerateFromSource={handlers.one ?? jest.fn()}
				onRetry={handlers.retry}
			/>,
		);
	}

	it("mostra o estado de cada arquivo suportado", async () => {
		await renderCard();
		expect(screen.getAllByText("Gerar")).toHaveLength(1);
		expect(screen.getByText("● Pronto")).toBeTruthy();
		expect(screen.getByText("Lendo…")).toBeTruthy();
		expect(screen.getByText("Na fila")).toBeTruthy();
		expect(screen.getByText("Falhou ao ler")).toBeTruthy();
		expect(screen.getByText("Tentar de novo")).toBeTruthy();
	});

	it("recolhe os não suportados e mostra o motivo ao abrir", async () => {
		await renderCard();
		expect(screen.getByText("3 arquivos não suportados")).toBeTruthy();
		expect(screen.queryByText("PDF escaneado")).toBeNull();
		await act(async () => {
			fireEvent.press(screen.getByTestId("toggle-unsupported"));
		});
		expect(screen.getByText("PDF escaneado")).toBeTruthy();
		expect(screen.getByText("Formato não suportado")).toBeTruthy();
		expect(screen.getByText("Sem arquivo no Drive")).toBeTruthy();
	});

	it("ordena prontos, depois lendo, na fila e com falha", async () => {
		await renderCard([
			{ id: "falhou", name: "Falhou.pdf", status: "failed" as const, reason: "error" as const },
			{ id: "fila", name: "Fila.pdf", status: "pending" as const },
			{ id: "lendo", name: "Lendo.pdf", status: "processing" as const },
			{ id: "ok", name: "Pronto.pdf", status: "ready" as const },
		]);
		const names = screen
			.getAllByText(/\.pdf$/)
			.map((node) => node.props.children);
		expect(names).toEqual(["Pronto.pdf", "Lendo.pdf", "Fila.pdf", "Falhou.pdf"]);
	});

	it("conta só os arquivos suportados no progresso", async () => {
		await renderCard();
		expect(screen.getByText(/1 de 4 materiais prontos · lendo 2/)).toBeTruthy();
	});

	it("mostra no botão geral quantos PDFs estão prontos", async () => {
		await renderCard();
		expect(screen.getByText("Quiz com todos · 1 PDF")).toBeTruthy();
	});

	it("só gera quiz dos arquivos prontos", async () => {
		const one = jest.fn();
		await renderCard(withStatus, { one });
		fireEvent.press(screen.getByTestId("quiz-source-lendo"));
		fireEvent.press(screen.getByTestId("quiz-source-fila"));
		await act(async () => {
			fireEvent.press(screen.getByTestId("toggle-unsupported"));
		});
		fireEvent.press(screen.getByTestId("quiz-source-scan"));
		expect(one).not.toHaveBeenCalled();
		fireEvent.press(screen.getByTestId("quiz-source-ok"));
		expect(one).toHaveBeenCalledWith("ok");
	});

	it("reprocessa ao tocar em um arquivo que falhou", async () => {
		const retry = jest.fn();
		const one = jest.fn();
		await renderCard(withStatus, { retry, one });
		fireEvent.press(screen.getByTestId("quiz-source-falhou"));
		expect(retry).toHaveBeenCalledTimes(1);
		expect(one).not.toHaveBeenCalled();
	});

	it("avisa que o quiz usa só os prontos enquanto ainda lê outros", async () => {
		await renderCard();
		expect(screen.getByText(/O quiz usa só os que já estão prontos/)).toBeTruthy();
	});

	it("desativa o quiz de todos os materiais quando nenhum PDF está pronto", async () => {
		const all = jest.fn();
		await renderCard(
			[
				{ id: "a", name: "A.pdf", status: "pending" as const },
				{ id: "b", name: "B.pdf", status: "pending" as const },
			],
			{ all },
		);
		fireEvent.press(screen.getByText("Quiz com todos · 0 PDFs"));
		expect(all).not.toHaveBeenCalled();
		expect(screen.getByText(/A leitura começa ao sincronizar/)).toBeTruthy();
	});

	it("não mostra progresso enquanto o status ainda não foi consultado", async () => {
		await renderCard([{ id: "a", name: "A.pdf" }]);
		expect(screen.queryByTestId("ingestion-progress")).toBeNull();
		expect(screen.getByText("Gerar")).toBeTruthy();
	});
});
