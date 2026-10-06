package br.unip.aps.sort;

import br.unip.aps.model.FocoIncendio;

import java.util.Comparator;

/**
 * Critérios de ordenação exigidos pela APS.
 */
public enum Criterio {

    DATA(Comparator.comparing(FocoIncendio::dataHora)),

    // TODO: ordenar por bioma e, em empate, por data (dica: thenComparing)
    BIOMA(null),

    // TODO: ordenar por município e, em empate, por data
    MUNICIPIO(null);

    private final Comparator<FocoIncendio> comparador;

    Criterio(Comparator<FocoIncendio> comparador) {
        this.comparador = comparador;
    }

    public Comparator<FocoIncendio> comparador() {
        return comparador;
    }
}
