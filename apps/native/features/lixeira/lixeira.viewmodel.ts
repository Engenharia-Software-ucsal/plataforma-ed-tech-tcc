import { useSetAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";
import type { TrashItem } from "@/features/notas/notas.model";
import { errorMessage, refreshNotesTreeAction } from "@/state/notes";
import { trpc } from "@/utils/trpc";

export type TrashLoadState = "loading" | "ready" | "error";

export function useLixeiraViewModel() {
	const refreshTree = useSetAtom(refreshNotesTreeAction);
	const [items, setItems] = useState<TrashItem[]>([]);
	const [loadState, setLoadState] = useState<TrashLoadState>("loading");
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoadState("loading");
		setError(null);
		try {
			setItems(await trpc.trash.list.query());
			setLoadState("ready");
		} catch (err) {
			setError(errorMessage(err));
			setLoadState("error");
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const run = useCallback(
		async (id: string, action: () => Promise<string | null>) => {
			setBusyId(id);
			setError(null);
			setNotice(null);
			try {
				const message = await action();
				if (message) setNotice(message);
			} catch (err) {
				setError(errorMessage(err));
			} finally {
				setBusyId(null);
			}
		},
		[],
	);

	const restore = useCallback(
		(item: TrashItem) =>
			run(item.id, async () => {
				const restored = await trpc.trash.restore.mutate({
					id: item.id,
					type: item.type,
				});
				setItems((prev) => prev.filter((entry) => entry.id !== item.id));
				await refreshTree();
				return restored.name && restored.name !== item.name
					? `Restaurada como "${restored.name}" (o nome original já estava em uso).`
					: `"${item.name}" foi restaurada.`;
			}),
		[run, refreshTree],
	);

	const deletePermanently = useCallback(
		(item: TrashItem) =>
			run(item.id, async () => {
				await trpc.trash.deletePermanently.mutate({
					id: item.id,
					type: item.type,
				});
				setItems((prev) => prev.filter((entry) => entry.id !== item.id));
				return `"${item.name}" foi excluída de vez.`;
			}),
		[run],
	);

	const empty = useCallback(
		() =>
			run("*", async () => {
				await trpc.trash.empty.mutate();
				setItems([]);
				return "A lixeira foi esvaziada.";
			}),
		[run],
	);

	return {
		items,
		loadState,
		error,
		notice,
		busyId,
		reload: load,
		restore,
		deletePermanently,
		empty,
	} as const;
}
