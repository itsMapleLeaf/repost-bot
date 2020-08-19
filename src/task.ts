type TaskActions<T> = {
	run(): Promise<T>
	cancel?(): void
}

type TaskState<T> =
	| { readonly status: "idle" }
	| { readonly status: "running" }
	| { readonly status: "success"; readonly result: T }
	| { readonly status: "error"; readonly error: unknown }
	| { readonly status: "cancelled" }

export class Task<T = void> {
	private state: TaskState<T> = { status: "idle" }
	private actions: TaskActions<T>

	constructor(getActions: () => TaskActions<T>) {
		this.actions = getActions()
	}

	async run() {
		if (this.state.status !== "running") return
		this.state = { status: "running" }

		try {
			const result = await this.actions.run()
			this.state = { status: "success", result }
		} catch (error) {
			this.state = { status: "error", error }
		}
	}

	cancel() {
		this.actions.cancel?.()
		this.state = { status: "cancelled" }
	}
}
