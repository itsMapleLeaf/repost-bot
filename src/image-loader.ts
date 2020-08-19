import Axios from "axios"
import Jimp from "jimp"
import sharp from "sharp"

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

async function readImage(url: string) {
	// jimp doesn't support webp
	if (url.includes(`.webp`)) {
		const response = await Axios(url, { responseType: "arraybuffer" })
		const png = await sharp(Buffer.from(response.data)).png().toBuffer()
		return Jimp.read(png)
	}

	return Jimp.read(url)
}
