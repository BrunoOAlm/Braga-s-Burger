# syntax=docker/dockerfile:1.7

# ---- Build stage ----
FROM gradle:8.10-jdk21-alpine AS build
WORKDIR /app
COPY --chown=gradle:gradle build.gradle.kts settings.gradle.kts ./
COPY --chown=gradle:gradle gradle ./gradle
COPY --chown=gradle:gradle src ./src
RUN gradle --no-daemon bootJar -x test

# ---- Runtime stage ----
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8080
# -Xmx400m: folga no Render free (512MB total). SerialGC: menor footprint.
ENTRYPOINT ["sh", "-c", "java -Xmx400m -XX:+UseSerialGC -jar app.jar"]
