import { checkbox, confirm } from "@inquirer/prompts";

export async function promptForPackageIds(manifest, defaultIds) {
	const choices = manifest.packages
		.filter((item) => !item.hidden)
		.map((item) => ({
			name: item.category
				? `[${item.category}] ${item.label} — ${item.description ?? ""}`
				: `${item.label} — ${item.description ?? ""}`,
			value: item.id,
			checked: defaultIds.includes(item.id),
		}));

	return checkbox({
		message: "Select Pi extensions to add",
		choices,
		required: true,
		loop: false,
	});
}

export async function promptForConfirmation(plan, targetDirectory) {
	const packages = plan.items
		.map(
			(item, index) =>
				`  ${index + 1}. ${item.label} -> ${plan.packageSources[index]}`,
		)
		.join("\n");

	return confirm({
		message: `Target: ${targetDirectory}\n\nPackages:\n${packages}\n\nContinue?`,
		default: true,
	});
}
