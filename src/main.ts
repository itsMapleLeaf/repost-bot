import {
	Channel,
	Client,
	Message,
	MessageReaction,
	TextChannel,
	User,
} from "discord.js"
import { from } from "rxjs"
import { filter, mergeMap } from "rxjs/operators"
import { channels, discordBotToken } from "./constants"
import { isTruthy } from "./helpers"
import { ImagePost, RepostCop } from "./repost-cop"

const bot = new RepostCop(100)

const client = new Client()

// this will be configurable later
const checkedChannels = new Set(channels)

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
	const obs = from(checkedChannels).pipe(
		mergeMap((id) => client.channels.fetch(id)),
		filter(isTextChannel),
		mergeMap((channel) => channel.messages.fetch({ limit: 100 })),
		mergeMap((messageList) => from(messageList.values())),
		mergeMap((message) => {
			const images = getMessageImages(message)
			return from(images.map((url) => ({ url, message })))
		}),
	)

	obs.subscribe(({ url, message }) => {
		bot.addPost({ imageUrl: url, messageLink: message.url })
	})

	return obs.toPromise()
}

client.on("ready", async () => {
	console.info("fetching initial images")
	await loadInitialImages()

	console.info("ready")
})

client.on("message", async (message) => {
	if (message.author.id === client.user?.id) return
	if (!checkedChannels.has(message.channel.id)) return

	console.info(
		`checking ${message.id} from ${message.author.username} in ${
			(message.channel as TextChannel).name
		}`,
	)

	const imageUrls = getMessageImages(message)

	const posts = imageUrls.map(
		(imageUrl): ImagePost => ({ imageUrl, messageLink: message.url }),
	)

	from(posts)
		.pipe(mergeMap((post) => bot.findRepost(post)))
		.subscribe({
			next: async (repost) => {
				if (!repost) return

				const botMessage = await message.channel.send({
					content: `looks like you might've posted a duplicate!`,
					embed: {
						fields: [
							{ name: "this image:", value: message.url, inline: false },
							{
								name: "looks similar to this:",
								value: repost.post.messageLink,
								inline: false,
							},
						],
						footer: {
							text: `${
								repost.similarity * 100
							}% similarity - press ❌ to remove`,
						},
					},
				})

				await botMessage.react("❌")

				await botMessage.awaitReactions(
					(reaction: MessageReaction, user: User) =>
						reaction.emoji.name === "❌" && user.id === message.author.id,
					{ max: 1 },
				)

				botMessage.delete()
			},
			complete: () => {
				bot.addPost(...posts)
				console.info(`done ${message.id}`)
			},
		})
})

async function main() {
	await client.login(discordBotToken)
}

main().catch((error) => {
	console.error(String(error))
	process.exit(1)
})
