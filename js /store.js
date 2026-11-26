export function criarStore(estadoInicial) {
    let estado = Object.freeze({ ...estadoInicial });
    const ouvintes = new Set();

    return {
        obter() {
            return estado;
        },

        definir(patch) {
            const proximo = { ...estado, ...patch };
            const alterou = Object.keys(patch).some(
                (chave) => !Object.is(estado[chave], proximo[chave])
            );

            if (!alterou) {
                return;
            }

            estado = Object.freeze(proximo);
            ouvintes.forEach((ouvinte) => ouvinte(estado, patch));
        },

        assinar(ouvinte) {
            ouvintes.add(ouvinte);

            return () => ouvintes.delete(ouvinte);
        }
    };
}
