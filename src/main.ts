import * as crypto from "crypto"
import { Client } from "discord.js"
import Jimp from "jimp"
import imageDiff from "lcs-image-diff"
import secrets from "../secrets.json"

async function downloadImage(url: string) {
	const { bitmap } = await Jimp.read(url)
	return bitmap
}

function createHash(data: crypto.BinaryLike) {
	return crypto.createHash("md5").update(data).digest("hex")
}

const client = new Client()
const checkedChannels = new Set(["671787605624487941"])

client.on("ready", () => {
	console.info("ready")
})

client.on("message", async (message) => {
	if (!checkedChannels.has(message.channel.id)) return

	// console.log(message.embeds)
	console.log(message.attachments)

	const imageUrl = message.attachments.first()?.url
	if (!imageUrl) return

	const previousMessages = await message.channel.messages.fetch({
		limit: 50,
		before: message.id,
	})

	let previousImageUrl: string | undefined
	for (const msg of previousMessages.values()) {
		const url = msg.attachments.first()?.url
		if (url) {
			previousImageUrl = url
			break
		}
	}

	if (!previousImageUrl) return

	// const imageUrl = message.embeds?.[0]?.image?.url

	console.info(`Downloading ${imageUrl}`)
	const image1 = await downloadImage(imageUrl)

	console.info(`Downloading (previous) ${previousImageUrl}`)
	const image2 = await downloadImage(previousImageUrl)

	const { data, width, height, diff } = imageDiff(image1, image2)
	message.channel.send(`difference from previous image (0-1): ${diff}`)
})

async function main() {
	await client.login(secrets.discordBotToken)
}

main().catch((error) => {
	console.error(String(error))
	process.exit(1)
})
