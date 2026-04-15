import { redirect } from '@sveltejs/kit';

/**
 * A raiz (`/`) não é uma tela em si — é o ponto de entrada do PWA.
 * Redirecionamos permanentemente para `/fichas`, que é a home conceitual
 * do app e onde o item ativo na bottom nav passa a estar corretamente
 * destacado. Feito no `load` (client-side) para custar zero renders.
 */
export const load = () => {
	throw redirect(307, '/fichas');
};
