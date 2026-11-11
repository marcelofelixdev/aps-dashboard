package br.unip.aps.service;

import br.unip.aps.io.LeitorCsv;
import br.unip.aps.model.FocoIncendio;
import br.unip.aps.service.PrevisaoService.Area;
import br.unip.aps.service.PrevisaoService.Cobertura;
import br.unip.aps.service.PrevisaoService.Mes;
import br.unip.aps.service.PrevisaoService.Previsoes;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PrevisaoServiceTest {

    private static FocoIncendio foco(String data, String municipio, double lat, double lon) {
        return new FocoIncendio(0, "f", lat, lon, LocalDateTime.parse(data), municipio, "Cerrado");
    }

    /** AVARÉ tem foco nos dois anos e em mais dias; BAURU só em 2024; AMERICANA só em 2023. */
    private final List<FocoIncendio> focos = List.of(
            foco("2023-08-01T17:00", "AVARÉ", -23.10, -48.92),
            foco("2023-09-01T17:00", "AVARÉ", -23.10, -48.92),
            foco("2023-09-02T17:00", "AMERICANA", -22.74, -47.33),
            foco("2023-01-05T17:00", "AMERICANA", -22.74, -47.33),
            foco("2024-08-10T17:00", "AVARÉ", -23.10, -48.92),
            foco("2024-08-10T17:05", "BAURU", -22.31, -49.06),
            foco("2024-08-11T17:00", "BAURU", -22.31, -49.06),
            foco("2024-09-12T17:00", "BAURU", -22.31, -49.06)
    );

    @Test
    void perfilSazonalSomaCemPorCentoEConservaOsFocosDeCadaAno() {
        Previsoes p = new PrevisaoService(focos).calcular(10);

        assertEquals(List.of(2023, 2024), p.anos());
        assertEquals(12, p.sazonalidade().size());
        double soma = p.sazonalidade().stream().mapToDouble(Mes::participacao).sum();
        assertEquals(100.0, soma, 0.5);
        long focos2023 = p.sazonalidade().stream().mapToLong(m -> m.focosPorAno().get(0)).sum();
        long focos2024 = p.sazonalidade().stream().mapToLong(m -> m.focosPorAno().get(1)).sum();
        assertEquals(4, focos2023);
        assertEquals(4, focos2024);
        // agosto: 2023 = 1/4, 2024 = 3/4 → média 50%
        assertEquals(50.0, p.sazonalidade().get(7).participacao(), 0.01);
        for (Mes m : p.sazonalidade()) {
            assertTrue(m.cenarioBaixo() <= m.cenarioCentral() && m.cenarioCentral() <= m.cenarioAlto());
        }
    }

    @Test
    void janelaCriticaEhOMenorIntervaloQueCobreOLimite() {
        Previsoes p = new PrevisaoService(focos).calcular(10);
        // jan 12,5% | ago 37,5% | set 50% → ago–set somam 87,5% (≥ 75%)
        assertEquals("ago", p.janelaCritica().inicio());
        assertEquals("set", p.janelaCritica().fim());
        assertEquals(87.5, p.janelaCritica().participacao(), 0.01);
    }

    @Test
    void rankingPriorizaRecorrenciaEFocos() {
        Previsoes p = new PrevisaoService(focos).calcular(10);
        List<Area> ranking = p.todosMunicipios();

        assertEquals(3, ranking.size());
        assertEquals("AVARÉ", ranking.get(0).nome());      // 3 focos, 3 dias, os dois anos
        assertTrue(ranking.get(0).recorrente());
        assertFalse(ranking.get(1).recorrente());
        assertEquals("alta", ranking.get(0).prioridade());
        for (int i = 1; i < ranking.size(); i++) {
            assertTrue(ranking.get(i - 1).indice() >= ranking.get(i).indice());
            assertEquals(i + 1, ranking.get(i).posicao());
        }
        assertTrue(p.ordenacao().comparacoes() > 0);
    }

    @Test
    void validacaoRetroativaUsaSoOPrimeiroAnoParaPriorizar() {
        Previsoes p = new PrevisaoService(focos).calcular(10);

        assertEquals(2023, p.validacao().anoBase());
        assertEquals(2024, p.validacao().anoTeste());
        // de 4 focos de 2024, só o de AVARÉ caiu em município que já tinha foco em 2023
        assertEquals(1, p.validacao().focosTesteEmMunicipiosDaBase());
        for (Cobertura c : p.validacao().coberturas()) {
            assertTrue(c.percentual() <= c.ideal() + 1e-9);
        }
    }

    @Test
    void dadosReaisDeSaoPaulo() throws IOException {
        LeitorCsv leitor = new LeitorCsv();
        List<FocoIncendio> reais = new ArrayList<>(leitor.ler(Path.of("data", "focos_br_sp_ref_2023.csv")));
        reais.addAll(leitor.ler(Path.of("data", "focos_br_sp_ref_2024.csv")));

        Previsoes p = new PrevisaoService(reais).calcular(20);

        assertEquals(20, p.municipios().size());
        assertEquals(580, p.resumo().municipios());
        assertEquals(29, p.resumo().alta());                 // 5% de 580, arredondado para cima
        assertEquals(6980, p.validacao().focosTesteEmMunicipiosDaBase());
        assertEquals("mai", p.janelaCritica().inicio());
        assertEquals("set", p.janelaCritica().fim());
        // priorizar pelo ano anterior tem que ser melhor que sortear municípios
        for (Cobertura c : p.validacao().coberturas()) {
            assertTrue(c.percentual() > c.aleatorio());
        }
    }
}
