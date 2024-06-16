import puppeteer from '@cloudflare/puppeteer';
import { Tweet } from 'react-tweet/api';
import { html } from './response';

export default {
	async fetch(request: Request, env: Env) {
		const id = env.BROWSER.idFromName('browser');
		const obj = env.BROWSER.get(id);
		const resp = await obj.fetch(request.url, { headers: request.headers });
		return resp;
	},
};

const KEEP_BROWSER_ALIVE_IN_SECONDS = 60;
const TEN_SECONDS = 10000;

export class Browser {
	state: DurableObjectState;
	env: Env;
	keptAliveInSeconds: number;
	storage: DurableObjectStorage;
	browser: puppeteer.Browser | undefined;
	request: Request | undefined;
	llmFilter: boolean;
	token = '';

	constructor(state: DurableObjectState, env: Env) {
		this.state = state;
		this.env = env;
		this.keptAliveInSeconds = 0;
		this.storage = this.state.storage;
		this.request = undefined;
		this.llmFilter = false;
	}

	async fetch(request: Request) {
		this.request = request;

		if (!(request.method === 'GET')) {
			return new Response('Method Not Allowed', { status: 405 });
		}

		const url = new URL(request.url).searchParams.get('url');
		const enableDetailedResponse =
			new URL(request.url).searchParams.get('enableDetailedResponse') ===
			'true';
		const crawlSubpages =
			new URL(request.url).searchParams.get('crawlSubpages') === 'true';
		const contentType =
			request.headers.get('content-type') === 'application/json'
				? 'json'
				: 'text';
		const token = request.headers.get('Authorization')?.replace('Bearer ', '');

		this.token = token ?? '';

		this.llmFilter =
			new URL(request.url).searchParams.get('llmFilter') === 'true';

		if (contentType === 'text' && crawlSubpages) {
			return new Response(
				'Error: Crawl subpages can only be enabled with JSON content type',
				{ status: 400 },
			);
		}

		if (!url) {
			return this.buildHelpResponse();
		}

		if (!this.isValidUrl(url)) {
			return new Response(
				'Invalid URL provided, should be a full URL starting with http:// or https://',
				{ status: 400 },
			);
		}

		if (!(await this.ensureBrowser())) {
			return new Response('Could not start browser instance', { status: 500 });
		}

		return crawlSubpages
			? this.crawlSubpages(url, enableDetailedResponse, contentType)
			: this.processSinglePage(url, enableDetailedResponse, contentType);
	}

	async ensureBrowser() {
		let retries = 3;
		while (retries) {
			if (!this.browser || !this.browser.isConnected()) {
				try {
					this.browser = await puppeteer.launch(this.env.MYBROWSER);
					return true;
				} catch (e) {
					console.error(
						`Browser DO: Could not start browser instance. Error: ${e}`,
					);
					retries--;
					if (!retries) {
						return false;
					}

					const sessions = await puppeteer.sessions(this.env.MYBROWSER);

					for (const session of sessions) {
						const b = await puppeteer.connect(
							this.env.MYBROWSER,
							session.sessionId,
						);
						await b.close();
					}

					console.log(
						`Retrying to start browser instance. Retries left: ${retries}`,
					);
				}
			} else {
				return true;
			}
		}
	}

	async crawlSubpages(
		baseUrl: string,
		enableDetailedResponse: boolean,
		contentType: string,
	) {
		const page = await this.browser!.newPage();
		await page.goto(baseUrl);
		const links = await this.extractLinks(page, baseUrl);
		await page.close();

		const uniqueLinks = Array.from(new Set(links)).splice(0, 10);
		const md = await this.getWebsiteMarkdown({
			urls: uniqueLinks,
			enableDetailedResponse,
			classThis: this,
			env: this.env,
		});

		let status = 200;
		if (md.some((item) => item.md === 'Rate limit exceeded')) {
			status = 429;
		}

		return new Response(JSON.stringify(md), { status: status });
	}

	async processSinglePage(
		url: string,
		enableDetailedResponse: boolean,
		contentType: string,
	) {
		const md = await this.getWebsiteMarkdown({
			urls: [url],
			enableDetailedResponse,
			classThis: this,
			env: this.env,
		});
		if (contentType === 'json') {
			let status = 200;
			if (md.some((item) => item.md === 'Rate limit exceeded')) {
				status = 429;
			}
			return new Response(JSON.stringify(md), { status: status });
		} else {
			return new Response(md[0].md, {
				status: md[0].md === 'Rate limit exceeded' ? 429 : 200,
			});
		}
	}

	async extractLinks(page: puppeteer.Page, baseUrl: string) {
		return await page.evaluate((baseUrl) => {
			return Array.from(document.querySelectorAll('a'))
				.map((link) => (link as { href: string }).href)
				.filter((link) => link.startsWith(baseUrl));
		}, baseUrl);
	}

	async getTweet(tweetID: string) {
		const url = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetID}&lang=en&features=tfw_timeline_list%3A%3Btfw_follower_count_sunset%3Atrue%3Btfw_tweet_edit_backend%3Aon%3Btfw_refsrc_session%3Aon%3Btfw_fosnr_soft_interventions_enabled%3Aon%3Btfw_show_birdwatch_pivots_enabled%3Aon%3Btfw_show_business_verified_badge%3Aon%3Btfw_duplicate_scribes_to_settings%3Aon%3Btfw_use_profile_image_shape_enabled%3Aon%3Btfw_show_blue_verified_badge%3Aon%3Btfw_legacy_timeline_sunset%3Atrue%3Btfw_show_gov_verified_badge%3Aon%3Btfw_show_business_affiliate_badge%3Aon%3Btfw_tweet_edit_frontend%3Aon&token=4c2mmul6mnh`;

		const resp = await fetch(url, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
				Accept: 'application/json',
				'Accept-Language': 'en-US,en;q=0.5',
				'Accept-Encoding': 'gzip, deflate, br',
				Connection: 'keep-alive',
				'Upgrade-Insecure-Requests': '1',
				'Cache-Control': 'max-age=0',
				TE: 'Trailers',
			},
		});
		console.log(resp.status);
		const data = (await resp.json()) as Tweet;

		return data;
	}

	async getWebsiteMarkdown({
		urls,
		enableDetailedResponse,
		classThis,
		env,
	}: {
		urls: string[];
		enableDetailedResponse: boolean;
		classThis: Browser;
		env: Env;
	}) {
		classThis.keptAliveInSeconds = 0;

		const isBrowserActive = await this.ensureBrowser();

		if (!isBrowserActive) {
			return [{ url: urls[0], md: 'Could not start browser instance' }];
		}

		return await Promise.all(
			urls.map(async (url) => {
				const ip = this.request?.headers.get('cf-connecting-ip');

				if (this.token !== env.BACKEND_SECURITY_TOKEN) {
					const { success } = await env.RATELIMITER.limit({ key: ip });

					if (!success) {
						return { url, md: 'Rate limit exceeded' };
					}
				}

				const id =
					url +
					(enableDetailedResponse ? '-detailed' : '') +
					(this.llmFilter ? '-llm' : '');
				const cached = await env.MD_CACHE.get(id);

				// Special twitter handling
				if (
					url.startsWith('https://x.com') ||
					url.startsWith('https://twitter.com')
				) {
					const tweetID = url.split('/').pop();
					if (!tweetID) return { url, md: 'Invalid tweet URL' };

					const cacheFind = await env.MD_CACHE.get(tweetID);
					if (cacheFind) return { url, md: cacheFind };

					console.log(tweetID);
					const tweet = await this.getTweet(tweetID);

					if (!tweet || typeof tweet !== 'object' || tweet.text === undefined)
						return { url, md: 'Tweet not found' };

					const tweetMd = `Tweet from @${tweet.user?.name ?? tweet.user?.screen_name ?? 'Unknown'}\n\n${tweet.text}\nImages: ${tweet.photos ? tweet.photos.map((photo) => photo.url).join(', ') : 'none'}\nTime: ${tweet.created_at}, Likes: ${tweet.favorite_count}, Retweets: ${tweet.conversation_count}`;

					await env.MD_CACHE.put(tweetID, tweetMd);

					return { url, md: tweetMd };
				}

				let md =
					cached ??
					(await classThis.fetchAndProcessPage(url, enableDetailedResponse));

				if (this.llmFilter && !cached) {
					for (let i = 0; i < 60; i++) await env.RATELIMITER.limit({ key: ip });

					const answer = (await env.AI.run('@cf/qwen/qwen1.5-14b-chat-awq', {
						prompt: `You are an AI assistant that converts webpage content to markdown while filtering out unnecessary information. Please follow these guidelines:
Remove any inappropriate content, ads, or irrelevant information
If unsure about including something, err on the side of keeping it
Answer in English. Include all points in markdown in sufficient detail to be useful.
Aim for clean, readable markdown.
Return the markdown and nothing else.
Input: ${md}
Output:\`\`\`markdown\n`,
					})) as { response: string };

					md = answer.response;
				}

				await env.MD_CACHE.put(id, md, { expirationTtl: 3600 });
				return { url, md };
			}),
		);
	}

	async fetchAndProcessPage(
		url: string,
		enableDetailedResponse: boolean,
	): Promise<string> {
		const page = await this.browser!.newPage();
		await page.goto(url);
		const md = await page.evaluate((enableDetailedResponse) => {
			function extractArticleMarkdown() {
				const readabilityScript = document.createElement('script');
				readabilityScript.src =
					'https://unpkg.com/@mozilla/readability/Readability.js';
				document.head.appendChild(readabilityScript);

				const turndownScript = document.createElement('script');
				turndownScript.src = 'https://unpkg.com/turndown/dist/turndown.js';
				document.head.appendChild(turndownScript);

				let md = 'no content';

				// Wait for the libraries to load
				md = Promise.all([
					new Promise((resolve) => (readabilityScript.onload = resolve)),
					new Promise((resolve) => (turndownScript.onload = resolve)),
				]).then(() => {
					// Readability instance with the current document
					const reader = new Readability(document.cloneNode(true), {
						charThreshold: 0,
						keepClasses: true,
						nbTopCandidates: 500,
					});

					// Parse the article content
					const article = reader.parse();

					// Turndown instance to convert HTML to Markdown
					const turndownService = new TurndownService();

					let documentWithoutScripts = document.cloneNode(true);
					documentWithoutScripts
						.querySelectorAll('script')
						.forEach((browserItem: any) => browserItem.remove());
					documentWithoutScripts
						.querySelectorAll('style')
						.forEach((browserItem: any) => browserItem.remove());
					documentWithoutScripts
						.querySelectorAll('iframe')
						.forEach((browserItem: any) => browserItem.remove());
					documentWithoutScripts
						.querySelectorAll('noscript')
						.forEach((browserItem: any) => browserItem.remove());

					// article content to Markdown
					const markdown = turndownService.turndown(
						enableDetailedResponse ? documentWithoutScripts : article.content,
					);

					return markdown;
				}) as unknown as string;

				return md;
			}
			return extractArticleMarkdown();
		}, enableDetailedResponse);
		await page.close();
		return md;
	}

	buildHelpResponse() {
		return new Response(html, {
			headers: { 'content-type': 'text/html;charset=UTF-8' },
		});
	}

	isValidUrl(url: string): boolean {
		return /^(http|https):\/\/[^ "]+$/.test(url);
	}

	async alarm() {
		this.keptAliveInSeconds += 10;
		if (this.keptAliveInSeconds < KEEP_BROWSER_ALIVE_IN_SECONDS) {
			await this.storage.setAlarm(Date.now() + TEN_SECONDS);
		} else {
			if (this.browser) {
				await this.browser.close();
				this.browser = undefined;
			}
		}
	}
}
