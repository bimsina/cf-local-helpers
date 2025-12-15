export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);

		// Initialize databases on first request
		await initializeDatabases(env);

		if (url.pathname.startsWith('/dashboard')) {
			const { default: createHandler } = await import('cf-local-helpers');
			const dashboard = createHandler({ basePath: '/dashboard' });
			return dashboard.fetch(request, env, ctx);
		}

		return new Response('Hello World!');
	},
} satisfies ExportedHandler<Env>;

// Check if database has tables already initialized
async function isDatabaseInitialized(db: D1Database): Promise<boolean> {
	try {
		const result = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_cf_%'").all();
		return result.results && result.results.length > 0;
	} catch (error) {
		console.error('Error checking database initialization:', error);
		return false;
	}
}

// Initialize D1 databases with sample tables and data
async function initializeDatabases(env: Env) {
	try {
		// Initialize D1-1 database
		if (env['D1-1']) {
			const isInitialized = await isDatabaseInitialized(env['D1-1']);
			if (!isInitialized) {
				console.log('Initializing D1-1 database...');

				try {
					// Create tables for D1-1 one by one to avoid exec() issues
					await env['D1-1']
						.prepare(
							`
						CREATE TABLE IF NOT EXISTS users (
							id INTEGER PRIMARY KEY AUTOINCREMENT,
							email TEXT UNIQUE NOT NULL,
							name TEXT NOT NULL,
							role TEXT DEFAULT 'user',
							created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
							updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
						)
					`
						)
						.run();

					await env['D1-1']
						.prepare(
							`
						CREATE TABLE IF NOT EXISTS products (
							id INTEGER PRIMARY KEY AUTOINCREMENT,
							name TEXT NOT NULL,
							description TEXT,
							price DECIMAL(10,2) NOT NULL,
							category TEXT,
							in_stock BOOLEAN DEFAULT 1,
							created_at DATETIME DEFAULT CURRENT_TIMESTAMP
						)
					`
						)
						.run();

					await env['D1-1']
						.prepare(
							`
						CREATE TABLE IF NOT EXISTS orders (
							id INTEGER PRIMARY KEY AUTOINCREMENT,
							user_id INTEGER NOT NULL,
							total_amount DECIMAL(10,2) NOT NULL,
							status TEXT DEFAULT 'pending',
							created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
							FOREIGN KEY (user_id) REFERENCES users(id)
						)
					`
						)
						.run();

					await env['D1-1']
						.prepare(
							`
						CREATE TABLE IF NOT EXISTS order_items (
							id INTEGER PRIMARY KEY AUTOINCREMENT,
							order_id INTEGER NOT NULL,
							product_id INTEGER NOT NULL,
							quantity INTEGER NOT NULL,
							unit_price DECIMAL(10,2) NOT NULL,
							FOREIGN KEY (order_id) REFERENCES orders(id),
							FOREIGN KEY (product_id) REFERENCES products(id)
						)
					`
						)
						.run();

					// Insert sample data for D1-1 using individual statements
					const sampleData = [
						{
							sql: 'INSERT OR IGNORE INTO users (email, name, role) VALUES (?, ?, ?)',
							values: ['john.doe@example.com', 'John Doe', 'admin'],
						},
						{
							sql: 'INSERT OR IGNORE INTO users (email, name, role) VALUES (?, ?, ?)',
							values: ['jane.smith@example.com', 'Jane Smith', 'user'],
						},
						{
							sql: 'INSERT OR IGNORE INTO users (email, name, role) VALUES (?, ?, ?)',
							values: ['bob.johnson@example.com', 'Bob Johnson', 'user'],
						},
						{
							sql: 'INSERT OR IGNORE INTO users (email, name, role) VALUES (?, ?, ?)',
							values: ['alice.williams@example.com', 'Alice Williams', 'user'],
						},
						{
							sql: 'INSERT OR IGNORE INTO products (name, description, price, category, in_stock) VALUES (?, ?, ?, ?, ?)',
							values: ['Laptop Pro', 'High-performance laptop for professionals', 1299.99, 'Electronics', 1],
						},
						{
							sql: 'INSERT OR IGNORE INTO products (name, description, price, category, in_stock) VALUES (?, ?, ?, ?, ?)',
							values: ['Wireless Headphones', 'Premium noise-cancelling wireless headphones', 299.99, 'Electronics', 1],
						},
						{
							sql: 'INSERT OR IGNORE INTO products (name, description, price, category, in_stock) VALUES (?, ?, ?, ?, ?)',
							values: ['Coffee Maker', 'Automatic drip coffee maker with programmable timer', 89.99, 'Appliances', 1],
						},
						{
							sql: 'INSERT OR IGNORE INTO products (name, description, price, category, in_stock) VALUES (?, ?, ?, ?, ?)',
							values: ['Running Shoes', 'Comfortable running shoes with advanced cushioning', 149.99, 'Sports', 0],
						},
						{
							sql: 'INSERT OR IGNORE INTO products (name, description, price, category, in_stock) VALUES (?, ?, ?, ?, ?)',
							values: ['Book: Clean Code', 'A handbook of agile software craftsmanship', 39.99, 'Books', 1],
						},
						{ sql: 'INSERT OR IGNORE INTO orders (user_id, total_amount, status) VALUES (?, ?, ?)', values: [1, 1599.98, 'completed'] },
						{ sql: 'INSERT OR IGNORE INTO orders (user_id, total_amount, status) VALUES (?, ?, ?)', values: [2, 339.98, 'shipped'] },
						{ sql: 'INSERT OR IGNORE INTO orders (user_id, total_amount, status) VALUES (?, ?, ?)', values: [3, 89.99, 'pending'] },
						{ sql: 'INSERT OR IGNORE INTO orders (user_id, total_amount, status) VALUES (?, ?, ?)', values: [4, 189.98, 'processing'] },
						{
							sql: 'INSERT OR IGNORE INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
							values: [1, 1, 1, 1299.99],
						},
						{
							sql: 'INSERT OR IGNORE INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
							values: [1, 2, 1, 299.99],
						},
						{
							sql: 'INSERT OR IGNORE INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
							values: [2, 2, 1, 299.99],
						},
						{
							sql: 'INSERT OR IGNORE INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
							values: [2, 5, 1, 39.99],
						},
						{
							sql: 'INSERT OR IGNORE INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
							values: [3, 3, 1, 89.99],
						},
						{
							sql: 'INSERT OR IGNORE INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
							values: [4, 4, 1, 149.99],
						},
					];

					for (const { sql, values } of sampleData) {
						await env['D1-1']
							.prepare(sql)
							.bind(...values)
							.run();
					}

					console.log('D1-1 database initialized successfully');
				} catch (dbError) {
					console.error('Error initializing D1-1 database:', dbError);
				}
			} else {
				console.log('D1-1 database already initialized, skipping...');
			}
		}

		// Initialize D1-2 database
		if (env['D1-2']) {
			const isInitialized = await isDatabaseInitialized(env['D1-2']);
			if (!isInitialized) {
				console.log('Initializing D1-2 database...');

				try {
					// Create tables for D1-2 one by one
					await env['D1-2']
						.prepare(
							`
						CREATE TABLE IF NOT EXISTS blog_posts (
							id INTEGER PRIMARY KEY AUTOINCREMENT,
							title TEXT NOT NULL,
							content TEXT NOT NULL,
							author_id INTEGER,
							published BOOLEAN DEFAULT 0,
							created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
							updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
						)
					`
						)
						.run();

					await env['D1-2']
						.prepare(
							`
						CREATE TABLE IF NOT EXISTS authors (
							id INTEGER PRIMARY KEY AUTOINCREMENT,
							name TEXT NOT NULL,
							email TEXT UNIQUE NOT NULL,
							bio TEXT,
							created_at DATETIME DEFAULT CURRENT_TIMESTAMP
						)
					`
						)
						.run();

					await env['D1-2']
						.prepare(
							`
						CREATE TABLE IF NOT EXISTS categories (
							id INTEGER PRIMARY KEY AUTOINCREMENT,
							name TEXT UNIQUE NOT NULL,
							description TEXT,
							created_at DATETIME DEFAULT CURRENT_TIMESTAMP
						)
					`
						)
						.run();

					await env['D1-2']
						.prepare(
							`
						CREATE TABLE IF NOT EXISTS post_categories (
							post_id INTEGER,
							category_id INTEGER,
							PRIMARY KEY (post_id, category_id),
							FOREIGN KEY (post_id) REFERENCES blog_posts(id),
							FOREIGN KEY (category_id) REFERENCES categories(id)
						)
					`
						)
						.run();

					await env['D1-2']
						.prepare(
							`
						CREATE TABLE IF NOT EXISTS comments (
							id INTEGER PRIMARY KEY AUTOINCREMENT,
							post_id INTEGER NOT NULL,
							author_name TEXT NOT NULL,
							author_email TEXT,
							content TEXT NOT NULL,
							approved BOOLEAN DEFAULT 0,
							created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
							FOREIGN KEY (post_id) REFERENCES blog_posts(id)
						)
					`
						)
						.run();

					// Insert sample data for D1-2 using individual statements
					const sampleData = [
						{
							sql: 'INSERT OR IGNORE INTO authors (name, email, bio) VALUES (?, ?, ?)',
							values: ['Sarah Chen', 'sarah.chen@example.com', 'Tech writer and software engineer with 10+ years experience'],
						},
						{
							sql: 'INSERT OR IGNORE INTO authors (name, email, bio) VALUES (?, ?, ?)',
							values: ['Mike Rodriguez', 'mike.rodriguez@example.com', 'Full-stack developer and open source contributor'],
						},
						{
							sql: 'INSERT OR IGNORE INTO authors (name, email, bio) VALUES (?, ?, ?)',
							values: ['Emma Thompson', 'emma.thompson@example.com', 'UX designer and accessibility advocate'],
						},
						{
							sql: 'INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)',
							values: ['Technology', 'Posts about software development and tech trends'],
						},
						{
							sql: 'INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)',
							values: ['Tutorials', 'Step-by-step guides and how-to articles'],
						},
						{
							sql: 'INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)',
							values: ['Opinion', 'Personal thoughts and industry insights'],
						},
						{
							sql: 'INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)',
							values: ['News', 'Latest updates and announcements'],
						},
						{
							sql: 'INSERT OR IGNORE INTO blog_posts (title, content, author_id, published) VALUES (?, ?, ?, ?)',
							values: [
								'Getting Started with Cloudflare Workers',
								"Cloudflare Workers provide a serverless execution environment that allows you to run JavaScript code at the edge. In this post, we'll explore the basics of setting up your first worker and deploying it to Cloudflare's global network.",
								1,
								1,
							],
						},
						{
							sql: 'INSERT OR IGNORE INTO blog_posts (title, content, author_id, published) VALUES (?, ?, ?, ?)',
							values: [
								'Building Scalable APIs with D1',
								"D1 is Cloudflare's serverless database that brings SQLite to the edge. Learn how to design and implement scalable APIs using D1 as your data layer, including best practices for schema design and query optimization.",
								2,
								1,
							],
						},
						{
							sql: 'INSERT OR IGNORE INTO blog_posts (title, content, author_id, published) VALUES (?, ?, ?, ?)',
							values: [
								'The Future of Edge Computing',
								"Edge computing is revolutionizing how we think about application architecture. This post explores the benefits of edge computing and how it's changing the way we build distributed systems.",
								1,
								0,
							],
						},
						{
							sql: 'INSERT OR IGNORE INTO blog_posts (title, content, author_id, published) VALUES (?, ?, ?, ?)',
							values: [
								'Database Migration Strategies',
								"Migrating databases can be challenging, especially in production environments. We'll cover different migration strategies, tools, and best practices for minimizing downtime and ensuring data integrity.",
								3,
								1,
							],
						},
						{ sql: 'INSERT OR IGNORE INTO post_categories (post_id, category_id) VALUES (?, ?)', values: [1, 1] },
						{ sql: 'INSERT OR IGNORE INTO post_categories (post_id, category_id) VALUES (?, ?)', values: [1, 2] },
						{ sql: 'INSERT OR IGNORE INTO post_categories (post_id, category_id) VALUES (?, ?)', values: [2, 1] },
						{ sql: 'INSERT OR IGNORE INTO post_categories (post_id, category_id) VALUES (?, ?)', values: [2, 2] },
						{ sql: 'INSERT OR IGNORE INTO post_categories (post_id, category_id) VALUES (?, ?)', values: [3, 1] },
						{ sql: 'INSERT OR IGNORE INTO post_categories (post_id, category_id) VALUES (?, ?)', values: [3, 3] },
						{ sql: 'INSERT OR IGNORE INTO post_categories (post_id, category_id) VALUES (?, ?)', values: [4, 1] },
						{ sql: 'INSERT OR IGNORE INTO post_categories (post_id, category_id) VALUES (?, ?)', values: [4, 2] },
						{
							sql: 'INSERT OR IGNORE INTO comments (post_id, author_name, author_email, content, approved) VALUES (?, ?, ?, ?, ?)',
							values: [
								1,
								'Anonymous Reader',
								'reader@example.com',
								'Great introduction to Cloudflare Workers! Looking forward to more tutorials.',
								1,
							],
						},
						{
							sql: 'INSERT OR IGNORE INTO comments (post_id, author_name, author_email, content, approved) VALUES (?, ?, ?, ?, ?)',
							values: [1, 'Dev Enthusiast', 'dev@example.com', 'Could you do a follow-up post about deploying with Wrangler?', 1],
						},
						{
							sql: 'INSERT OR IGNORE INTO comments (post_id, author_name, author_email, content, approved) VALUES (?, ?, ?, ?, ?)',
							values: [
								2,
								'Data Engineer',
								'data@example.com',
								'Very helpful overview of D1. The performance benchmarks are particularly useful.',
								1,
							],
						},
						{
							sql: 'INSERT OR IGNORE INTO comments (post_id, author_name, author_email, content, approved) VALUES (?, ?, ?, ?, ?)',
							values: [
								4,
								'Senior Developer',
								'senior@example.com',
								'Good coverage of migration strategies. Would love to see more about rollback procedures.',
								0,
							],
						},
					];

					for (const { sql, values } of sampleData) {
						await env['D1-2']
							.prepare(sql)
							.bind(...values)
							.run();
					}

					console.log('D1-2 database initialized successfully');
				} catch (dbError) {
					console.error('Error initializing D1-2 database:', dbError);
				}
			} else {
				console.log('D1-2 database already initialized, skipping...');
			}
		}
	} catch (error) {
		console.error('Error initializing databases:', error);
		// Continue execution even if database initialization fails
	}
}
