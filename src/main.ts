import {
	Channel,
	Client,
	Message,
	MessageReaction,
	TextChannel,
} from "discord.js"
import Jimp from "jimp"
import { uniqBy } from "lodash"
import { from } from "rxjs"
import { filter, switchMap } from "rxjs/operators"
import secrets from "../secrets.json"
import { isTruthy } from "./helpers"
import { ImageLoader } from "./image-loader"

const client = new Client()
const checkedChannels = new Set(["671787605624487941"])

let prevPostedImages: readonly ImageLoader[] = []

function addImageLoader(loader: ImageLoader) {
	prevPostedImages = uniqBy([...prevPostedImages, loader], (l) => l.url).slice(
		-50,
	)
}

function createImageLoader(url: string, messageId: string) {
	const loader = new ImageLoader(url, messageId)
	addImageLoader(loader)
	return loader
}

function getMessageImages(message: Message) {
	const attachedImages = message.attachments.map((a) => a.url)

	const embeddedImages = message.embeds
		.map((m) => m.thumbnail?.url)
		.filter(isTruthy)

	return [...attachedImages, ...embeddedImages]
}

const isTextChannel = (channel: Channel): channel is TextChannel =>
	channel instanceof TextChannel

async function loadInitialImages() {
	return from(checkedChannels)
		.pipe(
			switchMap((id) => client.channels.fetch(id)),
			filter(isTextChannel),
			switchMap((channel) => channel.messages.fetch({ limit: 50 })),
			switchMap((messageList) => from(messageList.values())),
			switchMap((message) => {
				const images = getMessageImages(message)
				return from(images.map((url) => ({ url, message })))
			}),
			switchMap(({ url, message }) =>
				createImageLoader(url, message.id).load(),
			),
		)
		.toPromise()
}

client.on("ready", async () => {
	await loadInitialImages()
	console.info("ready")
})

client.on("message", async (message) => {
	if (!checkedChannels.has(message.channel.id)) return

	const imageUrls = getMessageImages(message)

	for (const url of imageUrls) {
		const loader = new ImageLoader(url, message.id)

		loader.load().then((image) => {
			if (!image) return

			for (const prevLoader of prevPostedImages) {
				if (!prevLoader.image) continue

				const diff = Jimp.distance(image, prevLoader.image)
				if (diff < 0.1) {
					message.channel.messages
						.fetch(prevLoader.messageId)
						.then((otherMessage) => {
							return message.channel.send({
								content: `looks like you might've posted a duplicate!`,
								embed: {
									fields: [
										{ name: "this image:", value: message.url, inline: false },
										{
											name: "looks similar to this:",
											value: otherMessage.url,
											inline: false,
										},
									],
									footer: {
										text: `${(1 - diff) * 100}% certainty - react ❌ to remove`,
									},
								},
							})
						})
						.then(async (newMessage) => {
							await newMessage.react("❌")

							newMessage
								.awaitReactions(
									(reaction: MessageReaction) => reaction.emoji.name === "❌",
									{ max: 1 },
								)
								.then(() => {
									newMessage.delete()
								})
						})
				}
			}

			addImageLoader(loader)
		})
	}

	return
})

async function main() {
	await client.login(secrets.discordBotToken)
}

main().catch((error) => {
	console.error(String(error))
	process.exit(1)
})
