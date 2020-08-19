import Jimp from "jimp"
import { readImage } from "./read-image"

export class ImageLoader {
	image?: Jimp
	readonly date = Date.now()

	constructor(readonly url: string, readonly messageId: string) {}

	async load() {
		try {
			return (this.image = await readImage(this.url))
		} catch (error) {
			console.warn(`Error loading from ${this.url}`, error)
		}
	}
}
