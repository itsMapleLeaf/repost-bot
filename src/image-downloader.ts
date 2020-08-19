import { readFile } from "fs/promises"
import { join } from "path"
import { dataFolder } from "./constants"
import { Task } from "./task"

const imagesFolder = join(dataFolder, "images")
const cachePath = join(dataFolder, "image-cache.json")

let cache = {}

export const loadCacheTask = new Task(() => ({
	async run() {
		try {
			const contents = await readFile(cachePath, "utf-8")
			cache = JSON.parse(contents)
		} catch (error) {
			console.warn("Could not load downloads cache", error)
		}
	},
}))

export async function addCacheEntry(key: string, value: string) {}
