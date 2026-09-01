export default function helloPi(pi) {
	pi.registerCommand("hello", {
		description: "Show a greeting from the example extension",
		handler: async (args, ctx) => {
			const name = args.trim() || "developer";
			ctx.ui.notify(`Hello, ${name}!`, "info");
		},
	});
}
