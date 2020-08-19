import { join } from "path"
import { ImagePost, RepostCop } from "./repost-cop"

const mockMessage = ({ imageUrl = "", messageLink = "" } = {}): ImagePost => ({
	imageUrl,
	messageLink,
})

const fixturesPath = join(__dirname, "../fixtures")
const mockImage1 = join(fixturesPath, "1.jpg")
const mockImage2 = join(fixturesPath, "2.jpg")
const mockImage3 = join(fixturesPath, "3.png")

test("max posts", () => {
	const bot = new RepostCop(3)

	bot.addPost(mockMessage({ imageUrl: "a" }))
	bot.addPost(mockMessage({ imageUrl: "b" }))

	expect(bot.posts).toHaveLength(2)

	bot.addPost(mockMessage({ imageUrl: "c" }))
	bot.addPost(mockMessage({ imageUrl: "d" }))

	expect(bot.posts).toHaveLength(3)
})

test("unique posts", () => {
	const bot = new RepostCop(3)

	bot.addPost(mockMessage({ imageUrl: "a" }))
	bot.addPost(mockMessage({ imageUrl: "a" }))

	expect(bot.posts).toHaveLength(1)

	bot.addPost(mockMessage({ imageUrl: "c" }))
	bot.addPost(mockMessage({ imageUrl: "d" }))

	expect(bot.posts).toHaveLength(3)
})

test("finds reposts", async () => {
	const bot = new RepostCop(3)
	bot.addPost(mockMessage({ imageUrl: mockImage1 }))
	bot.addPost(mockMessage({ imageUrl: mockImage2 }))
	bot.addPost(mockMessage({ imageUrl: mockImage3 }))

	const repost1 = await bot.findRepost(mockMessage({ imageUrl: mockImage2 }))
	expect(repost1).toBeDefined()

	const repost2 = await bot.findRepost(mockMessage({ imageUrl: mockImage1 }))
	expect(repost2).toBeDefined()
}, 10000)

test("returns undefined if there are no reposts", async () => {
	const bot = new RepostCop(3)
	bot.addPost(mockMessage({ imageUrl: mockImage1 }))
	bot.addPost(mockMessage({ imageUrl: mockImage1 }))
	bot.addPost(mockMessage({ imageUrl: mockImage2 }))

	const repost = await bot.findRepost(mockMessage({ imageUrl: mockImage3 }))
	expect(repost).toBeUndefined()
}, 10000)

// this is temporary
// need to figure out how to actually wait for jimp to asynchronously import its thing
afterAll((done) => setTimeout(done, 500))
