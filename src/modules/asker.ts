import { ChatOpenAI } from "@langchain/openai"
import { Document } from "@langchain/core/documents"
import { PromptTemplate } from "@langchain/core/prompts"
import { RetrievalQAChain } from "langchain/chains"

import { redis, redisVectorStore } from "../services/redis-store"
import { openAIConfig } from "../config/open-ai"

const openAIChat = new ChatOpenAI({
	openAIApiKey: openAIConfig.apiKey,
	modelName: "gpt-3.5-turbo",
	temperature: 0.3
})

const prompt = new PromptTemplate({
	template: `
		Você responde perguntas sobre um desenvolvedor chamado Guilherme Mota.
		O usuário está pesquisando informações sobre esse desenvolvedor.
		Use o conteúdo do site pessoal abaixo para responder a pergunta do usuário.
		Se a resposta não for encontrada no conteúdo do site pessoal, responda que você não sabe, não tente inventar uma resposta.

		Conteúdo do Site Pessoal do Guilherme Mota:
		{context}

		Pergunta:
		{question}
	`.trim(),
	inputVariables: ["context", "question"]
})

const chain = RetrievalQAChain.fromLLM(openAIChat, redisVectorStore.asRetriever(), {
	prompt,
	returnSourceDocuments: true
})

async function ask () {
	await redis.connect()

	const question = "Quais são as habilidades principais de Guilherme Mota?"

	const result = await chain.call({ query: question })

	const response = result.text
	const sources = result.sourceDocuments.map((document: Document) => document.metadata.source)

	console.log({ question, response, sources })

	await redis.disconnect()
}

ask()