import type { RestTimer, RestTimerState } from '../ports/RestTimer';

export interface UpdateRestTimerSecondsInput {
	readonly newSeconds: number;
}

export interface UpdateRestTimerSecondsOutput {
	readonly state: RestTimerState;
}

interface Dependencies {
	readonly restTimer: RestTimer;
}

/**
 * Caso de uso para atualizar os segundos restantes do cronômetro de descanso.
 *
 * Validações:
 * - newSeconds deve estar entre 1 e 3600 (1 segundo a 60 minutos)
 *
 * Comportamento:
 * - Delega a atualização ao adapter RestTimer via setState()
 * - Retorna o novo estado do cronômetro
 */
export class UpdateRestTimerSecondsUseCase {
	private readonly MIN_SECONDS = 1;
	private readonly MAX_SECONDS = 3600;

	constructor(private readonly deps: Dependencies) {}

	async execute(input: UpdateRestTimerSecondsInput): Promise<UpdateRestTimerSecondsOutput> {
		this.validateSeconds(input.newSeconds);
		await this.deps.restTimer.setState(input.newSeconds);
		const state = await this.deps.restTimer.getState();
		return { state };
	}

	private validateSeconds(seconds: number): void {
		if (!Number.isInteger(seconds) || seconds < this.MIN_SECONDS || seconds > this.MAX_SECONDS) {
			throw new Error(
				`Tempo de descanso deve estar entre ${this.MIN_SECONDS} e ${this.MAX_SECONDS} segundos`
			);
		}
	}
}
