package app.lumastar.config;

import io.swagger.v3.core.jackson.ModelResolver;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.ArraySchema;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.IntegerSchema;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.ObjectSchema;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import io.swagger.v3.oas.models.tags.Tag;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * API contract for the generated TypeScript client. Operations require the session by default; public ones declare
 * an empty {@code @SecurityRequirements}. Every unsafe operation additionally requires the CSRF header, except the ones
 * a token in the body authenticates.
 */
@Configuration(proxyBeanMethods = false)
public class OpenApiConfig {

    static final String SESSION_COOKIE = "sessionCookie";
    static final String CSRF_HEADER = "csrfHeader";
    private static final String PROBLEM_SCHEMA = "ProblemDetail";
    private static final Set<PathItem.HttpMethod> UNSAFE_METHODS = Set.of(
            PathItem.HttpMethod.POST, PathItem.HttpMethod.PUT, PathItem.HttpMethod.PATCH, PathItem.HttpMethod.DELETE);

    static {
        // Enums such as Level become named schemas, i.e. reusable types in the generated client.
        ModelResolver.enumsAsRef = true;
    }

    @Bean
    OpenAPI lumastarOpenApi(@Value("${server.servlet.session.cookie.name}") String sessionCookieName) {
        return new OpenAPI()
                .info(new Info()
                        .title("Lumastar API")
                        .version("v1")
                        .description("Backend of Lumastar, the adaptive Gheg Albanian learning app. Errors are RFC 9457 "
                                + "problem details with a machine-readable `code`."))
                .servers(List.of(new Server().url("/").description("Same origin as the web app")))
                .components(new Components()
                        .addSecuritySchemes(SESSION_COOKIE, new SecurityScheme()
                                .type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.COOKIE)
                                .name(sessionCookieName)
                                .description("httpOnly session cookie set by registration and login"))
                        .addSecuritySchemes(CSRF_HEADER, new SecurityScheme()
                                .type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.HEADER)
                                .name("X-XSRF-TOKEN")
                                .description("Value of the XSRF-TOKEN cookie; required on POST, PUT, PATCH and DELETE")))
                .addSecurityItem(new SecurityRequirement().addList(SESSION_COOKIE));
    }

    @Bean
    OpenApiCustomizer lumastarContractCustomizer() {
        return openApi -> {
            openApi.getComponents().addSchemas(PROBLEM_SCHEMA, problemSchema());
            openApi.getPaths().forEach((path, pathItem) -> pathItem.readOperationsMap().forEach((method, operation) -> {
                if (UNSAFE_METHODS.contains(method) && !isTokenAuthenticated(path, method)) {
                    requireCsrfHeader(operation);
                }
            }));
            if (openApi.getTags() != null) {
                openApi.getTags().sort(Comparator.comparing(Tag::getName));
            }
        };
    }

    private static boolean isTokenAuthenticated(String path, PathItem.HttpMethod method) {
        return method == PathItem.HttpMethod.POST && List.of(SecurityConfig.TOKEN_AUTHENTICATED_POSTS).contains(path);
    }

    private static void requireCsrfHeader(Operation operation) {
        boolean isPublic = operation.getSecurity() != null && operation.getSecurity().isEmpty();
        SecurityRequirement requirement = new SecurityRequirement().addList(CSRF_HEADER);
        if (!isPublic) {
            requirement.addList(SESSION_COOKIE);
        }
        operation.setSecurity(new ArrayList<>(List.of(requirement)));
        operation.getResponses().addApiResponse("403", new ApiResponse()
                .description("Missing or invalid CSRF token")
                .content(new Content().addMediaType("application/problem+json",
                        new MediaType().schema(new Schema<>().$ref("#/components/schemas/" + PROBLEM_SCHEMA)))));
    }

    private static Schema<?> unknownReferencesSchema() {
        ObjectSchema references = new ObjectSchema();
        references.setDescription("Content ids an import refers to but this instance lacks (code unknown_content_references)");
        List.of("exercises", "items", "units", "skillTags")
                .forEach(kind -> references.addProperty(kind, new ArraySchema().items(new StringSchema())));
        references.setRequired(List.of("exercises", "items", "units", "skillTags"));
        return references;
    }

    /** RFC 9457 problem as rendered by the API: extension members are top-level fields, not a nested map. */
    private static Schema<?> problemSchema() {
        ObjectSchema fieldError = new ObjectSchema();
        fieldError.addProperty("field", new StringSchema());
        fieldError.addProperty("message", new StringSchema());
        fieldError.setRequired(List.of("field", "message"));

        ObjectSchema problem = new ObjectSchema();
        problem.setDescription("RFC 9457 problem details");
        problem.addProperty("type", new StringSchema().format("uri"));
        problem.addProperty("title", new StringSchema());
        problem.addProperty("status", new IntegerSchema());
        problem.addProperty("detail", new StringSchema());
        problem.addProperty("instance", new StringSchema().format("uri"));
        problem.addProperty("code", new StringSchema().description("Stable, machine-readable error code, e.g. invalid_credentials"));
        problem.addProperty("errors", new ArraySchema().items(fieldError).description("Invalid fields (code validation_failed)"));
        problem.addProperty("retryAfterSeconds",
                new IntegerSchema().description("Seconds until the next attempt (codes login_throttled, too_many_requests)"));
        problem.addProperty("unknownReferences", unknownReferencesSchema());
        problem.setRequired(List.of("code", "status", "title"));
        return problem;
    }
}
