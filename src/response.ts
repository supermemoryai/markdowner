export const html = `<!--
// v0 by Vercel.
// https://v0.dev/t/BfKJMJl2Xx0
-->

<html>

<head>
	<script src="https://cdn.tailwindcss.com"></script>
</head>

<body>
	<!--
// v0 by Vercel.
// https://v0.dev/t/BfKJMJl2Xx0
-->

	<main
		class="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-4 py-8">
		<div class="max-w-4xl w-full">
			<div class="flex flex-col items-center justify-center space-y-6">
				<h1 class="text-4xl font-bold tracking-tight">Markdowner ⚡</h1>
				<p class="text-lg text-gray-600 dark:text-gray-400">
					A fast open-source tool to convert any website into LLM-ready markdown data.
				</p>

				<a href="https://github.com/dhravya/markdowner" class="underline underline-offset-4 hover:underline">
					<img src="https://pluspng.com/img-png/github-logo-png-white-github-11-icon-free-white-social-icons-256x256.png" alt="Github logo" width="40" height="40" />
				</a>

				<div class="text-sm text-gray-600 dark:text-gray-400">
					Made with ❤️ by <a href="https://dhr.wtf">Dhravya Shah</a>
				</div>
				<div class="bg-white dark:bg-gray-800 rounded-lg shadow-md w-full p-6 space-y-4">
					<script>
						function redirectToMD(event) {
							event.preventDefault();
							const url = document.getElementById('urlInput').value;
							window.location.href = \`/?url=\${encodeURIComponent(url)}&enableDetailedResponse=true\`;
						}
					</script>

					<form class="flex items-center space-x-2" onsubmit="redirectToMD(event)">
						<input id="urlInput"
							class="flex h-10 w-full text-black rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex-1"
							type="text" placeholder="Enter website URL" />
						<button type="submit"
							class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
							Convert to Markdown
						</button>
					</form>
					<h2 class="text-2xl font-bold">Usage Example</h2>
					<pre class="bg-gray-100 dark:bg-gray-700 rounded-md p-4 text-sm font-mono">
			<code>$ curl 'https://md.dhr.wtf/?url=https://example.com'</code></pre>
					<h2 class="text-2xl font-bold">Required Parameters</h2>
					<ul class="space-y-2">
						<li>
							<span class="font-semibold">url</span> (string): The website URL to convert into markdown.
						</li>
					</ul>
					<h2 class="text-2xl font-bold">Optional Parameters</h2>
					<ul class="space-y-2">
						<li>
							<span class="font-semibold">enableDetailedResponse</span> (boolean, default:
							<code>false</code>): Toggle
							for detailed response with full HTML content.
						</li>
						<li>
							<span class="font-semibold">crawlSubpages</span> (boolean, default: <code>false</code>):
							Crawl and
							return markdown for up to 10 subpages.
						</li>
						<li>
							<span class="font-semibold">llmFilter</span> (boolean, default: <code>false</code>): Filter
							out
							unnecessary information using LLM.
						</li>
					</ul>
					<h2 class="text-2xl font-bold">Response Types</h2>
					<ul class="space-y-2">
						<li>
							Add <code>Content-Type: text/plain</code> in headers for plain text response.
						</li>
						<li>
							Add <code>Content-Type: application/json</code> in headers for JSON response.
						</li>
					</ul>
				</div>
			</div>
		</div>
	</main>
</body>

</html>
`;

// # Markdowner ⚡
// ==================
// A fast tool to convert any website into LLM-ready markdown data.

// Usage example:
// $ curl 'https://md.dhr.wtf/?url=https://example.com'

// [REQUIRED PARAMETERS]
// url (string)          -> The website URL to convert into markdown.

// [OPTIONAL PARAMETERS]
// enableDetailedResponse (boolean: false)  -> Toggle for detailed response with full HTML content.
// crawlSubpages         (boolean: false)  -> Crawl and return markdown for up to 10 subpages.
// llmFilter             (boolean: false)  -> Filter out unnecessary information using LLM.

// [RESPONSE TYPES]
// Add 'Content-Type: text/plain' in headers for plain text response.
// Add 'Content-Type: application/json' in headers for JSON response.
// ================================================================
