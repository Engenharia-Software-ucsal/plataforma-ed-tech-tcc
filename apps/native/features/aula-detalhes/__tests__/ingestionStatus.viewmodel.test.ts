import { act, renderHook, waitFor } from "@testing-library/react-native";
import {
	INGESTION_MAX_POLLS,
	INGESTION_POLL_INTERVAL_MS,
	useIngestionStatus,
} from "@/features/aula-detalhes/ingestionStatus.viewmodel";
import { type IngestionStatusResponse, trpc } from "@/utils/trpc";

function response(counts: Record<string, number>): IngestionStatusResponse {
	return { totalPdfs: 1, counts, materials: [] };
}

describe("useIngestionStatus", () => {
	let queryMock: jest.SpyInstance;
	let startMock: jest.SpyInstance;

	beforeEach(() => {
		jest.useFakeTimers();
		queryMock = jest.spyOn(trpc.materials.ingestionStatus, "query");
		startMock = jest
			.spyOn(trpc.materials.startIngestion, "mutate")
			.mockResolvedValue({ started: true });
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.restoreAllMocks();
	});

	it("não consulta quando está desativado ou sem aula", async () => {
		queryMock.mockResolvedValue(response({ ready: 1 }));
		await renderHook(() => useIngestionStatus("aula-1", false));
		await renderHook(() => useIngestionStatus(undefined, true));
		expect(queryMock).not.toHaveBeenCalled();
	});

	it("consulta de novo enquanto houver PDF pendente ou sendo lido e para quando termina", async () => {
		queryMock
			.mockResolvedValueOnce(response({ pending: 1, processing: 1 }))
			.mockResolvedValueOnce(response({ pending: 1, ready: 1 }))
			.mockResolvedValue(response({ ready: 2 }));

		const { result } = await renderHook(() => useIngestionStatus("aula-1", true));
		await waitFor(() => expect(result.current.status?.counts.pending).toBe(1));

		await act(async () => {
			await jest.advanceTimersByTimeAsync(INGESTION_POLL_INTERVAL_MS);
		});
		await act(async () => {
			await jest.advanceTimersByTimeAsync(INGESTION_POLL_INTERVAL_MS);
		});
		await waitFor(() => expect(result.current.status?.counts.ready).toBe(2));
		expect(queryMock).toHaveBeenCalledTimes(3);

		await act(async () => {
			await jest.advanceTimersByTimeAsync(INGESTION_POLL_INTERVAL_MS * 3);
		});
		expect(queryMock).toHaveBeenCalledTimes(3);
	});

	it("não consulta para sempre quando a leitura nunca começa", async () => {
		queryMock.mockResolvedValue(response({ pending: 1 }));
		await renderHook(() => useIngestionStatus("aula-1", true));

		await act(async () => {
			await jest.advanceTimersByTimeAsync(
				INGESTION_POLL_INTERVAL_MS * (INGESTION_MAX_POLLS + 10),
			);
		});
		expect(queryMock).toHaveBeenCalledTimes(INGESTION_MAX_POLLS);
	});

	it("mantém o último status quando o servidor deixa de responder", async () => {
		queryMock
			.mockResolvedValueOnce(response({ pending: 1 }))
			.mockResolvedValue(null);
		const { result } = await renderHook(() => useIngestionStatus("aula-1", true));
		await waitFor(() => expect(result.current.status?.counts.pending).toBe(1));
		await act(async () => {
			await jest.advanceTimersByTimeAsync(INGESTION_POLL_INTERVAL_MS);
		});
		expect(result.current.status?.counts.pending).toBe(1);
	});

	it("retry reprocessa os arquivos e volta a acompanhar a leitura", async () => {
		queryMock
			.mockResolvedValueOnce(response({ failed: 1 }))
			.mockResolvedValue(response({ processing: 1 }));
		const { result } = await renderHook(() => useIngestionStatus("aula-1", true));
		await waitFor(() => expect(result.current.status?.counts.failed).toBe(1));

		await act(async () => {
			await result.current.retry();
		});

		expect(startMock).toHaveBeenCalledWith({ classSessionId: "aula-1" });
		await waitFor(() => expect(result.current.status?.counts.processing).toBe(1));
	});
});
