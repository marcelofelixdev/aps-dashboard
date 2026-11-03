package br.unip.aps;

import br.unip.aps.io.LeitorCsv;
import br.unip.aps.model.FocoIncendio;
import br.unip.aps.service.EstatisticaService;
import br.unip.aps.service.OrdenacaoService;
import br.unip.aps.web.ApiRoutes;
import io.javalin.Javalin;
import io.javalin.http.staticfiles.Location;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

public class App {

    private static final int PORTA = 7070;

    private static final List<Path> ARQUIVOS = List.of(
            Path.of("data", "focos_br_sp_ref_2023.csv"),
            Path.of("data", "focos_br_sp_ref_2024.csv")
    );

    public static void main(String[] args) {
        List<FocoIncendio> focos = carregarFocos();

        OrdenacaoService ordenacao = new OrdenacaoService(focos);
        EstatisticaService estatisticas = new EstatisticaService(focos);

        Javalin app = Javalin.create(config ->
                config.staticFiles.add("/public", Location.CLASSPATH));

        ApiRoutes.registrar(app, ordenacao, estatisticas);

        app.start(PORTA);
        System.out.println("Dashboard em http://localhost:" + PORTA);
    }

    /** Lê todos os CSVs de data/. Se algum faltar, encerra com uma mensagem clara. */
    private static List<FocoIncendio> carregarFocos() {
        LeitorCsv leitor = new LeitorCsv();
        List<FocoIncendio> focos = new ArrayList<>();

        for (Path arquivo : ARQUIVOS) {
            try {
                List<FocoIncendio> lidos = leitor.ler(arquivo);
                focos.addAll(lidos);
                System.out.printf("%s: %d focos lidos", arquivo.getFileName(), lidos.size());
                if (leitor.getLinhasIgnoradas() > 0) {
                    System.out.printf(" (%d linhas ignoradas; primeira: %s)",
                            leitor.getLinhasIgnoradas(), leitor.getPrimeiroErro());
                }
                System.out.println();
            } catch (IOException e) {
                System.err.println("Erro ao ler os dados: " + e.getMessage());
                System.err.println("Rode o App a partir da pasta do projeto (a que tem data/ e pom.xml).");
                System.exit(1);
            }
        }

        System.out.printf("Total: %d focos carregados%n", focos.size());
        return focos;
    }
}
