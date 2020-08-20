import {
	Channel,
	Client,
	Message,
	MessageReaction,
	TextChannel,
	User,
} from "discord.js"
import { defer, from, Subject } from "rxjs"
import { concatMap, filter, mergeMap } from "rxjs/operators"
import { channels, discordBotToken } from "./constants"
import { isTruthy } from "./helpers"
import { FindRepostResult, ImagePost, RepostCop } from "./repost-cop"

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
		console.info(`found image ${url}`)
		bot.addPost({ imageUrl: url, messageLink: message.url })
	})

	return obs.toPromise()
}

const messageQueue = new Subject<Message>()

messageQueue
	.pipe(
		filter((message) => message.author.id !== client.user?.id),
		filter((message) => checkedChannels.has(message.channel.id)),

		// using concatMap so that the next repost-finding process
		// waits for the previous one
		concatMap(async (message) => {
			const imageUrls = getMessageImages(message)

			const posts = imageUrls.map<ImagePost>((imageUrl) => ({
				imageUrl,
				messageLink: message.url,
			}))

			// deferring, so that findRepost isn't called
			// until the previous stream from the concatMap is done
			const repost$ = defer(() => {
				console.info(
					`checking ${message.id} from ${message.author.username} in #${
						(message.channel as TextChannel).name
					}`,
				)

				return from(posts).pipe(
					concatMap((post) =>
						defer(() => {
							console.info(`checking ${post.imageUrl}`)
							return bot.findRepost(post)
						}),
					),
					filter((repost): repost is FindRepostResult => repost != null),
				)
			})

			async function showRepostMessage(repost: FindRepostResult) {
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
			}

			repost$.subscribe({
				next: (repost) => {
					showRepostMessage(repost)
				},
				complete: () => {
					bot.addPost(...posts)
					console.info(`done ${message.id}`)
				},
			})

			return repost$
		}),
	)
	.subscribe()

client.on("ready", async () => {
	console.info("fetching initial images")
	await loadInitialImages()

	console.info("ready")
})

client.on("message", async (message) => {
	messageQueue.next(message)
})

async function main() {
	await client.login(discordBotToken)
}

main().catch((error) => {
	console.error(String(error))
	process.exit(1)
})
