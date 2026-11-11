import { env } from "@busuucsal-v3/env/server";
import { OAuth2Client } from "google-auth-library";
import type { FileDownloader } from "./ports.js";

const DRIVE_API = "https://www.googleapis.com/drive/v3/files";
const MAX_FILE_BYTES = 25 * 1024 * 1024;

export function createDriveFileDownloader(): FileDownloader {
	return {
		async download(driveFileId, refreshToken) {
			const client = new OAuth2Client(
				env.GOOGLE_SERVER_CLIENT_ID,
				env.GOOGLE_CLIENT_SECRET,
			);
			client.setCredentials({ refresh_token: refreshToken });
			const id = encodeURIComponent(driveFileId);

			const meta = await client.request<{ mimeType?: string; size?: string }>({
				url: `${DRIVE_API}/${id}?fields=mimeType,size`,
			});
			const mimeType = meta.data.mimeType ?? "application/octet-stream";
			if (Number(meta.data.size ?? 0) > MAX_FILE_BYTES) {
				throw new Error("Arquivo maior que 25 MB.");
			}

			const file = await client.request<ArrayBuffer>({
				url: `${DRIVE_API}/${id}?alt=media`,
				responseType: "arraybuffer",
			});
			return { buffer: new Uint8Array(file.data), mimeType };
		},
	};
}

/** O ID do arquivo no Drive vem do link do material ou do ID gravado pelo sync. */
export function extractDriveFileId(material: {
	fileUrl: string;
	googleMaterialId: string | null;
}): string | null {
	const fromUrl =
		/\/d\/([A-Za-z0-9_-]+)/.exec(material.fileUrl) ??
		/[?&]id=([A-Za-z0-9_-]+)/.exec(material.fileUrl);
	if (fromUrl?.[1]) return fromUrl[1];

	if (material.fileUrl.includes("drive.google.com") && material.googleMaterialId) {
		return /^mat-[^-]+-[^-]+-(.+)$/.exec(material.googleMaterialId)?.[1] ?? null;
	}
	return null;
}
