import { Text, type TextProps } from "react-native";
import { AppText } from "@/components/atoms/AppText";

export type WikilinkTextProps = TextProps & {
	content: string;
	onPressWikilink?: (title: string) => void;
	testID?: string;
};

export function WikilinkText({
	content,
	onPressWikilink,
	testID,
	...props
}: WikilinkTextProps) {
	const regex = /\[\[(.*?)\]\]/g;
	const elements: React.ReactNode[] = [];
	let lastIndex = 0;
	let match: RegExpExecArray | null = regex.exec(content);

	while (match !== null) {
		const matchStart = match.index;
		const matchEnd = regex.lastIndex;

		if (matchStart > lastIndex) {
			elements.push(
				<Text key={`text-${lastIndex}`}>
					{content.slice(lastIndex, matchStart)}
				</Text>,
			);
		}

		const rawContent = match[1];
		const [target, alias] = rawContent.split("|");
		const label = alias?.trim() || target.trim();
		const cleanTarget = target.trim();

		elements.push(
			<Text
				key={`wikilink-${matchStart}`}
				testID={`wikilink-${cleanTarget}`}
				onPress={() => onPressWikilink?.(cleanTarget)}
				className="font-semibold text-accent-tertiary underline"
			>
				[[{label}]]
			</Text>,
		);

		lastIndex = matchEnd;
		match = regex.exec(content);
	}

	if (lastIndex < content.length) {
		elements.push(
			<Text key={`text-${lastIndex}`}>
				{content.slice(lastIndex)}
			</Text>,
		);
	}

	return (
		<AppText
			testID={testID}
			variant="body"
			tone="secondary"
			className="text-[14px] leading-6"
			{...props}
		>
			{elements}
		</AppText>
	);
}
