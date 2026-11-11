// Interpreta as condições do Drizzle (eq e inArray) para os bancos falsos dos testes.

function collect(chunk: any, pick: (c: any) => unknown, results: any[] = []): any[] {
	if (!chunk) return results;
	if (Array.isArray(chunk)) {
		for (const sub of chunk) collect(sub, pick, results);
		return results;
	}
	const picked = pick(chunk);
	if (picked !== undefined) results.push(...(Array.isArray(picked) ? picked : [picked]));
	if (Array.isArray(chunk.queryChunks)) {
		for (const sub of chunk.queryChunks) collect(sub, pick, results);
	}
	return results;
}

const params = (cond: any) =>
	collect(cond, (c) =>
		c.value !== undefined && !Array.isArray(c.value) ? c.value : undefined,
	);

const columns = (cond: any) =>
	collect(cond, (c) =>
		c.name && typeof c.name === "string" ? c.name : undefined,
	);

const sqlText = (cond: any) =>
	collect(cond, (c) =>
		Array.isArray(c.value) && c.value.every((v: unknown) => typeof v === "string")
			? c.value
			: undefined,
	).join(" ");

export function matchesCondition(
	item: any,
	cond: any,
	columnToProp: Record<string, string>,
): boolean {
	if (!cond) return true;
	const cols = columns(cond) as string[];
	const values = params(cond);
	if (cols.length === 0 || values.length === 0) return true;

	const propOf = (column: string) => columnToProp[column] ?? column;

	if (/\bin\b/i.test(sqlText(cond))) {
		return values.includes(item[propOf(cols[0] as string)]);
	}

	for (let i = 0; i < Math.min(cols.length, values.length); i++) {
		const prop = propOf(cols[i] as string);
		if (item[prop] !== undefined && item[prop] !== values[i]) return false;
	}
	return true;
}
