# Lumastar API: builds the Spring Boot jar from source and runs it together with the course content.
# Build context: the repository root (see docker/compose.yml).
FROM eclipse-temurin:25-jdk AS build
WORKDIR /src/backend
COPY backend/ ./
RUN sh gradlew --no-daemon bootJar -x test \
    && find build/libs -name '*.jar' ! -name '*-plain.jar' -exec cp {} /tmp/app.jar \;

FROM eclipse-temurin:25-jre
RUN useradd --system --uid 10001 --home-dir /app lumastar
WORKDIR /app
COPY --from=build --chown=lumastar /tmp/app.jar app.jar
COPY --chown=lumastar content/ content/
USER lumastar
ENV LUMASTAR_CONTENT_PATH=/app/content \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
