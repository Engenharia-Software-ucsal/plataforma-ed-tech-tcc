import {
	type MarkdownBlock,
	type MarkdownInline,
	parseMarkdown,
} from "@busuucsal-v3/notes";
import { CheckSquare, Square } from "lucide-react-native";
import { Fragment, useMemo } from "react";
import { Linking, Text, View } from "react-native";
import { AppText } from "@/components/atoms/AppText";
import { cn } from "@/lib/cn";

export type MarkdownViewProps = {
	content: string;
	/** Toque num `[[link]]`. Recebe o título de destino. */
	onPressWikilink?: (target: string) => void;
	/** O link aponta para uma nota que existe? Os que não apontam aparecem tracejados. */
	isWikilinkResolved?: (target: string) => boolean;
	testID?: string;
};

const HEADING_CLASS: Record<number, string> = {
	1: "text-[22px] font-bold",
	2: "text-[19px] font-bold",
	3: "text-[17px] font-semibold",
	4: "text-[15px] font-semibold",
	5: "text-[14px] font-semibold",
	6: "text-[13px] font-semibold",
};

/**
 * Renderiza o Markdown das notas com componentes nativos (sem WebView), usando
 * o parser compartilhado com o servidor (`@busuucsal-v3/notes`).
 */
export function MarkdownView({
	content,
	onPressWikilink,
	isWikilinkResolved,
	testID,
}: MarkdownViewProps) {
	const blocks = useMemo(() => parseMarkdown(content), [content]);

	if (blocks.length === 0) {
		return (
			<AppText
				testID={testID}
				variant="body"
				tone="muted"
				className="text-[14px] italic"
			>
				Nota vazia. Toque em Editar para começar a escrever.
			</AppText>
		);
	}

	return (
		<View testID={testID} className="gap-3">
			{blocks.map((block, index) => (
				<Block
					// biome-ignore lint/suspicious/noArrayIndexKey: blocos não têm id e a ordem é estável por renderização
					key={index}
					block={block}
					onPressWikilink={onPressWikilink}
					isWikilinkResolved={isWikilinkResolved}
				/>
			))}
		</View>
	);
}

type InlineProps = Pick<
	MarkdownViewProps,
	"onPressWikilink" | "isWikilinkResolved"
>;

function Block({ block, ...inline }: InlineProps & { block: MarkdownBlock }) {
	switch (block.type) {
		case "heading":
			return (
				<AppText
					variant="heading"
					tone="primary"
					accessibilityRole="header"
					className={cn("pt-1", HEADING_CLASS[block.level])}
				>
					<Inlines nodes={block.children} {...inline} />
				</AppText>
			);
		case "paragraph":
			return (
				<AppText
					variant="body"
					tone="secondary"
					className="text-[14px] leading-6"
				>
					<Inlines nodes={block.children} {...inline} />
				</AppText>
			);
		case "blockquote":
			return (
				<View className="border-accent-primary border-l-2 pl-3">
					<AppText
						variant="body"
						tone="muted"
						className="text-[14px] italic leading-6"
					>
						<Inlines nodes={block.children} {...inline} />
					</AppText>
				</View>
			);
		case "code":
			return (
				<View className="rounded-sm-card border border-border-subtle bg-surface-primary p-3">
					<AppText
						variant="mono"
						tone="secondary"
						className="text-[12px] leading-5"
					>
						{block.text}
					</AppText>
				</View>
			);
		case "hr":
			return <View className="h-px bg-border-subtle" />;
		case "list":
			return (
				<View className="gap-1.5">
					{block.items.map((item, index) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: itens de lista não têm id
						<View key={index} className="flex-row gap-2">
							<View className="w-5 items-center pt-1">
								{item.checked === null ? (
									<AppText
										variant="body"
										tone="muted"
										className="text-[14px] leading-5"
									>
										{block.ordered ? `${block.start + index}.` : "•"}
									</AppText>
								) : item.checked ? (
									<CheckSquare size={15} color="#582CFF" />
								) : (
									<Square size={15} color="#A1A1AA" />
								)}
							</View>
							<AppText
								variant="body"
								tone={item.checked ? "muted" : "secondary"}
								className={cn(
									"flex-1 text-[14px] leading-6",
									item.checked && "line-through",
								)}
							>
								<Inlines nodes={item.children} {...inline} />
							</AppText>
						</View>
					))}
				</View>
			);
	}
}

function Inlines({
	nodes,
	...inline
}: InlineProps & { nodes: MarkdownInline[] }) {
	return (
		<>
			{nodes.map((node, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: trechos inline não têm id
				<Fragment key={index}>
					<InlineNode node={node} {...inline} />
				</Fragment>
			))}
		</>
	);
}

function InlineNode({
	node,
	onPressWikilink,
	isWikilinkResolved,
}: InlineProps & { node: MarkdownInline }) {
	const inline = { onPressWikilink, isWikilinkResolved };
	switch (node.type) {
		case "text":
			return <Text>{node.text}</Text>;
		case "bold":
			return (
				<Text className="font-bold text-foreground-primary">
					<Inlines nodes={node.children} {...inline} />
				</Text>
			);
		case "italic":
			return (
				<Text className="italic">
					<Inlines nodes={node.children} {...inline} />
				</Text>
			);
		case "code":
			return (
				<Text className="bg-surface-primary font-mono text-[12px] text-accent-tertiary">
					{node.text}
				</Text>
			);
		case "link":
			return (
				<Text
					className="text-accent-tertiary underline"
					accessibilityRole="link"
					onPress={() => {
						void Linking.openURL(node.href);
					}}
				>
					<Inlines nodes={node.children} {...inline} />
				</Text>
			);
		case "wikilink": {
			const resolved = isWikilinkResolved
				? isWikilinkResolved(node.target)
				: true;
			return (
				<Text
					testID={`wikilink-${node.target}`}
					accessibilityRole="link"
					accessibilityHint={
						resolved ? "Abre a nota" : "Nota ainda não existe: toque para criar"
					}
					onPress={() => onPressWikilink?.(node.target)}
					className={cn(
						"font-semibold",
						resolved
							? "text-accent-tertiary underline"
							: "text-foreground-muted underline decoration-dashed",
					)}
				>
					{node.label}
				</Text>
			);
		}
	}
}
