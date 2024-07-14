import "dotenv/config"
import { RedisVectorStore } from "@langchain/redis"
import { OpenAIEmbeddings } from "@langchain/openai"
import { createClient } from "redis"

import { redisConfig } from "../config/redis"
import { openAIConfig } from "../config/open-ai"

export const redis = createClient({
	url: redisConfig.url
})

export const redisVectorStore = new RedisVectorStore(
	new OpenAIEmbeddings({ openAIApiKey: openAIConfig.apiKey }),
	{
		indexName: "guilhermebkel-about-embeddings",
		redisClient: redis,
		keyPrefix: "site-pages:"
	}
)
