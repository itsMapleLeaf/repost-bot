import Axios from "axios"
import * as crypto from "crypto"
import { Client } from "discord.js"
import Jimp from "jimp"
import sharp from "sharp"
import secrets from "../secrets.json"

async function readImage(url: string) {
	// jimp doesn't support webp
	if (url.includes(`.webp`)) {
		const response = await Axios(url, { responseType: "arraybuffer" })
		const png = await sharp(Buffer.from(response.data)).png().toBuffer()
		return Jimp.read(png)
	}

	return Jimp.read(url)
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
	const image1 = await readImage(imageUrl)

	console.info(`Downloading (previous) ${previousImageUrl}`)
	const image2 = await readImage(previousImageUrl)

	const diff = Jimp.distance(
		image1,
		image2.resize(image1.getWidth(), image1.getHeight()),
	)
	message.channel.send(
		`difference from previous image: ${Math.round(diff * 100)}%`,
	)
})

async function main() {
	await client.login(secrets.discordBotToken)
}

main().catch((error) => {
	console.error(String(error))
	process.exit(1)
})
