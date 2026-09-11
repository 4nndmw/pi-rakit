import { Container, Key, Markdown, ScrollView, Text, matchesKey } from "@earendil-works/pi-tui";
import { DynamicBorder, getMarkdownTheme } from "@earendil-works/pi-coding-agent";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export default function markdownPreviewExtension(pi) {
	pi.registerCommand("md", {
		description: "Preview a markdown file in TUI overlay",
		handler: async (args, ctx) => {
			const filePath = resolve(args._[0] ?? "README.md");
			let content;
			try {
				content = readFileSync(filePath, "utf-8");
			} catch {
				ctx.ui.notify(`Cannot read: ${filePath}`, "error");
				return;
			}

			await ctx.ui.custom(
				(tui, theme, _kb, done) => {
					const mdTheme = getMarkdownTheme();
					const container = new Container();

					// Top border
					container.addChild(new DynamicBorder((s) => theme.fg("accent", s)));

					// Title
					const truncated = filePath.length > 60
						? "..." + filePath.slice(-57)
						: filePath;
					container.addChild(new Text(theme.fg("accent", theme.bold(` ${truncated}`)), 0, 0));

					// Markdown body wrapped in ScrollView
					const md = new Markdown(content, 1, 0, mdTheme);
					const scrollView = new ScrollView(md, {
						scrollbar: "auto",
						scrollbarStyle: (s) => theme.fg("dim", s),
					});
					container.addChild(scrollView);

					// Bottom border
					container.addChild(new DynamicBorder((s) => theme.fg("accent", s)));

					return {
						render: (w) => container.render(w),
						invalidate: () => container.invalidate(),
						handleInput: (data) => {
							if (matchesKey(data, Key.escape) || matchesKey(data, "q")) {
								done();
								return;
							}
							// Arrow up/down -> scroll
							if (matchesKey(data, Key.up)) {
								scrollView.scrollBy(-1);
								tui.requestRender();
								return;
							}
							if (matchesKey(data, Key.down)) {
								scrollView.scrollBy(1);
								tui.requestRender();
								return;
							}
						},
					};
				},
				{
					overlay: true,
					overlayOptions: {
						width: "90%",
						maxHeight: "90%",
						anchor: "center",
						margin: 1,
					},
				},
			);
		},
	});
}