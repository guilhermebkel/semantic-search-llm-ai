import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer"
import { Document } from "@langchain/core/documents"
import { TokenTextSplitter } from "langchain/text_splitter"
import { RedisVectorStore } from "@langchain/redis"
import { OpenAIEmbeddings } from "@langchain/openai"

import { redis } from "../services/redis-store"
import { openAIConfig } from "../config/open-ai"

const SOURCE_URLS: string[] = [
	"https://about.guilherr.me",
	"https://about.guilherr.me/skills/hard-skills",
	"https://about.guilherr.me/skills/soft-skills",
	"https://about.guilherr.me/experiences",
	"https://about.guilherr.me/education",
	"https://about.guilherr.me/mistakes"
]

function createLoader (url: string) {
	return new PuppeteerWebBaseLoader(url, {
		launchOptions: {
			headless: "new"
		},
		evaluate: async (page, browser) => {
			const pageContent: string = await page.evaluate(() => {
				const element: HTMLElement | null = document.querySelector("#main-content main")

				return element?.innerText
			})

			await browser.close()

			return pageContent
		}
	})
}

async function splitDocuments (documents: Document[]): Promise<Document[]> {
	const splitter = new TokenTextSplitter({
		encodingName: "cl100k_base",
		chunkSize: 600,
		chunkOverlap: 0
	})

	return await splitter.splitDocuments(documents)
}

async function indexDocuments (documents: Document[]): Promise<void> {
	await redis.connect()

	await RedisVectorStore.fromDocuments(
		documents,
		new OpenAIEmbeddings({ openAIApiKey: openAIConfig.apiKey }),
		{
			indexName: "guilhermebkel-about-embeddings",
			redisClient: redis,
			keyPrefix: "site-pages:"
		}
	)

	await redis.disconnect()
}

async function load (): Promise<void> {
	console.log(`[LOAD] Starting load process...`)

	const documents: Document[] = []
	
	const loaders = SOURCE_URLS.map(createLoader)

	await Promise.all(
		loaders.map(async loader => {
			const loadedDocuments = await loader.load()

			console.log(`[LOAD] Loaded document: ${loader.webPath}`)

			documents.push(...loadedDocuments)
		})
	)

	const splittedDocuments = await splitDocuments(documents)

	console.log(`[LOAD] Splitted all documents in smaller chunks!`)

	await indexDocuments(splittedDocuments)

	console.log(`[LOAD] Indexed all documents!`)
}

load()
