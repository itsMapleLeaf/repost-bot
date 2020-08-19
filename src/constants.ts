import "dotenv/config"
import { join } from "path"
import { raise } from "./helpers"

export const discordBotToken =
	process.env.DISCORD_BOT_TOKEN ?? raise("bot token not configured")

export const channels = (
	process.env.CHANNELS ?? raise("channels not configured")
)
	.split(",")
	.map((id) => id.trim())

export const dataFolder = join(__dirname, "../data")
