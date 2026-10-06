package br.unip.aps.model;

import java.time.LocalDateTime;

/**
 * Um foco de incêndio detectado por satélite (uma linha do CSV do INPE).
 *
 * Colunas do CSV: id_bdq, foco_id, lat, lon, data_pas, pais, estado, municipio, bioma
 */
public record FocoIncendio(
        long idBdq,
        String focoId,
        double latitude,
        double longitude,
        LocalDateTime dataHora,
        String municipio,
        String bioma
) {
}
