import { readFileSync } from "node:fs";
import { Key, matchesKey, truncateToWidth } from "@earendil-works/pi-tui";
import {
	getSettingsPath,
	readSettings,
	reconcilePackages,
	selectedPackageIds,
	writeSettings,
} from "./settings.js";

const manifest = JSON.parse(
	readFileSync(new URL("../manifest.json", import.meta.url), "utf8"),
);

function packageSelector(ctx, items, initialIds) {
	return ctx.ui.custom((tui, theme, _keybindings, done) => {
		let cursor = 0;
		const checked = new Set(initialIds);
		let cachedWidth;
		let cachedLines;

		function invalidate() {
			cachedWidth = undefined;
			cachedLines = undefined;
		}

		function toggleCurrent() {
			const id = items[cursor]?.id;
			if (!id) return;
			if (checked.has(id)) checked.delete(id);
			else checked.add(id);
		}

		return {
			render(width) {
				if (cachedLines && cachedWidth === width) return cachedLines;
				const lines = [
					truncateToWidth(
						theme.fg("accent", theme.bold("Pi Rakit Onboarding")),
						width,
					),
					truncateToWidth(
						theme.fg(
							"dim",
							"↑↓ navigate • space toggle • a toggle all • enter save • esc cancel",
						),
						width,
					),
					"",
				];
				for (let index = 0; index < items.length; index += 1) {
					const item = items[index];
					const active = index === cursor;
					const marker = checked.has(item.id) ? "[x]" : "[ ]";
					const prefix = active ? ">" : " ";
					const label = `${prefix} ${marker} [${item.category ?? "Other"}] ${item.label} — ${item.description ?? ""}`;
					lines.push(
						truncateToWidth(
							theme.fg(active ? "accent" : "text", label),
							width,
						),
					);
				}
				cachedWidth = width;
				cachedLines = lines;
				return lines;
			},
			invalidate,
			handleInput(data) {
				if (matchesKey(data, Key.up)) cursor = Math.max(0, cursor - 1);
				else if (matchesKey(data, Key.down))
					cursor = Math.min(items.length - 1, cursor + 1);
				else if (matchesKey(data, Key.space)) toggleCurrent();
				else if (data === "a") {
					if (items.every((item) => checked.has(item.id))) checked.clear();
					else for (const item of items) checked.add(item.id);
				} else if (matchesKey(data, Key.enter)) {
					done([...checked]);
					return;
				} else if (matchesKey(data, Key.escape)) {
					done(null);
					return;
				} else return;
				invalidate();
				tui.requestRender();
			},
		};
	});
}

export default function onboardingExtension(pi) {
	pi.registerCommand("onboarding", {
		description: "Choose again which Pi Rakit packages are enabled",
		async handler(_args, ctx) {
			if (ctx.mode !== "tui") {
				ctx.ui.notify("Onboarding requires Pi's interactive TUI.", "warning");
				return;
			}

			const scopeLabel = await ctx.ui.select("Update Pi Rakit packages in", [
				"Global settings (~/.pi/agent/settings.json)",
				"Project settings (.pi/settings.json)",
			]);
			if (!scopeLabel) return;
			const scope = scopeLabel.startsWith("Global") ? "global" : "project";
			const settingsPath = getSettingsPath(scope, ctx.cwd);
			let settings;
			try {
				settings = readSettings(settingsPath);
			} catch (error) {
				ctx.ui.notify(error.message, "error");
				return;
			}

			const visibleItems = manifest.packages.filter((item) => !item.hidden);
			const before = selectedPackageIds(settings, manifest).filter((id) =>
				visibleItems.some((item) => item.id === id),
			);
			const selected = await packageSelector(ctx, visibleItems, before);
			if (selected === null) return;

			const selectedSet = new Set(selected);
			const beforeSet = new Set(before);
			const added = visibleItems.filter(
				(item) => selectedSet.has(item.id) && !beforeSet.has(item.id),
			);
			const removed = visibleItems.filter(
				(item) => beforeSet.has(item.id) && !selectedSet.has(item.id),
			);
			const summary = [
				`Scope: ${scope}`,
				`Enable: ${added.length ? added.map((item) => item.label).join(", ") : "none"}`,
				`Disable: ${removed.length ? removed.map((item) => item.label).join(", ") : "none"}`,
				"Packages not managed by Pi Rakit will be preserved.",
			].join("\n");
			if (!(await ctx.ui.confirm("Save onboarding choices?", summary))) return;

			try {
				writeSettings(
					settingsPath,
					reconcilePackages(settings, manifest, selected),
				);
			} catch (error) {
				ctx.ui.notify(`Could not update settings: ${error.message}`, "error");
				return;
			}
			ctx.ui.notify(`Updated ${settingsPath}. Reloading Pi…`, "info");
			await ctx.reload();
		},
	});
}
