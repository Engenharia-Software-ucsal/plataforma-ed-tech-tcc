import { useCallback, useEffect, useState } from "react";
import { type IngestionStatusResponse, trpc } from "@/utils/trpc";

export const INGESTION_POLL_INTERVAL_MS = 5000;
/** Limite de consultas seguidas (5 minutos), para não consultar para sempre se a leitura nunca começar. */
export const INGESTION_MAX_POLLS = 60;

function isReading(status: IngestionStatusResponse) {
	return (status.counts.pending ?? 0) + (status.counts.processing ?? 0) > 0;
}

/**
 * Acompanha a leitura dos PDFs da aula: consulta o servidor e repete enquanto
 * houver arquivo pendente ou sendo lido. `retry` reprocessa os que falharam.
 */
export function useIngestionStatus(
	classSessionId: string | undefined,
	enabled: boolean,
) {
	const [status, setStatus] = useState<IngestionStatusResponse | null>(null);
	const [round, setRound] = useState(0);

	// biome-ignore lint/correctness/useExhaustiveDependencies: `round` só serve para disparar uma nova rodada de consultas (retry)
	useEffect(() => {
		if (!classSessionId || !enabled) return;

		let cancelled = false;
		let timer: ReturnType<typeof setTimeout> | undefined;
		let polls = 0;

		async function tick() {
			polls += 1;
			const result = await trpc.materials.ingestionStatus.query({
				classSessionId: classSessionId as string,
			});
			if (cancelled) return;
			if (result) setStatus(result);
			if (result && isReading(result) && polls < INGESTION_MAX_POLLS) {
				timer = setTimeout(tick, INGESTION_POLL_INTERVAL_MS);
			}
		}

		void tick();
		return () => {
			cancelled = true;
			if (timer) clearTimeout(timer);
		};
	}, [classSessionId, enabled, round]);

	const retry = useCallback(async () => {
		if (!classSessionId) return;
		await trpc.materials.startIngestion.mutate({ classSessionId });
		setRound((current) => current + 1);
	}, [classSessionId]);

	return { status, retry } as const;
}
