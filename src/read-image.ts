import Axios from "axios"
import Jimp from "jimp"
import sharp from "sharp"

export async function readImage(url: string) {
	// jimp doesn't support webp
	if (url.includes(`.webp`)) {
		const response = await Axios(url, { responseType: "arraybuffer" })
		const png = await sharp(Buffer.from(response.data)).png().toBuffer()
		return Jimp.read(png)
	}

	return Jimp.read(url)
}
