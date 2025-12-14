import createHandler from 'cf-local-helpers';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname.startsWith('/dashboard/*')) {
			const dashboard = createHandler({ basePath: '/dashboard' });
			return dashboard.fetch(request, env, ctx);
		}

		return new Response('Hello World!');
	},
} satisfies ExportedHandler<Env>;
