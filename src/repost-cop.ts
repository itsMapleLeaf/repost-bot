import Jimp from "jimp"
import { uniqBy } from "lodash"
import { from } from "rxjs"
import { find, map, mergeMap } from "rxjs/operators"
import { readImage } from "./read-image"

export type ImagePost = {
	imageUrl: string
	messageLink: string
}

export type FindRepostResult = {
	post: ImagePost
	similarity: number
}

export class RepostCop {
	posts: readonly ImagePost[] = []

	constructor(private readonly maxPosts: number) {}

	addPost(...posts: ImagePost[]) {
		this.posts = uniqBy([...this.posts, ...posts], (p) => p.imageUrl).slice(
			-this.maxPosts,
		)
	}

	async findRepost(post: ImagePost): Promise<FindRepostResult | undefined> {
		const image = await readImage(post.imageUrl)

		const repost = await from(this.posts)
			.pipe(
				mergeMap(async (post) => {
					const image = await readImage(post.imageUrl)
					return { image, post }
				}),
				map(
					(entry): FindRepostResult => {
						const similarity = 1 - Jimp.distance(image, entry.image)
						return { post: entry.post, similarity }
					},
				),
				find((result) => result.similarity > 0.9),
			)
			.toPromise()

		return repost
	}
}
