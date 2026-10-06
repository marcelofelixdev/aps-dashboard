package br.unip.aps;

import io.javalin.Javalin;
import io.javalin.http.staticfiles.Location;

import java.util.Map;

public class App {

    public static void main(String[] args) {
        // TODO: carregar os CSVs de data/ com o LeitorCsv e guardar a lista de focos

        Javalin app = Javalin.create(config ->
                config.staticFiles.add("/public", Location.CLASSPATH));

        app.get("/api/status", ctx -> ctx.json(Map.of("status", "ok")));

        // TODO: GET /api/ordenar?criterio=DATA&algoritmo=BUBBLE

        app.start(7070);
        System.out.println("Dashboard em http://localhost:7070");
    }
}
